from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/backtester"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "change-this-to-a-random-64-char-string"
    access_token_expire_minutes: int = 10080
    algorithm: str = "HS256"


settings = Settings()
