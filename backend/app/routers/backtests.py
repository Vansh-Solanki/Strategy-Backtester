import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.routers.users import get_current_user
from app.schemas.backtest import BacktestCreate, BacktestResponse, TradeResponse
from app.schemas.common import APIResponse
from app.services.backtest_service import create_backtest, get_backtest, list_backtests, list_trades
from app.workers.tasks.run_backtest import run_backtest

router = APIRouter(prefix="/backtests", tags=["backtests"])


@router.get("", response_model=APIResponse[list[BacktestResponse]])
async def list_all(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    backtests = await list_backtests(db, current_user.id)
    return APIResponse(success=True, data=[BacktestResponse.model_validate(b) for b in backtests])


@router.post("", response_model=APIResponse[BacktestResponse])
async def create(
    payload: BacktestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    backtest = await create_backtest(db, current_user.id, payload)
    run_backtest.delay(str(backtest.id))
    return APIResponse(success=True, data=BacktestResponse.model_validate(backtest))


@router.get("/{backtest_id}", response_model=APIResponse[BacktestResponse])
async def get_one(
    backtest_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    backtest = await get_backtest(db, current_user.id, backtest_id)
    return APIResponse(success=True, data=BacktestResponse.model_validate(backtest))


@router.get("/{backtest_id}/trades", response_model=APIResponse[list[TradeResponse]])
async def get_trades(
    backtest_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trades = await list_trades(db, current_user.id, backtest_id, page, page_size)
    return APIResponse(success=True, data=[TradeResponse.model_validate(t) for t in trades])
