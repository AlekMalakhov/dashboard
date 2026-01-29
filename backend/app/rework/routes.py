"""Rework metrics API routes."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from loguru import logger

from app.rework.schemas import (
    DeveloperLeaderboardResponse,
    ReworkMetricsResponse,
    ReworkTrendResponse,
    TopTicketsWithBugsResponse,
)
from app.rework.service import ReworkService

router = APIRouter()


@router.get("/rework", response_model=ReworkMetricsResponse)
async def get_rework_metrics(
    board_id: Annotated[int, Query(description="Jira board ID", gt=0)],
    days: Annotated[int, Query(description="Time range in days (7-180)", ge=7, le=180)] = 90,
) -> ReworkMetricsResponse:
    """
    Get rework metrics for a Jira board.

    Calculates the rework ratio by analyzing bugs linked to stories
    delivered within the specified time period.

    Args:
        board_id: Jira board ID to analyze
        days: Number of days to look back (7-180)

    Returns:
        ReworkMetricsResponse: Rework metrics including ratio, story counts, and points
    """

    logger.info(f"Calculating rework metrics for board {board_id}, days {days}")

    rework_service = ReworkService()
    metrics = await rework_service.get_rework_metrics(board_id=board_id, days=days)

    logger.info(
        f"Rework metrics: {metrics.rework_ratio}% "
        f"({metrics.bugs_linked} bugs / {metrics.stories_analyzed} stories)"
    )

    return metrics


@router.get("/rework/trend", response_model=ReworkTrendResponse)
async def get_rework_trend(
    board_id: Annotated[int, Query(description="Jira board ID", gt=0)],
    days: Annotated[int, Query(description="Time range in days (7-180)", ge=7, le=180)] = 90,
) -> ReworkTrendResponse:
    """
    Get weekly rework ratio trend for specified time range.

    Returns weekly data points showing rework ratio, story points,
    and issue counts over the requested time period.

    Args:
        board_id: Jira board ID to analyze
        days: Number of days to look back (7-180)

    Returns:
        ReworkTrendResponse: Weekly trend data with metrics
    """
    logger.info(f"Calculating rework trend for board {board_id}, days {days}")

    rework_service = ReworkService()
    trend = await rework_service.get_rework_trend(board_id=board_id, days=days)

    logger.info(
        f"Rework trend: {len(trend.weeks)} weeks, "
        f"{trend.items_excluded} items excluded"
    )

    return trend


@router.get("/rework/developers", response_model=DeveloperLeaderboardResponse)
async def get_developer_rework_leaderboard(
    board_id: Annotated[int, Query(description="Jira board ID", gt=0)],
    days: Annotated[int, Query(description="Time range in days", ge=7, le=180)] = 90,
) -> DeveloperLeaderboardResponse:
    """
    Get developer rework leaderboard for a Jira board.

    Returns per-developer metrics including story counts, story points delivered,
    and rework ratio. Bugs are attributed to the assignee of the parent story
    they are linked to via "is caused by" relationship.

    Developers with fewer than 3 stories are excluded from results.

    Args:
        board_id: Jira board ID to analyze
        days: Number of days to look back (7-180)

    Returns:
        DeveloperLeaderboardResponse: Developer metrics grouped by assignee,
        sorted by rework ratio (highest first)
    """
    logger.info(f"Getting developer rework leaderboard for board {board_id}, days {days}")

    rework_service = ReworkService()
    leaderboard = await rework_service.get_developer_rework_leaderboard(board_id=board_id, days=days)

    logger.info(
        f"Developer leaderboard: {len(leaderboard.developers)} developers, "
        f"{leaderboard.developers_excluded} excluded"
    )

    return leaderboard


@router.get("/rework/top-tickets-with-bugs", response_model=TopTicketsWithBugsResponse)
async def get_top_tickets_with_bugs(
    board_id: Annotated[int, Query(description="Jira board ID", gt=0)],
    days: Annotated[int, Query(description="Time range in days (7-180)", ge=7, le=180)] = 30,
    limit: Annotated[int, Query(description="Number of tickets to return (10, 20, or 50)")] = 10,
) -> TopTicketsWithBugsResponse:
    """
    Get top tickets with the most linked bugs.

    Returns tickets (Stories/Tasks) that have bugs linked to them,
    sorted by bug count descending. This helps identify which work items
    generated the most rework.

    Args:
        board_id: Jira board ID to analyze
        days: Number of days to look back (7-180)
        limit: Number of tickets to return (10, 20, or 50)

    Returns:
        TopTicketsWithBugsResponse: Top tickets with their linked bugs
    """
    # Normalize limit to valid values
    if limit not in [10, 20, 50]:
        limit = 10

    logger.info(f"Getting top tickets with bugs for board {board_id}, days {days}, limit {limit}")

    rework_service = ReworkService()
    return await rework_service.get_top_tickets_with_bugs(board_id=board_id, days=days, limit=limit)
