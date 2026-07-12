from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.redis_client import get_redis
from app.schemas.common import APIResponse
from app.schemas.market_data import FetchJobResponse, JobStatusResponse
from app.services.market_data_service import get_or_fetch_price_data
from app.workers.celery_app import celery_app
from app.workers.tasks.fetch_ohlcv import fetch_ohlcv

router = APIRouter(prefix="/market-data", tags=["market-data"])


@router.get("/{symbol}")
async def get_market_data(
    symbol: str,
    start: date = Query(default_factory=lambda: date.today() - timedelta(days=730)),
    end: date = Query(default_factory=date.today),
    db: AsyncSession = Depends(get_db),
    redis_client: Redis = Depends(get_redis),
):
    data = await get_or_fetch_price_data(symbol, start, end, db, redis_client)
    return APIResponse(success=True, data=data)


@router.post("/{symbol}/fetch", response_model=APIResponse[FetchJobResponse])
async def trigger_fetch(
    symbol: str,
    start: date = Query(default_factory=lambda: date.today() - timedelta(days=730)),
    end: date = Query(default_factory=date.today),
):
    task = fetch_ohlcv.delay(symbol.upper(), str(start), str(end))
    return APIResponse(success=True, data=FetchJobResponse(job_id=task.id, status="fetching"))


@router.get("/{symbol}/status/{job_id}", response_model=APIResponse[JobStatusResponse])
async def get_job_status(symbol: str, job_id: str):
    result = celery_app.AsyncResult(job_id)
    return APIResponse(success=True, data=JobStatusResponse(job_id=job_id, status=result.status.lower()))
