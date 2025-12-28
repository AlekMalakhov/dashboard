"""Database session management with async SQLAlchemy."""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import settings

# Create async engine with connection pooling disabled for lambda environments
# For production, consider using a connection pool with proper configuration
engine: AsyncEngine = create_async_engine(
    str(settings.database_url),
    echo=settings.debug,
    poolclass=NullPool,  # Disable pooling for serverless/lambda environments
    future=True,
)

# Create session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for getting async database sessions.

    Yields:
        AsyncSession: Database session for use in FastAPI endpoints.
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
