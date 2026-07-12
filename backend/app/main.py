from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, market_data, tickers, users

app = FastAPI(title="Strategy Backtester API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(users.router)
app.include_router(tickers.router)
app.include_router(market_data.router)
