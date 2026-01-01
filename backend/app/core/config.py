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

    # Jira API
    jira_site_url: str = Field(
        default="",
        description="Jira Cloud site URL (e.g., https://yoursite.atlassian.net)",
    )
    jira_user_email: str = Field(
        default="",
        description="Jira user email for API authentication",
    )
    jira_api_token: str = Field(
        default="",
        description="Jira API token for authentication",
    )

    # CORS
    cors_origins: list[str] = Field(
        default=["http://localhost:3000"],
        description="Allowed CORS origins",
    )


settings = Settings()
