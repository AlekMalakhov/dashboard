"""Rework metrics API routes."""

from typing import Annotated, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, status
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.service import AuthService, get_auth_service
from app.db.session import get_db
from app.rework.cache import CacheService, get_cache_service
from app.rework.schemas import ReworkMetricsResponse
from app.rework.service import ReworkService, get_rework_service

router = APIRouter()


@router.get("/rework", response_model=ReworkMetricsResponse)
async def get_rework_metrics(
    board_id: Annotated[int, Query(description="Jira board ID", gt=0)],
    db: Annotated[AsyncSession, Depends(get_db)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    cache_service: Annotated[CacheService, Depends(get_cache_service)],
    days: Annotated[int, Query(description="Time range in days (30, 60, or 90)")] = 30,
    session_id: Annotated[Optional[str], Cookie()] = None,
) -> ReworkMetricsResponse:
    """
    Get rework metrics for a Jira board.

    Calculates the rework ratio by analyzing bugs linked to stories
    delivered within the specified time period.

    Args:
        board_id: Jira board ID to analyze
        days: Number of days to look back (must be 30, 60, or 90)
        db: Database session dependency
        auth_service: Authentication service dependency
        rework_service: Rework service dependency
        session_id: Session cookie value

    Returns:
        ReworkMetricsResponse: Rework metrics including ratio, story counts, and points

    Raises:
        HTTPException: If not authenticated, invalid parameters, or metrics cannot be calculated
    """
    # Validate days parameter
    if days not in {30, 60, 90}:
        logger.warning(f"Invalid days parameter: {days}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="days parameter must be one of: 30, 60, 90",
        )

    # Validate session and get current user
    user = await auth_service.get_current_user(session_id=session_id, db=db)

    if not user:
        logger.warning("Unauthorized rework metrics access attempt")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    logger.info(
        f"Fetching rework metrics for user {user.id}, board {board_id}, days {days}"
    )

    # Calculate rework metrics
    try:
        # Create rework service with cache
        rework_service = ReworkService(cache=cache_service)

        metrics = await rework_service.get_rework_metrics(
            connection_id=user.nango_connection_id,
            board_id=board_id,
            days=days,
        )

        logger.info(
            f"Successfully calculated rework metrics: {metrics.rework_ratio}% "
            f"({metrics.bugs_linked} bugs / {metrics.stories_analyzed} stories)"
        )

        return metrics

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(
            f"Failed to calculate rework metrics for user {user.id}, board {board_id}: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate rework metrics",
        ) from e
