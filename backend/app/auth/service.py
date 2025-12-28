"""Authentication service with Nango integration and session management."""

from datetime import datetime
from typing import Optional
from uuid import UUID

import httpx
from fastapi import HTTPException, Response, status
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import UserResponse
from app.core.config import settings
from app.db.models import User


class NangoService:
    """Service for interacting with Nango OAuth platform via REST API."""

    NANGO_API_URL = "https://api.nango.dev"

    def __init__(self) -> None:
        """Initialize Nango client with secret key from settings."""
        if not settings.nango_secret_key:
            logger.error("NANGO_SECRET_KEY not configured")
            raise ValueError("NANGO_SECRET_KEY must be configured")

        self.secret_key = settings.nango_secret_key
        self.headers = {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }

    async def get_connection_metadata(self, connection_id: str) -> dict[str, str]:
        """
        Fetch connection metadata from Nango REST API.

        Args:
            connection_id: Nango connection identifier

        Returns:
            Dictionary containing connection metadata including atlassian_account_id

        Raises:
            HTTPException: If connection not found or Nango API error
        """
        try:
            async with httpx.AsyncClient() as client:
                # Call Nango API to get connection details
                # Endpoint: GET /connection/:connectionId
                url = f"{self.NANGO_API_URL}/connection/{connection_id}"
                params = {"provider_config_key": "jira"}

                response = await client.get(
                    url,
                    headers=self.headers,
                    params=params,
                    timeout=10.0,
                )

                if response.status_code == 404:
                    logger.warning(f"Nango connection not found: {connection_id}")
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Nango connection not found",
                    )

                response.raise_for_status()
                connection_data = response.json()

                # Extract Atlassian account ID from connection metadata
                # The actual structure depends on Nango's response format
                # Typically: connection_data.metadata.account_id
                metadata = connection_data.get("metadata", {})
                atlassian_account_id = metadata.get("account_id")

                if not atlassian_account_id:
                    logger.error(
                        f"Missing account_id in Nango response: {connection_data}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Connection missing required account_id",
                    )

                logger.info(
                    f"Retrieved Nango connection for account: {atlassian_account_id}"
                )

                return {
                    "atlassian_account_id": atlassian_account_id,
                    "connection_id": connection_id,
                }

        except HTTPException:
            raise
        except httpx.HTTPStatusError as e:
            logger.error(f"Nango API error: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to communicate with OAuth provider",
            ) from e
        except Exception as e:
            logger.exception(f"Failed to fetch Nango connection: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve OAuth connection details",
            ) from e


class AuthService:
    """Service for handling authentication and session management."""

    def __init__(self, nango_service: NangoService) -> None:
        """
        Initialize auth service with Nango integration.

        Args:
            nango_service: Nango service for OAuth operations
        """
        self.nango_service = nango_service

    async def handle_oauth_callback(
        self,
        connection_id: str,
        db: AsyncSession,
    ) -> UserResponse:
        """
        Process OAuth callback and create/update user.

        Args:
            connection_id: Nango connection ID from OAuth flow
            db: Database session

        Returns:
            UserResponse: Created or updated user data

        Raises:
            HTTPException: If authentication fails
        """
        # Get connection metadata from Nango
        connection_data = await self.nango_service.get_connection_metadata(
            connection_id
        )

        atlassian_account_id = connection_data["atlassian_account_id"]

        # Check if user already exists
        result = await db.execute(
            select(User).where(User.nango_connection_id == connection_id)
        )
        user = result.scalar_one_or_none()

        if user:
            # Update existing user
            user.atlassian_account_id = atlassian_account_id
            user.updated_at = datetime.utcnow()
            logger.info(f"Updated existing user: {user.id}")
        else:
            # Create new user
            user = User(
                nango_connection_id=connection_id,
                atlassian_account_id=atlassian_account_id,
            )
            db.add(user)
            logger.info(f"Created new user with connection_id: {connection_id}")

        await db.commit()
        await db.refresh(user)

        return UserResponse.model_validate(user)

    def set_session_cookie(
        self,
        response: Response,
        user_id: UUID,
    ) -> None:
        """
        Set HTTP-only session cookie.

        Args:
            response: FastAPI response object
            user_id: User ID to store in session
        """
        # Set HTTP-only cookie with user session
        # In production, consider using signed cookies or JWT
        response.set_cookie(
            key="session_id",
            value=str(user_id),
            httponly=True,
            secure=not settings.debug,  # HTTPS only in production
            samesite="lax",
            max_age=86400 * 30,  # 30 days
        )
        logger.info(f"Set session cookie for user: {user_id}")

    def get_session_user_id(self, session_id: Optional[str]) -> Optional[UUID]:
        """
        Extract user ID from session cookie.

        Args:
            session_id: Session cookie value

        Returns:
            User UUID if valid session, None otherwise
        """
        if not session_id:
            return None

        try:
            return UUID(session_id)
        except (ValueError, AttributeError):
            logger.warning(f"Invalid session_id format: {session_id}")
            return None

    async def get_current_user(
        self,
        session_id: Optional[str],
        db: AsyncSession,
    ) -> Optional[User]:
        """
        Get current authenticated user from session.

        Args:
            session_id: Session cookie value
            db: Database session

        Returns:
            User if authenticated, None otherwise
        """
        user_id = self.get_session_user_id(session_id)
        if not user_id:
            return None

        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()


def get_nango_service() -> NangoService:
    """
    Dependency for getting Nango service instance.

    Returns:
        NangoService: Configured Nango service
    """
    return NangoService()


def get_auth_service() -> AuthService:
    """
    Dependency for getting auth service instance.

    Returns:
        AuthService: Configured auth service with Nango integration
    """
    nango_service = get_nango_service()
    return AuthService(nango_service=nango_service)
