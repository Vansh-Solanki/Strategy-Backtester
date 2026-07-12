import logging

import requests
from sqlalchemy.dialects.postgresql import insert

from app.models.ticker import Ticker
from app.workers.celery_app import celery_app
from app.workers.task_utils import run_async, task_db_session

logger = logging.getLogger(__name__)

EDGAR_URL = "https://www.sec.gov/files/company_tickers.json"
EDGAR_HEADERS = {"User-Agent": "Strategy Backtester research@strategybacktester.dev"}


async def _seed_tickers_async() -> int:
    response = requests.get(EDGAR_URL, headers=EDGAR_HEADERS, timeout=30)
    response.raise_for_status()
    entries = response.json().values()

    rows = [
        {
            "symbol": entry["ticker"].upper(),
            "name": entry["title"],
            "cik": str(entry["cik_str"]),
        }
        for entry in entries
    ]

    async with task_db_session() as db:
        for i in range(0, len(rows), 500):
            batch = rows[i : i + 500]
            stmt = insert(Ticker).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=["symbol"],
                set_={"name": stmt.excluded.name, "cik": stmt.excluded.cik},
            )
            await db.execute(stmt)
        await db.commit()

    return len(rows)


@celery_app.task(name="seed_tickers_from_edgar")
def seed_tickers_from_edgar() -> int:
    count = run_async(_seed_tickers_async())
    logger.info("Seeded %d tickers from EDGAR", count)
    return count
