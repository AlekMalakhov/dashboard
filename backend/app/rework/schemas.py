"""Pydantic schemas for rework metrics."""

from typing import Any, Optional

from pydantic import BaseModel, Field


class JiraIssueFields(BaseModel):
    """Fields from a Jira issue."""

    key: str = Field(..., description="Issue key (e.g., PROJ-123)")
    summary: str = Field(..., description="Issue summary/title")
    created: str = Field(..., description="ISO 8601 creation timestamp")


class JiraIssue(BaseModel):
    """Jira issue model for internal use."""

    key: str = Field(..., description="Issue key (e.g., PROJ-123)")
    fields: dict[str, Any] = Field(..., description="Issue fields")

    @property
    def summary(self) -> str:
        """Get issue summary."""
        return self.fields.get("summary", "")

    @property
    def created(self) -> str:
        """Get issue creation timestamp."""
        return self.fields.get("created", "")


class JiraSearchResponse(BaseModel):
    """Response from Jira search API (token-based pagination)."""

    issues: list[JiraIssue] = Field(default_factory=list, description="List of issues")
    nextPageToken: Optional[str] = Field(default=None, description="Token for next page")
    isLast: bool = Field(default=True, description="Whether this is the last page")


class IssueDetail(BaseModel):
    """Detail of a single issue for drill-down."""

    key: str = Field(..., description="Issue key (e.g., PROJ-123)")
    summary: str = Field(..., description="Issue summary/title")
    story_points: Optional[float] = Field(None, description="Story points")


class ReworkMetricsResponse(BaseModel):
    """Response model for rework metrics."""

    rework_ratio: float = Field(
        ...,
        description="Rework ratio percentage (bugs / stories * 100)",
        ge=0,
    )
    stories_analyzed: int = Field(
        ...,
        description="Total number of stories analyzed in the time period",
        ge=0,
    )
    bugs_linked: int = Field(
        ...,
        description="Number of bugs linked to analyzed stories",
        ge=0,
    )
    story_points_delivered: float = Field(
        ...,
        description="Total story points delivered in the time period",
        ge=0,
    )
    rework_points: float = Field(
        ...,
        description="Story points associated with rework bugs",
        ge=0,
    )
    items_excluded: int = Field(
        ...,
        description="Number of items excluded from analysis (e.g., missing story points)",
        ge=0,
    )
    warning: Optional[str] = Field(
        None,
        description="Warning message if data quality issues detected",
    )
    # Detailed lists for drill-down
    bugs: list[IssueDetail] = Field(
        default_factory=list,
        description="List of bugs included in the calculation",
    )
    stories: list[IssueDetail] = Field(
        default_factory=list,
        description="List of stories included in the calculation",
    )


class WeeklyDataPoint(BaseModel):
    """Single week's rework metrics."""

    week_start_date: str = Field(..., description="ISO 8601 date (YYYY-MM-DD)")
    rework_ratio: float = Field(..., description="Percentage (0-100+)", ge=0)
    rework_points: float = Field(..., description="Story points from bugs", ge=0)
    delivered_points: float = Field(..., description="Story points from stories/tasks", ge=0)
    bugs_count: int = Field(..., description="Number of bugs resolved", ge=0)
    stories_count: int = Field(..., description="Number of stories/tasks resolved", ge=0)


class ReworkTrendResponse(BaseModel):
    """Response model for rework trend over time."""

    weeks: list[WeeklyDataPoint] = Field(..., description="Ordered oldest-first")
    total_weeks: int = Field(..., description="Total number of weeks in response", ge=0)
    items_excluded: int = Field(..., description="Number of items excluded from analysis", ge=0)
    warning: Optional[str] = Field(None, description="Warning message if data quality issues detected")
