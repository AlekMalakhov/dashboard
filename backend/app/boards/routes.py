"""Boards API routes."""

from typing import Annotated, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.service import AuthService, get_auth_service
from app.boards.schemas import BoardsListResponse
from app.boards.service import BoardsService, get_boards_service
from app.db.session import get_db

router = APIRouter()


@router.get("/boards", response_model=BoardsListResponse)
async def get_boards(
    db: Annotated[AsyncSession, Depends(get_db)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    boards_service: Annotated[BoardsService, Depends(get_boards_service)],
    session_id: Annotated[Optional[str], Cookie()] = None,
) -> BoardsListResponse:
    """
    Get list of Jira boards accessible to the authenticated user.

    This endpoint requires an authenticated session. It fetches boards
    from Jira using the user's Nango connection via the Nango proxy.

    Args:
        db: Database session dependency
        auth_service: Authentication service dependency
        boards_service: Boards service dependency
        session_id: Session cookie value

    Returns:
        BoardsListResponse: List of accessible boards

    Raises:
        HTTPException: If not authenticated or boards cannot be fetched
    """
    # Validate session and get current user
    user = await auth_service.get_current_user(session_id=session_id, db=db)

    if not user:
        logger.warning("Unauthorized boards access attempt")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    logger.info(f"Fetching boards for user: {user.id}")

    # Fetch boards using user's Nango connection
    try:
        boards_response = await boards_service.fetch_boards(
            connection_id=user.nango_connection_id
        )

        logger.info(f"Successfully returned {len(boards_response.boards)} boards")

        return boards_response

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to fetch boards for user {user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve boards",
        ) from e
