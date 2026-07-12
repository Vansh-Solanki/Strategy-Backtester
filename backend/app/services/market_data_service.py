import json
from datetime import date, timedelta

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.price_history import PriceHistory
from app.models.ticker import Ticker
from app.schemas.market_data import PriceBar
from app.workers.tasks.fetch_ohlcv import fetch_ohlcv


def covers_end(latest_date: date, requested_end: date) -> bool:
    # For a range ending today, require the latest row to be genuinely recent
    # (allowing a 1-day lag for weekends/holidays). For a historical range
    # (end in the past), only require the latest row to reach close to the
    # requested end — comparing it to "today" would always fail and force a
    # needless re-fetch of a range we already have complete data for.
    reference = min(requested_end, date.today())
    return (reference - latest_date).days <= 1


def covers_start(earliest_date: date, requested_start: date) -> bool:
    # Allow a short gap for weekends/holidays right at the requested start,
    # without treating a much later earliest row as "complete" coverage.
    return (earliest_date - requested_start).days <= 7


async def get_or_fetch_price_data(
    symbol: str, start: date, end: date, db: AsyncSession, redis_client: Redis
) -> list[PriceBar] | dict:
    symbol = symbol.upper()
    cache_key = f"ohlcv:{symbol}:{start}:{end}"

    cached = await redis_client.get(cache_key)
    if cached:
        return [PriceBar(**bar) for bar in json.loads(cached)]

    result = await db.execute(select(Ticker).where(Ticker.symbol == symbol))
    ticker = result.scalar_one_or_none()

    rows: list[PriceHistory] = []
    if ticker is not None:
        result = await db.execute(
            select(PriceHistory)
            .where(PriceHistory.ticker_id == ticker.id, PriceHistory.date.between(start, end))
            .order_by(PriceHistory.date)
        )
        rows = result.scalars().all()

    if rows and covers_end(rows[-1].date, end) and covers_start(rows[0].date, start):
        bars = [PriceBar.model_validate(r) for r in rows]
        ttl = 86400 if end < date.today() else 900
        await redis_client.set(
            cache_key, json.dumps([b.model_dump(mode="json") for b in bars]), ex=ttl
        )
        return bars

    task = fetch_ohlcv.delay(symbol, str(start), str(end))
    return {"job_id": task.id, "status": "fetching"}
