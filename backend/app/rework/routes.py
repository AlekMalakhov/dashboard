"""Rework metrics API routes."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from loguru import logger

from app.rework.schemas import ReworkMetricsResponse
from app.rework.service import ReworkService

router = APIRouter()


@router.get("/rework", response_model=ReworkMetricsResponse)
async def get_rework_metrics(
    board_id: Annotated[int, Query(description="Jira board ID", gt=0)],
    days: Annotated[int, Query(description="Time range in days (30, 60, 84, or 90)")] = 30,
) -> ReworkMetricsResponse:
    """
    Get rework metrics for a Jira board.

    Calculates the rework ratio by analyzing bugs linked to stories
    delivered within the specified time period.

    Args:
        board_id: Jira board ID to analyze
        days: Number of days to look back (must be 30, 60, 84, or 90)

    Returns:
        ReworkMetricsResponse: Rework metrics including ratio, story counts, and points
    """
    if days not in {30, 60, 84, 90}:
        logger.warning(f"Invalid days parameter: {days}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="days parameter must be one of: 30, 60, 84, 90",
        )

    logger.info(f"Calculating rework metrics for board {board_id}, days {days}")

    rework_service = ReworkService()
    metrics = await rework_service.get_rework_metrics(board_id=board_id, days=days)

    logger.info(
        f"Rework metrics: {metrics.rework_ratio}% "
        f"({metrics.bugs_linked} bugs / {metrics.stories_analyzed} stories)"
    )

    return metrics
