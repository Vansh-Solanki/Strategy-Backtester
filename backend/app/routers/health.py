from fastapi import APIRouter
from redis.asyncio import Redis
from sqlalchemy import text

from app.config import settings
from app.database import engine

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    db_status = "ok"
    redis_status = "ok"

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    try:
        redis_client = Redis.from_url(settings.redis_url)
        await redis_client.ping()
        await redis_client.aclose()
    except Exception:
        redis_status = "error"

    overall = "ok" if db_status == "ok" and redis_status == "ok" else "error"
    return {"status": overall, "db": db_status, "redis": redis_status}
