"""Redis cache service for rework metrics."""

import json
from typing import Optional

import redis.asyncio as redis
from loguru import logger

from app.core.config import settings
from app.rework.schemas import ReworkMetricsResponse


class CacheService:
    """Async Redis cache for rework metrics."""

    TTL_MAP = {
        30: 900,   # 15 minutes
        60: 1800,  # 30 minutes
        90: 3600,  # 60 minutes
    }

    def __init__(self) -> None:
        """Initialize Redis connection."""
        self._redis: Optional[redis.Redis] = None

    async def _get_client(self) -> redis.Redis:
        """
        Get or create Redis client.

        Returns:
            Redis client instance

        Raises:
            Exception: If Redis connection cannot be established
        """
        if self._redis is None:
            self._redis = redis.from_url(
                str(settings.redis_url),
                encoding="utf-8",
                decode_responses=True,
            )
        return self._redis

    def _get_cache_key(self, board_id: int, days: int) -> str:
        """
        Generate cache key for rework metrics.

        Args:
            board_id: Jira board ID
            days: Number of days to look back

        Returns:
            Cache key string in format "rework:{board_id}:{days}"
        """
        return f"rework:{board_id}:{days}"

    async def get(self, board_id: int, days: int) -> Optional[ReworkMetricsResponse]:
        """
        Get cached metrics.

        Args:
            board_id: Jira board ID
            days: Number of days to look back

        Returns:
            Cached metrics if found, None otherwise
        """
        try:
            client = await self._get_client()
            cache_key = self._get_cache_key(board_id, days)

            cached_data = await client.get(cache_key)

            if cached_data is None:
                logger.debug(f"Cache miss for key: {cache_key}")
                return None

            logger.info(f"Cache hit for key: {cache_key}")

            # Parse JSON and convert to Pydantic model
            data_dict = json.loads(cached_data)
            return ReworkMetricsResponse(**data_dict)

        except redis.RedisError as e:
            logger.warning(f"Redis error during get operation: {e}")
            return None
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse cached data: {e}")
            return None
        except Exception as e:
            logger.warning(f"Unexpected error during cache get: {e}")
            return None

    async def set(
        self,
        board_id: int,
        days: int,
        metrics: ReworkMetricsResponse,
    ) -> None:
        """
        Cache metrics with TTL.

        Args:
            board_id: Jira board ID
            days: Number of days to look back
            metrics: Metrics to cache
        """
        try:
            client = await self._get_client()
            cache_key = self._get_cache_key(board_id, days)

            # Get TTL based on time range
            ttl = self.TTL_MAP.get(days, 900)  # Default to 15 minutes

            # Serialize Pydantic model to JSON
            cached_data = metrics.model_dump_json()

            await client.setex(cache_key, ttl, cached_data)

            logger.info(
                f"Cached metrics for key: {cache_key} with TTL: {ttl} seconds"
            )

        except redis.RedisError as e:
            logger.warning(f"Redis error during set operation: {e}")
        except Exception as e:
            logger.warning(f"Unexpected error during cache set: {e}")

    async def close(self) -> None:
        """Close Redis connection."""
        if self._redis:
            try:
                await self._redis.close()
                logger.debug("Redis connection closed")
            except Exception as e:
                logger.warning(f"Error closing Redis connection: {e}")


def get_cache_service() -> CacheService:
    """
    Dependency for cache service.

    Returns:
        CacheService instance
    """
    return CacheService()
