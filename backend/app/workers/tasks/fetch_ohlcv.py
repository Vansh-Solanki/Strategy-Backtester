import json
import logging
from datetime import date, datetime

import pandas as pd
import yfinance as yf
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.config import settings
from app.models.price_history import PriceHistory
from app.models.ticker import Ticker
from app.workers.celery_app import celery_app
from app.workers.task_utils import run_async, task_db_session

logger = logging.getLogger(__name__)


NEGATIVE_CACHE_TTL = 60


async def _cache_result(symbol: str, start_date: str, end_date: str, rows: list[dict], ttl: int) -> None:
    redis_client = Redis.from_url(settings.redis_url)
    try:
        cache_key = f"ohlcv:{symbol.upper()}:{start_date}:{end_date}"
        await redis_client.set(cache_key, json.dumps(rows, default=str), ex=ttl)
    finally:
        await redis_client.aclose()


async def _fetch_ohlcv_async(symbol: str, start_date: str, end_date: str) -> int:
    df = yf.download(symbol, start=start_date, end=end_date, auto_adjust=False, progress=False)
    if df.empty:
        logger.warning("yfinance returned no data for %s (%s to %s)", symbol, start_date, end_date)
        # Cache the empty result briefly so a stream of poll/retry requests doesn't
        # re-trigger a yfinance download on every call while the symbol stays empty.
        await _cache_result(symbol, start_date, end_date, [], NEGATIVE_CACHE_TTL)
        return 0

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    async with task_db_session() as db:
        result = await db.execute(select(Ticker).where(Ticker.symbol == symbol.upper()))
        ticker = result.scalar_one_or_none()
        if ticker is None:
            logger.warning("Ticker %s not found in tickers table; skipping insert", symbol)
            await _cache_result(symbol, start_date, end_date, [], NEGATIVE_CACHE_TTL)
            return 0

        rows = [
            {
                "ticker_id": ticker.id,
                "date": idx.date() if hasattr(idx, "date") else idx,
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "adj_close": float(row["Adj Close"]) if "Adj Close" in row else float(row["Close"]),
                "volume": int(row["Volume"]),
            }
            for idx, row in df.iterrows()
        ]

        for i in range(0, len(rows), 500):
            batch = rows[i : i + 500]
            stmt = insert(PriceHistory).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=["ticker_id", "date"],
                set_={
                    "open": stmt.excluded.open,
                    "high": stmt.excluded.high,
                    "low": stmt.excluded.low,
                    "close": stmt.excluded.close,
                    "adj_close": stmt.excluded.adj_close,
                    "volume": stmt.excluded.volume,
                },
            )
            await db.execute(stmt)
        await db.commit()

    ttl = 86400 if datetime.strptime(end_date, "%Y-%m-%d").date() < date.today() else 900
    await _cache_result(symbol, start_date, end_date, rows, ttl)

    return len(rows)


@celery_app.task(name="fetch_ohlcv")
def fetch_ohlcv(symbol: str, start_date: str, end_date: str) -> int:
    count = run_async(_fetch_ohlcv_async(symbol, start_date, end_date))
    logger.info("Fetched %d OHLCV rows for %s", count, symbol)
    return count
