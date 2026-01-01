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
    """Response from Jira search API."""

    issues: list[JiraIssue] = Field(default_factory=list, description="List of issues")
    startAt: int = Field(default=0, description="Start index for pagination")
    maxResults: int = Field(default=50, description="Maximum results per page")
    total: int = Field(default=0, description="Total number of results")


class ReworkMetricsResponse(BaseModel):
    """Response model for rework metrics."""

    rework_ratio: int = Field(
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
    story_points_delivered: int = Field(
        ...,
        description="Total story points delivered in the time period",
        ge=0,
    )
    rework_points: int = Field(
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
