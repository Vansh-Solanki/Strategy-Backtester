import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class BacktestCreate(BaseModel):
    strategy_id: uuid.UUID
    ticker: str = Field(min_length=1, max_length=20)
    start_date: date
    end_date: date
    initial_capital: float = Field(default=10000, gt=0)


class TradeResponse(BaseModel):
    id: uuid.UUID
    backtest_id: uuid.UUID
    symbol: str
    entry_date: datetime
    exit_date: datetime | None
    entry_price: float
    exit_price: float | None
    quantity: int
    direction: str
    pnl: float | None
    pnl_pct: float | None

    model_config = {"from_attributes": True}


class BacktestResponse(BaseModel):
    id: uuid.UUID
    strategy_id: uuid.UUID
    user_id: uuid.UUID
    ticker: str
    start_date: date
    end_date: date
    initial_capital: float
    status: str
    results: dict | None
    error_message: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}
