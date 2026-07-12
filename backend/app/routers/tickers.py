from fastapi import APIRouter, Depends, HTTPException, Query, status
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.ticker import Ticker
from app.redis_client import get_redis
from app.schemas.common import APIResponse
from app.schemas.ticker import TickerResponse, TickerSearchResult
from app.services.ticker_service import search_tickers

router = APIRouter(prefix="/tickers", tags=["tickers"])


@router.get("/search", response_model=APIResponse[list[TickerSearchResult]])
async def search(
    q: str = Query(min_length=1),
    db: AsyncSession = Depends(get_db),
    redis_client: Redis = Depends(get_redis),
):
    results = await search_tickers(q, db, redis_client)
    return APIResponse(success=True, data=results)


@router.get("/{symbol}", response_model=APIResponse[TickerResponse])
async def get_ticker(symbol: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ticker).where(Ticker.symbol == symbol.upper()))
    ticker = result.scalar_one_or_none()
    if ticker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticker not found")
    return APIResponse(success=True, data=TickerResponse.model_validate(ticker))
