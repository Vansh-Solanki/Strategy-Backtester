import asyncio
from collections.abc import AsyncGenerator, Coroutine
from contextlib import asynccontextmanager
from typing import TypeVar

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

T = TypeVar("T")


def run_async(coro: Coroutine[object, object, T]) -> T:
    """Run an async Celery task body in its own event loop."""
    return asyncio.run(coro)


@asynccontextmanager
async def task_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield a DB session backed by an engine created fresh for this task call.

    Celery's prefork pool forks worker child processes from a master that has
    already imported app.database (and so already created its module-level
    async engine). Forked children inherit that engine object via copy-on-write
    memory, but the asyncpg connections/sockets it opens are not fork-safe —
    two children (or two asyncio.run() event loops) touching the same inherited
    pool corrupts the connection ("another operation is in progress" / "attached
    to a different loop"). Creating and disposing a dedicated engine per task
    call avoids sharing any connection across processes or event loops.
    """
    engine = create_async_engine(settings.database_url, future=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        async with session_factory() as session:
            yield session
    finally:
        await engine.dispose()
