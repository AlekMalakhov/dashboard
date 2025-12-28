"""Authentication API routes."""

from typing import Annotated, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import (
    AuthCallbackRequest,
    AuthCallbackResponse,
    UserResponse,
)
from app.auth.service import AuthService, get_auth_service
from app.db.session import get_db

router = APIRouter()


@router.post("/auth/callback", response_model=AuthCallbackResponse)
async def auth_callback(
    request: AuthCallbackRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> AuthCallbackResponse:
    """
    Handle OAuth callback from Nango.

    This endpoint receives the connection ID after successful OAuth flow,
    fetches user details from Nango, creates or updates the user record,
    and sets an HTTP-only session cookie.

    Args:
        request: OAuth callback request with connection_id
        response: FastAPI response for setting cookies
        db: Database session dependency
        auth_service: Authentication service dependency

    Returns:
        AuthCallbackResponse: Success status and user data

    Raises:
        HTTPException: If authentication fails
    """
    logger.info(f"Processing OAuth callback for connection: {request.connection_id}")

    try:
        # Process OAuth callback and create/update user
        user = await auth_service.handle_oauth_callback(
            connection_id=request.connection_id,
            db=db,
        )

        # Set session cookie
        auth_service.set_session_cookie(response=response, user_id=user.id)

        logger.info(f"OAuth callback successful for user: {user.id}")

        return AuthCallbackResponse(
            success=True,
            user=user,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"OAuth callback failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed",
        ) from e


@router.get("/auth/session", response_model=UserResponse)
async def get_session(
    db: Annotated[AsyncSession, Depends(get_db)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    session_id: Annotated[Optional[str], Cookie()] = None,
) -> UserResponse:
    """
    Get current authenticated user from session.

    Args:
        db: Database session dependency
        auth_service: Authentication service dependency
        session_id: Session cookie value

    Returns:
        UserResponse: Current user data

    Raises:
        HTTPException: If not authenticated
    """
    user = await auth_service.get_current_user(session_id=session_id, db=db)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    return UserResponse.model_validate(user)


@router.post("/auth/logout")
async def logout(response: Response) -> dict[str, str]:
    """
    Logout current user by clearing session cookie.

    Args:
        response: FastAPI response for clearing cookies

    Returns:
        Success message
    """
    response.delete_cookie(key="session_id")
    logger.info("User logged out")

    return {"message": "Logged out successfully"}
