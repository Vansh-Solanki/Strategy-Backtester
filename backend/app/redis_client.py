from collections.abc import AsyncGenerator

from redis.asyncio import Redis

from app.config import settings


async def get_redis() -> AsyncGenerator[Redis, None]:
    redis_client = Redis.from_url(settings.redis_url)
    try:
        yield redis_client
    finally:
        await redis_client.aclose()
