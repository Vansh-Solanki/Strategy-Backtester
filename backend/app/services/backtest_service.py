import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.backtest import Backtest, BacktestStatus, Trade
from app.models.strategy import Strategy
from app.schemas.backtest import BacktestCreate


async def list_backtests(db: AsyncSession, user_id: uuid.UUID) -> list[Backtest]:
    result = await db.execute(
        select(Backtest).where(Backtest.user_id == user_id).order_by(Backtest.created_at.desc())
    )
    return list(result.scalars().all())


async def get_backtest(db: AsyncSession, user_id: uuid.UUID, backtest_id: uuid.UUID) -> Backtest:
    result = await db.execute(
        select(Backtest).where(Backtest.id == backtest_id, Backtest.user_id == user_id)
    )
    backtest = result.scalar_one_or_none()
    if backtest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backtest not found")
    return backtest


async def create_backtest(db: AsyncSession, user_id: uuid.UUID, payload: BacktestCreate) -> Backtest:
    result = await db.execute(
        select(Strategy).where(
            Strategy.id == payload.strategy_id,
            Strategy.user_id == user_id,
            Strategy.is_deleted.is_(False),
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")

    if payload.end_date <= payload.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="end_date must be after start_date"
        )

    backtest = Backtest(
        user_id=user_id,
        strategy_id=payload.strategy_id,
        ticker=payload.ticker.upper(),
        start_date=payload.start_date,
        end_date=payload.end_date,
        initial_capital=payload.initial_capital,
        status=BacktestStatus.pending,
    )
    db.add(backtest)
    await db.commit()
    await db.refresh(backtest)
    return backtest


async def list_trades(
    db: AsyncSession, user_id: uuid.UUID, backtest_id: uuid.UUID, page: int, page_size: int
) -> list[Trade]:
    await get_backtest(db, user_id, backtest_id)  # ownership check, raises 404 if not found

    result = await db.execute(
        select(Trade)
        .where(Trade.backtest_id == backtest_id)
        .order_by(Trade.entry_date)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result.scalars().all())
