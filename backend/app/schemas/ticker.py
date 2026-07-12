from pydantic import BaseModel


class TickerSearchResult(BaseModel):
    symbol: str
    name: str
    exchange: str | None = None

    model_config = {"from_attributes": True}


class TickerResponse(BaseModel):
    symbol: str
    name: str
    exchange: str | None = None
    cik: str | None = None

    model_config = {"from_attributes": True}
