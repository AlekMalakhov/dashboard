"""Service for fetching Jira boards via direct API."""

import httpx
from fastapi import HTTPException, status
from loguru import logger

from app.boards.schemas import BoardResponse, BoardsListResponse
from app.core.jira_client import JiraClient, get_jira_client


class BoardsService:
    """Service for interacting with Jira boards API."""

    def __init__(self, jira_client: JiraClient | None = None) -> None:
        """Initialize boards service with Jira client."""
        self.jira = jira_client or get_jira_client()

    async def fetch_boards(self) -> BoardsListResponse:
        """
        Fetch boards from Jira.

        Returns:
            BoardsListResponse: List of boards with id and name

        Raises:
            HTTPException: If boards cannot be fetched
        """
        try:
            logger.info("Fetching boards from Jira...")

            data = await self.jira.get("/rest/agile/1.0/board")

            # Parse Jira API response
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

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                logger.warning("Unauthorized access to Jira boards")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Jira credentials",
                )
            if e.response.status_code == 403:
                logger.warning("Forbidden access to Jira boards")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access to Jira boards is forbidden",
                )
            logger.error(f"Jira API error: {e.response.status_code}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to communicate with Jira API",
            )
        except Exception as e:
            logger.exception(f"Failed to fetch boards: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve boards",
            )


def get_boards_service() -> BoardsService:
    """Dependency for getting boards service instance."""
    return BoardsService()
