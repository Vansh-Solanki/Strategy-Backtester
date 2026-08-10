import ast
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.strategy import Strategy
from app.schemas.strategy import StrategyCreate, StrategyUpdate

ALLOWED_IMPORTS = ("pandas", "numpy")


def validate_strategy_code(code: str) -> list[str]:
    """Returns a list of error strings. Empty list means valid. No code is executed."""
    errors: list[str] = []
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return [f"Syntax error on line {e.lineno}: {e.msg}"]

    defined = {n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)}
    if "should_enter" not in defined:
        errors.append("Missing required function: should_enter(row, hist, p)")
    if "should_exit" not in defined:
        errors.append("Missing required function: should_exit(row, hist, p, pos)")

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.split(".")[0] not in ALLOWED_IMPORTS:
                    errors.append(f"Import not allowed: {alias.name}")
        elif isinstance(node, ast.ImportFrom):
            if (node.module or "").split(".")[0] not in ALLOWED_IMPORTS:
                errors.append(f"Import not allowed: from {node.module} import ...")

    return errors


async def list_strategies(db: AsyncSession, user_id: uuid.UUID) -> list[Strategy]:
    result = await db.execute(
        select(Strategy)
        .where(Strategy.user_id == user_id, Strategy.is_deleted.is_(False))
        .order_by(Strategy.created_at.desc())
    )
    return list(result.scalars().all())


async def get_strategy(db: AsyncSession, user_id: uuid.UUID, strategy_id: uuid.UUID) -> Strategy:
    result = await db.execute(
        select(Strategy).where(
            Strategy.id == strategy_id,
            Strategy.user_id == user_id,
            Strategy.is_deleted.is_(False),
        )
    )
    strategy = result.scalar_one_or_none()
    if strategy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found")
    return strategy


async def create_strategy(db: AsyncSession, user_id: uuid.UUID, payload: StrategyCreate) -> Strategy:
    errors = validate_strategy_code(payload.config.code)
    if errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="; ".join(errors))

    strategy = Strategy(
        user_id=user_id,
        name=payload.name,
        description=payload.description,
        config=payload.config.model_dump(),
    )
    db.add(strategy)
    await db.commit()
    await db.refresh(strategy)
    return strategy


async def update_strategy(
    db: AsyncSession, user_id: uuid.UUID, strategy_id: uuid.UUID, payload: StrategyUpdate
) -> Strategy:
    strategy = await get_strategy(db, user_id, strategy_id)

    if payload.config is not None:
        errors = validate_strategy_code(payload.config.code)
        if errors:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="; ".join(errors))
        strategy.config = payload.config.model_dump()

    if payload.name is not None:
        strategy.name = payload.name
    if payload.description is not None:
        strategy.description = payload.description

    await db.commit()
    await db.refresh(strategy)
    return strategy


async def delete_strategy(db: AsyncSession, user_id: uuid.UUID, strategy_id: uuid.UUID) -> None:
    strategy = await get_strategy(db, user_id, strategy_id)
    strategy.is_deleted = True
    await db.commit()
