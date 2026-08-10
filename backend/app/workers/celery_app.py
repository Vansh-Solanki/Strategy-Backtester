from celery import Celery
from celery.signals import worker_ready

from app.config import settings

celery_app = Celery(
    "backtester",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.workers.tasks.seed_tickers",
        "app.workers.tasks.fetch_ohlcv",
        "app.workers.tasks.run_backtest",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@worker_ready.connect
def seed_tickers_on_startup(**kwargs):
    from app.workers.tasks.seed_tickers import seed_tickers_from_edgar

    seed_tickers_from_edgar.delay()
