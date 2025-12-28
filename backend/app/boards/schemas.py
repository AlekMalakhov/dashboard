"""Pydantic schemas for boards."""

from pydantic import BaseModel, Field


class BoardResponse(BaseModel):
    """Response model for a single Jira board."""

    id: int = Field(
        ...,
        description="Board ID from Jira",
    )
    name: str = Field(
        ...,
        description="Board name",
    )


class BoardsListResponse(BaseModel):
    """Response model for list of boards."""

    boards: list[BoardResponse] = Field(
        default_factory=list,
        description="List of available boards",
    )
