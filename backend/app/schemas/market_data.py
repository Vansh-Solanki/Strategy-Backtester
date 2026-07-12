from datetime import date

from pydantic import BaseModel


class PriceBar(BaseModel):
    date: date
    open: float
    high: float
    low: float
    close: float
    adj_close: float
    volume: int

    model_config = {"from_attributes": True}


class FetchJobResponse(BaseModel):
    job_id: str
    status: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
