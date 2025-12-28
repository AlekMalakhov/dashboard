"""Pydantic schemas for authentication."""

from uuid import UUID

from pydantic import BaseModel, Field


class AuthCallbackRequest(BaseModel):
    """Request model for OAuth callback endpoint."""

    connection_id: str = Field(
        ...,
        description="Nango connection ID received after OAuth flow",
        min_length=1,
    )


class UserResponse(BaseModel):
    """Response model for user data."""

    id: UUID = Field(
        ...,
        description="User's unique identifier",
    )
    atlassian_account_id: str = Field(
        ...,
        description="Jira/Atlassian account ID",
    )

    model_config = {"from_attributes": True}


class AuthCallbackResponse(BaseModel):
    """Response model for OAuth callback endpoint."""

    success: bool = Field(
        ...,
        description="Whether authentication was successful",
    )
    user: UserResponse = Field(
        ...,
        description="Authenticated user data",
    )
