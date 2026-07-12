import json

from redis.asyncio import Redis
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticker import Ticker
from app.schemas.ticker import TickerSearchResult

SEARCH_CACHE_TTL = 3600


async def search_tickers(query: str, db: AsyncSession, redis_client: Redis) -> list[TickerSearchResult]:
    cache_key = f"tickers:search:{query.upper()}"

    cached = await redis_client.get(cache_key)
    if cached:
        return [TickerSearchResult(**item) for item in json.loads(cached)]

    pattern = f"{query.upper()}%"
    result = await db.execute(
        select(Ticker)
        .where(
            Ticker.is_active.is_(True),
            or_(Ticker.symbol.ilike(pattern), Ticker.name.ilike(f"%{query}%")),
        )
        .order_by(Ticker.symbol)
        .limit(10)
    )
    tickers = result.scalars().all()
    results = [TickerSearchResult.model_validate(t) for t in tickers]

    await redis_client.set(
        cache_key, json.dumps([r.model_dump() for r in results]), ex=SEARCH_CACHE_TTL
    )
    return results
