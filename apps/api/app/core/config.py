from functools import lru_cache

from pydantic import Field, PostgresDsn, RedisDsn, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    app_name: str = "LMBSC Hospitality Platform"
    app_version: str = "0.1.0"
    debug: bool = False
    environment: str = "development"

    # Database
    database_url: PostgresDsn = Field(
        default="postgresql+asyncpg://lmbsc:lmbsc@localhost/lmbsc_db"
    )
    database_pool_size: int = 20
    database_max_overflow: int = 10

    # Redis
    redis_url: RedisDsn = Field(default="redis://localhost:6379/0")

    # Security
    secret_key: SecretStr = Field(default="change-me-in-production-32-chars-min")
    pii_encryption_key: SecretStr = Field(
        default="change-me-32-byte-aes-key-in-prod"
    )  # 32 bytes for AES-256

    # Stripe
    stripe_secret_key: SecretStr = Field(default="")
    stripe_webhook_secret: SecretStr = Field(default="")

    # Sentry
    sentry_dsn: str = ""

    # CORS
    allowed_origins: list[str] = ["http://localhost:3000"]

    # JWT
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30


@lru_cache
def get_settings() -> Settings:
    return Settings()
