"""Application configuration using Pydantic Settings."""

from pydantic import Field
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
