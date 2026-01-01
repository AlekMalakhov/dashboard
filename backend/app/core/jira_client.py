"""Jira API client for direct API access."""

import base64
from typing import Any

import httpx
from loguru import logger

from app.core.config import settings


class JiraClient:
    """Client for making direct Jira API calls using Basic Auth."""

    def __init__(self) -> None:
        """Initialize Jira client with credentials from settings."""
        if not settings.jira_site_url:
            raise ValueError("JIRA_SITE_URL must be configured")
        if not settings.jira_user_email:
            raise ValueError("JIRA_USER_EMAIL must be configured")
        if not settings.jira_api_token:
            raise ValueError("JIRA_API_TOKEN must be configured")

        self.base_url = settings.jira_site_url.rstrip("/")
        self._auth_header = self._build_auth_header(
            settings.jira_user_email, settings.jira_api_token
        )

    def _build_auth_header(self, email: str, api_token: str) -> str:
        """Build Basic Auth header from email and API token."""
        credentials = f"{email}:{api_token}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"

    def _get_headers(self) -> dict[str, str]:
        """Get headers for Jira API requests."""
        return {
            "Authorization": self._auth_header,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def get(
        self,
        endpoint: str,
        params: dict[str, Any] | None = None,
        timeout: float = 10.0,
    ) -> dict[str, Any]:
        """
        Make GET request to Jira API.

        Args:
            endpoint: API endpoint (e.g., "/rest/api/3/search")
            params: Query parameters
            timeout: Request timeout in seconds

        Returns:
            JSON response from Jira API

        Raises:
            httpx.HTTPStatusError: If request fails
        """
        url = f"{self.base_url}{endpoint}"

        async with httpx.AsyncClient() as client:
            logger.debug(f"GET {url} params={params}")

            response = await client.get(
                url,
                headers=self._get_headers(),
                params=params,
                timeout=timeout,
            )

            response.raise_for_status()
            return response.json()

    async def post(
        self,
        endpoint: str,
        json: dict[str, Any] | None = None,
        timeout: float = 10.0,
    ) -> dict[str, Any]:
        """
        Make POST request to Jira API.

        Args:
            endpoint: API endpoint
            json: Request body
            timeout: Request timeout in seconds

        Returns:
            JSON response from Jira API

        Raises:
            httpx.HTTPStatusError: If request fails
        """
        url = f"{self.base_url}{endpoint}"

        async with httpx.AsyncClient() as client:
            logger.debug(f"POST {url}")

            response = await client.post(
                url,
                headers=self._get_headers(),
                json=json,
                timeout=timeout,
            )

            response.raise_for_status()
            return response.json()


# Singleton instance
_jira_client: JiraClient | None = None


def get_jira_client() -> JiraClient:
    """Get or create singleton Jira client instance."""
    global _jira_client
    if _jira_client is None:
        _jira_client = JiraClient()
    return _jira_client
