"""Boards API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends
from loguru import logger

from app.boards.schemas import BoardsListResponse
from app.boards.service import BoardsService, get_boards_service

router = APIRouter()


@router.get("/boards", response_model=BoardsListResponse)
async def get_boards(
    boards_service: Annotated[BoardsService, Depends(get_boards_service)],
) -> BoardsListResponse:
    """
    Get list of Jira boards.

    Fetches boards from Jira using server-configured API credentials.

    Returns:
        BoardsListResponse: List of accessible boards
    """
    logger.info("Fetching boards from Jira")

    boards_response = await boards_service.fetch_boards()

    logger.info(f"Returned {len(boards_response.boards)} boards")

    return boards_response
