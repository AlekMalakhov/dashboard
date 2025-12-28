"""Service for fetching Jira boards via Nango proxy."""

import httpx
from fastapi import HTTPException, status
from loguru import logger

from app.boards.schemas import BoardResponse, BoardsListResponse
from app.core.config import settings


class BoardsService:
    """Service for interacting with Jira boards API via Nango proxy."""

    NANGO_PROXY_URL = "https://api.nango.dev/proxy"

    def __init__(self) -> None:
        """Initialize boards service with Nango configuration."""
        if not settings.nango_secret_key:
            logger.error("NANGO_SECRET_KEY not configured")
            raise ValueError("NANGO_SECRET_KEY must be configured")

        self.secret_key = settings.nango_secret_key

    async def fetch_boards(self, connection_id: str) -> BoardsListResponse:
        """
        Fetch boards from Jira via Nango proxy.

        Uses Nango's proxy endpoint which automatically handles:
        - OAuth token retrieval
        - Cloud ID resolution
        - API request forwarding

        Args:
            connection_id: User's Nango connection ID

        Returns:
            BoardsListResponse: List of boards with id and name

        Raises:
            HTTPException: If boards cannot be fetched
        """
        try:
            async with httpx.AsyncClient() as client:
                # Nango proxy endpoint: https://api.nango.dev/proxy/rest/agile/1.0/board
                # The proxy automatically:
                # 1. Gets the access token for this connection
                # 2. Resolves the Jira cloud ID
                # 3. Forwards the request to Jira API
                url = f"{self.NANGO_PROXY_URL}/rest/agile/1.0/board"

                headers = {
                    "Authorization": f"Bearer {self.secret_key}",
                    "Connection-Id": connection_id,
                    "Provider-Config-Key": "jira",
                    "Content-Type": "application/json",
                }

                logger.info(f"Fetching boards for connection: {connection_id}")

                response = await client.get(
                    url,
                    headers=headers,
                    timeout=10.0,
                )

                if response.status_code == 401:
                    logger.warning(
                        f"Unauthorized access to Jira boards for connection: {connection_id}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid or expired Jira credentials",
                    )

                if response.status_code == 403:
                    logger.warning(
                        f"Forbidden access to Jira boards for connection: {connection_id}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access to Jira boards is forbidden",
                    )

                response.raise_for_status()
                data = response.json()

                # Parse Jira API response
                # Jira returns: { "values": [{ "id": int, "name": str, ... }], ... }
                boards_data = data.get("values", [])

                boards = [
                    BoardResponse(
                        id=board["id"],
                        name=board["name"],
                    )
                    for board in boards_data
                    if "id" in board and "name" in board
                ]

                logger.info(f"Successfully fetched {len(boards)} boards")

                return BoardsListResponse(boards=boards)

        except HTTPException:
            raise
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Jira API error: {e.response.status_code} - {e.response.text}"
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to communicate with Jira API",
            ) from e
        except Exception as e:
            logger.exception(f"Failed to fetch boards: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve boards",
            ) from e


def get_boards_service() -> BoardsService:
    """
    Dependency for getting boards service instance.

    Returns:
        BoardsService: Configured boards service
    """
    return BoardsService()
