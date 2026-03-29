from functools import lru_cache

from pydantic import Field, PostgresDsn, RedisDsn, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    app_name: str = "LMBSC Hospitality Platform"
    app_version: str = "0.1.0"
    debug: bool = False
    show_docs: bool = False  # enable Swagger UI + ReDoc independently of debug mode
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

    # Clerk auth
    clerk_publishable_key: SecretStr = Field(default="")
    clerk_secret_key: SecretStr = Field(default="")
    # The Clerk Frontend API domain, e.g. "clerk.lamitabiciclista.ro" or the
    # auto-generated "<slug>.clerk.accounts.dev" domain from the Clerk dashboard.
    clerk_frontend_api: str = ""

    # JWT (legacy / internal tokens)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30


@lru_cache
def get_settings() -> Settings:
    return Settings()
