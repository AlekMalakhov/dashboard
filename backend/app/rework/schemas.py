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


class DeveloperIssueDetail(BaseModel):
    """Issue detail for drill-down."""

    key: str = Field(..., description="Issue key (e.g., PROJ-123)")
    summary: str = Field(..., description="Issue summary/title")
    story_points: Optional[float] = Field(None, description="Story points")
    parent_key: Optional[str] = Field(None, description="For bugs: the linked story key")


class DeveloperMetrics(BaseModel):
    """Metrics for a single developer."""

    account_id: str = Field(..., description="Jira account ID")
    display_name: str = Field(..., description="Developer display name from Jira")
    avatar_url: Optional[str] = Field(None, description="URL to developer's avatar image")
    rework_ratio: float = Field(..., description="Rework ratio percentage (bugs / stories * 100)", ge=0)
    stories_count: int = Field(..., description="Number of stories/tasks assigned", ge=0)
    story_points_delivered: float = Field(..., description="Total story points delivered", ge=0)
    bugs_count: int = Field(..., description="Number of bugs linked to developer's stories", ge=0)
    bug_points: float = Field(..., description="Story points associated with bugs", ge=0)
    stories: list[DeveloperIssueDetail] = Field(
        default_factory=list,
        description="List of stories assigned to this developer",
    )
    bugs: list[DeveloperIssueDetail] = Field(
        default_factory=list,
        description="List of bugs linked to developer's stories",
    )


class DeveloperLeaderboardResponse(BaseModel):
    """Leaderboard response."""

    developers: list[DeveloperMetrics] = Field(
        default_factory=list,
        description="List of developers with their metrics",
    )
    total_developers: int = Field(..., description="Total developers analyzed", ge=0)
    developers_excluded: int = Field(..., description="Developers excluded (below minimum stories)", ge=0)
    warning: Optional[str] = Field(None, description="Warning message if developers excluded")
    unattributed_bugs_count: int = Field(0, description="Bugs not linked to any developer's stories", ge=0)
    unattributed_bug_points: float = Field(0.0, description="Story points from unattributed bugs", ge=0)


class LinkedBugDetail(BaseModel):
    """Detail of a bug linked to a ticket."""

    key: str = Field(..., description="Bug issue key")
    summary: str = Field(..., description="Bug summary/title")
    link_type: str = Field(..., description="Link type: 'is caused by' or 'relates to'")


class TopTicketItem(BaseModel):
    """A ticket with its linked bugs."""

    key: str = Field(..., description="Ticket issue key")
    summary: str = Field(..., description="Ticket summary/title")
    issue_type: str = Field(..., description="Issue type (Story/Task)")
    bug_count: int = Field(..., description="Number of linked bugs", ge=0)
    bugs: list[LinkedBugDetail] = Field(default_factory=list, description="Linked bugs")


class TopTicketsWithBugsResponse(BaseModel):
    """Response for top tickets with linked bugs."""

    tickets: list[TopTicketItem] = Field(default_factory=list)
    total_tickets_with_bugs: int = Field(
        ..., description="Total tickets with at least one bug", ge=0
    )
    time_range_days: int = Field(..., description="Time range used for filtering")
    link_types_used: list[str] = Field(default_factory=list, description="Link types included")
