import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class StrategyConfig(BaseModel):
    code: str
    params: dict = Field(default_factory=dict)
    position_size: float = Field(gt=0, le=1)
    stop_loss: float = Field(gt=0, le=1)


class StrategyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    config: StrategyConfig


class StrategyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    config: StrategyConfig | None = None


class StrategyResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: str | None
    config: StrategyConfig
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ValidateRequest(BaseModel):
    code: str


class ValidateResponse(BaseModel):
    valid: bool
    errors: list[str]


class TemplateResponse(BaseModel):
    name: str
    description: str
    code: str
    default_params: dict
