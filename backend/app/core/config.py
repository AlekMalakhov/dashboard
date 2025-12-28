"""Application configuration using Pydantic Settings."""

from pydantic import Field, PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "Jira Dashboard API"
    debug: bool = False

    # Database
    database_url: PostgresDsn = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/jira_dashboard",
        description="PostgreSQL database URL with asyncpg driver",
    )

    # Redis
    redis_url: RedisDsn = Field(
        default="redis://localhost:6379/0",
        description="Redis cache URL",
    )

    # Nango Integration
    nango_secret_key: str = Field(
        default="",
        description="Nango secret key for API authentication",
    )

    # CORS
    cors_origins: list[str] = Field(
        default=["http://localhost:3000"],
        description="Allowed CORS origins",
    )


settings = Settings()
