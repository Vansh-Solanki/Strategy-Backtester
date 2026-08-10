import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.routers.users import get_current_user
from app.schemas.common import APIResponse
from app.schemas.strategy import (
    StrategyCreate,
    StrategyResponse,
    StrategyUpdate,
    TemplateResponse,
    ValidateRequest,
    ValidateResponse,
)
from app.services.strategy_service import (
    create_strategy,
    delete_strategy,
    get_strategy,
    list_strategies,
    update_strategy,
    validate_strategy_code,
)
from app.services.strategy_templates import STRATEGY_TEMPLATES

router = APIRouter(prefix="/strategies", tags=["strategies"])


@router.get("/templates", response_model=APIResponse[list[TemplateResponse]])
async def get_templates():
    return APIResponse(success=True, data=STRATEGY_TEMPLATES)


@router.post("/validate", response_model=APIResponse[ValidateResponse])
async def validate(payload: ValidateRequest):
    errors = validate_strategy_code(payload.code)
    return APIResponse(success=True, data=ValidateResponse(valid=len(errors) == 0, errors=errors))


@router.get("", response_model=APIResponse[list[StrategyResponse]])
async def list_all(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    strategies = await list_strategies(db, current_user.id)
    return APIResponse(
        success=True, data=[StrategyResponse.model_validate(s) for s in strategies]
    )


@router.post("", response_model=APIResponse[StrategyResponse])
async def create(
    payload: StrategyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    strategy = await create_strategy(db, current_user.id, payload)
    return APIResponse(success=True, data=StrategyResponse.model_validate(strategy))


@router.get("/{strategy_id}", response_model=APIResponse[StrategyResponse])
async def get_one(
    strategy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    strategy = await get_strategy(db, current_user.id, strategy_id)
    return APIResponse(success=True, data=StrategyResponse.model_validate(strategy))


@router.put("/{strategy_id}", response_model=APIResponse[StrategyResponse])
async def update(
    strategy_id: uuid.UUID,
    payload: StrategyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    strategy = await update_strategy(db, current_user.id, strategy_id, payload)
    return APIResponse(success=True, data=StrategyResponse.model_validate(strategy))


@router.delete("/{strategy_id}", response_model=APIResponse[None])
async def delete(
    strategy_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await delete_strategy(db, current_user.id, strategy_id)
    return APIResponse(success=True, data=None)
