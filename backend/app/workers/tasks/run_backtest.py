import json
import logging
import math
import subprocess
import sys
import uuid
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy import select

from app.models.backtest import Backtest, BacktestStatus, Trade
from app.models.price_history import PriceHistory
from app.models.strategy import Strategy
from app.models.ticker import Ticker
from app.workers.celery_app import celery_app
from app.workers.task_utils import run_async, task_db_session

logger = logging.getLogger(__name__)

HARNESS_PATH = Path(__file__).resolve().parent.parent / "sandbox" / "harness.py"
EXECUTION_TIMEOUT_SECONDS = 30


def _parse_date(value: str) -> datetime:
    return datetime.strptime(value[:10], "%Y-%m-%d")


def _compute_metrics(equity_curve: list[dict], trades: list[dict], initial_capital: float) -> dict:
    if not equity_curve:
        return {
            "total_return": 0.0,
            "cagr": 0.0,
            "sharpe_ratio": 0.0,
            "max_drawdown": 0.0,
            "win_rate": 0.0,
            "avg_trade_duration_days": 0.0,
            "num_trades": 0,
            "final_equity": initial_capital,
        }

    values = pd.Series([point["value"] for point in equity_curve], dtype=float)
    final_equity = float(values.iloc[-1])
    total_return = (final_equity - initial_capital) / initial_capital if initial_capital else 0.0

    days = max((_parse_date(equity_curve[-1]["date"]) - _parse_date(equity_curve[0]["date"])).days, 1)
    years = days / 365.25
    if initial_capital > 0 and years > 0 and final_equity > 0:
        cagr = (final_equity / initial_capital) ** (1 / years) - 1
    else:
        cagr = 0.0

    daily_returns = values.pct_change().dropna()
    if len(daily_returns) > 1 and daily_returns.std() != 0:
        sharpe_ratio = float((daily_returns.mean() / daily_returns.std()) * np.sqrt(252))
    else:
        sharpe_ratio = 0.0

    running_max = values.cummax()
    drawdowns = (values - running_max) / running_max.replace(0, np.nan)
    max_drawdown = float(drawdowns.min()) if not drawdowns.empty else 0.0
    if math.isnan(max_drawdown):
        max_drawdown = 0.0

    closed_trades = [t for t in trades if t["exit_date"] is not None]
    wins = [t for t in closed_trades if (t["pnl"] or 0) > 0]
    win_rate = (len(wins) / len(closed_trades)) if closed_trades else 0.0

    durations = [
        (_parse_date(t["exit_date"]) - _parse_date(t["entry_date"])).days for t in closed_trades
    ]
    avg_trade_duration_days = float(sum(durations) / len(durations)) if durations else 0.0

    return {
        "total_return": total_return,
        "cagr": cagr,
        "sharpe_ratio": sharpe_ratio,
        "max_drawdown": max_drawdown,
        "win_rate": win_rate,
        "avg_trade_duration_days": avg_trade_duration_days,
        "num_trades": len(closed_trades),
        "final_equity": final_equity,
    }


async def _mark_failed(backtest_id: uuid.UUID, message: str) -> None:
    async with task_db_session() as db:
        result = await db.execute(select(Backtest).where(Backtest.id == backtest_id))
        backtest = result.scalar_one_or_none()
        if backtest is None:
            return
        backtest.status = BacktestStatus.failed
        backtest.error_message = message[:2000]
        backtest.completed_at = datetime.utcnow()
        await db.commit()


async def _run_backtest_async(backtest_id: str) -> None:
    bt_id = uuid.UUID(backtest_id)

    async with task_db_session() as db:
        result = await db.execute(select(Backtest).where(Backtest.id == bt_id))
        backtest = result.scalar_one_or_none()
        if backtest is None:
            logger.warning("Backtest %s not found", backtest_id)
            return
        backtest.status = BacktestStatus.running
        await db.commit()

        strategy_result = await db.execute(select(Strategy).where(Strategy.id == backtest.strategy_id))
        strategy = strategy_result.scalar_one_or_none()
        if strategy is None:
            await db.rollback()
            await _mark_failed(bt_id, "Strategy not found")
            return

        ticker_result = await db.execute(select(Ticker).where(Ticker.symbol == backtest.ticker))
        ticker = ticker_result.scalar_one_or_none()
        if ticker is None:
            await db.rollback()
            await _mark_failed(bt_id, f"Ticker {backtest.ticker} not found")
            return

        bars_result = await db.execute(
            select(PriceHistory)
            .where(
                PriceHistory.ticker_id == ticker.id,
                PriceHistory.date.between(backtest.start_date, backtest.end_date),
            )
            .order_by(PriceHistory.date)
        )
        bars = bars_result.scalars().all()
        if not bars:
            await db.rollback()
            await _mark_failed(bt_id, "No price history available for the requested range")
            return

        payload = {
            "code": strategy.config["code"],
            "params": strategy.config.get("params", {}),
            "position_size": strategy.config.get("position_size", 0.1),
            "stop_loss": strategy.config.get("stop_loss", 0.05),
            "initial_capital": float(backtest.initial_capital),
            "bars": [
                {
                    "date": bar.date.isoformat(),
                    "open": float(bar.open),
                    "high": float(bar.high),
                    "low": float(bar.low),
                    "close": float(bar.close),
                    "adj_close": float(bar.adj_close),
                    "volume": int(bar.volume),
                }
                for bar in bars
            ],
        }
        initial_capital = float(backtest.initial_capital)
        ticker_symbol = backtest.ticker

    try:
        proc = subprocess.run(
            [sys.executable, str(HARNESS_PATH)],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            timeout=EXECUTION_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        await _mark_failed(bt_id, "Strategy execution timed out after 30 seconds")
        return

    if proc.returncode != 0 or not proc.stdout.strip():
        await _mark_failed(bt_id, f"Strategy process crashed: {proc.stderr[-1500:] or 'no output'}")
        return

    try:
        harness_result = json.loads(proc.stdout.strip().splitlines()[-1])
    except json.JSONDecodeError:
        await _mark_failed(bt_id, "Strategy process returned malformed output")
        return

    if harness_result.get("error"):
        await _mark_failed(bt_id, harness_result["error"])
        return

    trades = harness_result["trades"]
    equity_curve = harness_result["equity_curve"]
    metrics = _compute_metrics(equity_curve, trades, initial_capital)

    async with task_db_session() as db:
        result = await db.execute(select(Backtest).where(Backtest.id == bt_id))
        backtest = result.scalar_one_or_none()
        if backtest is None:
            return

        for trade in trades:
            db.add(
                Trade(
                    backtest_id=backtest.id,
                    symbol=ticker_symbol,
                    entry_date=_parse_date(trade["entry_date"]),
                    exit_date=_parse_date(trade["exit_date"]) if trade["exit_date"] else None,
                    entry_price=trade["entry_price"],
                    exit_price=trade["exit_price"],
                    quantity=trade["quantity"],
                    direction=trade["direction"],
                    pnl=trade["pnl"],
                    pnl_pct=trade["pnl_pct"],
                )
            )

        backtest.results = {
            "metrics": metrics,
            "equity_curve": equity_curve,
            "console_output": harness_result.get("console_output", ""),
        }
        backtest.status = BacktestStatus.done
        backtest.error_message = None
        backtest.completed_at = datetime.utcnow()
        await db.commit()


@celery_app.task(name="run_backtest")
def run_backtest(backtest_id: str) -> None:
    run_async(_run_backtest_async(backtest_id))
    logger.info("Backtest %s finished", backtest_id)
