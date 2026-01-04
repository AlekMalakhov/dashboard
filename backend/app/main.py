"""FastAPI application entry point."""

import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.api import health
from app.boards import routes as boards_routes
from app.core.config import settings
from app.rework import routes as rework_routes


def configure_logging() -> None:
    """Configure structured JSON logging with loguru."""
    logger.remove()
    logger.add(
        sys.stdout,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        level="INFO" if not settings.debug else "DEBUG",
        serialize=True,  # JSON serialization
    )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager for startup and shutdown events."""
    # Startup
    configure_logging()
    logger.info("Starting Jira Dashboard API")
    logger.info(f"Debug mode: {settings.debug}")

    yield

    # Shutdown
    logger.info("Shutting down Jira Dashboard API")


def create_application() -> FastAPI:
    """Create and configure FastAPI application."""
    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        lifespan=lifespan,
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(boards_routes.router, prefix="/api", tags=["boards"])
    app.include_router(rework_routes.router, prefix="/api", tags=["rework"])

    return app


app = create_application()
