"""Service for calculating rework metrics from Jira data."""

import asyncio
from typing import Optional, TYPE_CHECKING

import httpx
from fastapi import HTTPException, status
from loguru import logger

from app.core.config import settings
from app.rework.schemas import JiraSearchResponse, ReworkMetricsResponse

if TYPE_CHECKING:
    from app.rework.cache import CacheService


class ReworkService:
    """Service for analyzing rework metrics from Jira boards."""

    NANGO_PROXY_URL = "https://api.nango.dev/proxy"

    def __init__(self, cache: Optional["CacheService"] = None) -> None:
        """
        Initialize rework service with Nango configuration.

        Args:
            cache: Optional cache service for caching metrics
        """
        if not settings.nango_secret_key:
            logger.error("NANGO_SECRET_KEY not configured")
            raise ValueError("NANGO_SECRET_KEY must be configured")

        self.nango_secret_key = settings.nango_secret_key
        self.cache = cache
        self._story_points_field_cache: dict[str, str | None] = {}

    async def _detect_story_points_field(self, connection_id: str) -> str | None:
        """
        Auto-detect the story points custom field in Jira.

        Calls Jira API to get all fields and finds the one containing "Story Points"
        or "Story point" in the name. Results are cached per connection.

        Args:
            connection_id: User's Nango connection ID for Jira access

        Returns:
            Field ID (e.g., "customfield_10016") or None if not found
        """
        # Check cache first
        if connection_id in self._story_points_field_cache:
            return self._story_points_field_cache[connection_id]

        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.NANGO_PROXY_URL}/rest/api/3/field"

                headers = {
                    "Authorization": f"Bearer {self.nango_secret_key}",
                    "Connection-Id": connection_id,
                    "Provider-Config-Key": "jira",
                    "Content-Type": "application/json",
                }

                logger.info(f"Detecting story points field for connection: {connection_id}")

                response = await client.get(
                    url,
                    headers=headers,
                    timeout=10.0,
                )

                response.raise_for_status()
                fields = response.json()

                # Find field with "Story Points" or "Story point" in name (case-insensitive)
                story_points_field = None
                for field in fields:
                    field_name = field.get("name", "").lower()
                    if "story point" in field_name:
                        story_points_field = field.get("id")
                        logger.info(
                            f"Found story points field: {field.get('name')} ({story_points_field})"
                        )
                        break

                if not story_points_field:
                    logger.warning(
                        f"Story points field not found for connection: {connection_id}"
                    )

                # Cache the result
                self._story_points_field_cache[connection_id] = story_points_field
                return story_points_field

        except Exception as e:
            logger.error(f"Failed to detect story points field: {e}")
            # Cache None to avoid repeated failed attempts
            self._story_points_field_cache[connection_id] = None
            return None

    async def _fetch_bugs(
        self,
        connection_id: str,
        board_id: int,
        days: int,
        story_points_field_id: str | None = None,
    ) -> list[dict]:
        """
        Fetch bugs from Jira via Nango proxy.

        Args:
            connection_id: User's Nango connection ID for Jira access
            board_id: Jira board ID to query
            days: Number of days to look back
            story_points_field_id: Custom field ID for story points (optional)

        Returns:
            List of bug issues from Jira

        Raises:
            HTTPException: If bugs cannot be fetched from Jira
        """
        try:
            # Build JQL query to fetch bugs created in the time range
            jql = f"project IN boardProjects({board_id}) AND type = Bug AND created >= -{days}d"

            # Build fields list - always include key, summary, created
            fields = "key,summary,created"
            if story_points_field_id:
                fields += f",{story_points_field_id}"

            async with httpx.AsyncClient() as client:
                url = f"{self.NANGO_PROXY_URL}/rest/api/3/search"

                headers = {
                    "Authorization": f"Bearer {self.nango_secret_key}",
                    "Connection-Id": connection_id,
                    "Provider-Config-Key": "jira",
                    "Content-Type": "application/json",
                }

                params = {
                    "jql": jql,
                    "fields": fields,
                    "maxResults": 100,  # Fetch up to 100 bugs per page
                    "startAt": 0,
                }

                logger.info(
                    f"Fetching bugs for board {board_id} with JQL: {jql}"
                )

                all_issues = []

                # Handle pagination
                while True:
                    response = await client.get(
                        url,
                        headers=headers,
                        params=params,
                        timeout=10.0,
                    )

                    if response.status_code == 401:
                        logger.warning(
                            f"Unauthorized access to Jira for connection: {connection_id}"
                        )
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid or expired Jira credentials",
                        )

                    if response.status_code == 403:
                        logger.warning(
                            f"Forbidden access to Jira for connection: {connection_id}"
                        )
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access to Jira is forbidden",
                        )

                    response.raise_for_status()
                    data = response.json()

                    # Parse response using Pydantic model
                    search_response = JiraSearchResponse(**data)

                    all_issues.extend(search_response.issues)

                    logger.info(
                        f"Fetched {len(search_response.issues)} bugs "
                        f"(total so far: {len(all_issues)} / {search_response.total})"
                    )

                    # Check if we need to fetch more pages
                    if len(all_issues) >= search_response.total:
                        break

                    # Update pagination parameters
                    params["startAt"] = len(all_issues)

                logger.info(f"Successfully fetched {len(all_issues)} bugs from Jira")

                # Convert Pydantic models to dicts for internal processing
                return [issue.model_dump() for issue in all_issues]

        except HTTPException:
            raise
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Jira API error: {e.response.status_code} - {e.response.text}"
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to communicate with Jira API",
            ) from e
        except Exception as e:
            logger.exception(f"Failed to fetch bugs: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve bugs from Jira",
            ) from e

    async def _fetch_issue_links(
        self,
        connection_id: str,
        issue_key: str,
    ) -> list[dict]:
        """
        Fetch issue links for a specific Jira issue.

        Args:
            connection_id: User's Nango connection ID for Jira access
            issue_key: Jira issue key (e.g., "PROJ-123")

        Returns:
            List of issue link objects from Jira

        Raises:
            Exception: If issue links cannot be fetched
        """
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.NANGO_PROXY_URL}/rest/api/3/issue/{issue_key}"

                headers = {
                    "Authorization": f"Bearer {self.nango_secret_key}",
                    "Connection-Id": connection_id,
                    "Provider-Config-Key": "jira",
                    "Content-Type": "application/json",
                }

                params = {
                    "fields": "issuelinks",
                }

                response = await client.get(
                    url,
                    headers=headers,
                    params=params,
                    timeout=10.0,
                )

                response.raise_for_status()
                data = response.json()

                # Extract issuelinks from response
                return data.get("fields", {}).get("issuelinks", [])

        except Exception as e:
            logger.warning(
                f"Failed to fetch issue links for {issue_key}: {e}"
            )
            return []

    async def _fetch_parent_stories(
        self,
        connection_id: str,
        story_keys: list[str],
        story_points_field_id: str | None,
    ) -> list[dict]:
        """
        Fetch parent stories in batch using JQL search.

        Args:
            connection_id: User's Nango connection ID for Jira access
            story_keys: List of story keys to fetch
            story_points_field_id: Custom field ID for story points

        Returns:
            List of parent story issues

        Raises:
            Exception: If stories cannot be fetched
        """
        if not story_keys:
            return []

        try:
            # Build JQL query with all story keys
            keys_jql = ", ".join(story_keys)
            jql = f"key IN ({keys_jql})"

            # Build fields list - always include key and summary
            fields = "key,summary"
            if story_points_field_id:
                fields += f",{story_points_field_id}"

            async with httpx.AsyncClient() as client:
                url = f"{self.NANGO_PROXY_URL}/rest/api/3/search"

                headers = {
                    "Authorization": f"Bearer {self.nango_secret_key}",
                    "Connection-Id": connection_id,
                    "Provider-Config-Key": "jira",
                    "Content-Type": "application/json",
                }

                params = {
                    "jql": jql,
                    "fields": fields,
                    "maxResults": 100,
                }

                logger.info(f"Fetching {len(story_keys)} parent stories")

                response = await client.get(
                    url,
                    headers=headers,
                    params=params,
                    timeout=10.0,
                )

                response.raise_for_status()
                data = response.json()

                # Parse response using Pydantic model
                search_response = JiraSearchResponse(**data)

                logger.info(
                    f"Successfully fetched {len(search_response.issues)} parent stories"
                )

                # Convert to dicts for processing
                return [issue.model_dump() for issue in search_response.issues]

        except Exception as e:
            logger.error(f"Failed to fetch parent stories: {e}")
            return []

    async def get_rework_metrics(
        self,
        connection_id: str,
        board_id: int,
        days: int,
    ) -> ReworkMetricsResponse:
        """
        Calculate rework metrics for a Jira board.

        Fetches real bug data from Jira and calculates rework metrics.
        Results are cached if cache service is available.

        Args:
            connection_id: User's Nango connection ID for Jira access
            board_id: Jira board ID to analyze
            days: Number of days to look back (30, 60, or 90)

        Returns:
            ReworkMetricsResponse: Calculated rework metrics

        Raises:
            HTTPException: If metrics cannot be calculated
        """
        logger.info(
            f"Calculating rework metrics for board {board_id}, "
            f"connection {connection_id}, days {days}"
        )

        # Check cache first if available
        if self.cache:
            cached_metrics = await self.cache.get(board_id, days)
            if cached_metrics:
                logger.info(
                    f"Returning cached metrics for board {board_id}, days {days}"
                )
                return cached_metrics

        # Step 1: Detect story points field
        story_points_field_id = await self._detect_story_points_field(connection_id)
        if not story_points_field_id:
            logger.warning(
                "Story points field not found - metrics will be incomplete"
            )

        # Step 2: Fetch bugs with story points field
        bugs = await self._fetch_bugs(
            connection_id, board_id, days, story_points_field_id
        )
        bugs_linked = len(bugs)

        logger.info(f"Found {bugs_linked} bugs for board {board_id}")

        # Step 3: Fetch issue links for all bugs in parallel
        logger.info("Fetching issue links for bugs...")
        issue_links_tasks = [
            self._fetch_issue_links(connection_id, bug["key"]) for bug in bugs
        ]
        all_issue_links = await asyncio.gather(*issue_links_tasks)

        # Step 4: Extract parent story keys from "is caused by" links
        parent_story_keys = set()
        bug_story_points_map = {}  # Map bug key to its story points

        for bug, issue_links in zip(bugs, all_issue_links):
            bug_key = bug["key"]

            # Get bug story points
            bug_story_points = None
            if story_points_field_id:
                bug_story_points = bug.get("fields", {}).get(story_points_field_id)
            bug_story_points_map[bug_key] = bug_story_points

            # Find "is caused by" links
            for link in issue_links:
                link_type = link.get("type", {})
                if link_type.get("inward") == "is caused by":
                    inward_issue = link.get("inwardIssue", {})
                    parent_key = inward_issue.get("key")
                    if parent_key:
                        parent_story_keys.add(parent_key)

        logger.info(
            f"Found {len(parent_story_keys)} unique parent stories from bug links"
        )

        # Step 5: Fetch parent stories with story points
        parent_stories = []
        if parent_story_keys:
            parent_stories = await self._fetch_parent_stories(
                connection_id, list(parent_story_keys), story_points_field_id
            )

        # Step 6: Calculate metrics
        stories_analyzed = len(parent_stories)
        items_excluded = 0

        # Calculate rework points (sum of bug story points)
        rework_points = 0
        bugs_without_points = 0
        for bug_key, points in bug_story_points_map.items():
            if points is not None and isinstance(points, (int, float)):
                rework_points += int(points)
            else:
                bugs_without_points += 1

        # Calculate story points delivered (sum of unique parent story points)
        story_points_delivered = 0
        stories_without_points = 0
        for story in parent_stories:
            story_points = None
            if story_points_field_id:
                story_points = story.get("fields", {}).get(story_points_field_id)

            if story_points is not None and isinstance(story_points, (int, float)):
                story_points_delivered += int(story_points)
            else:
                stories_without_points += 1

        items_excluded = bugs_without_points + stories_without_points

        # Calculate rework ratio: (rework_points / story_points_delivered) * 100
        rework_ratio = 0
        if story_points_delivered > 0:
            rework_ratio = round((rework_points / story_points_delivered) * 100)

        # Generate warning if needed
        warning = None
        if not story_points_field_id:
            warning = "Story points field not found in Jira. Metrics may be incomplete."
        elif items_excluded > 0:
            warning = (
                f"{items_excluded} items excluded due to missing story points "
                f"({bugs_without_points} bugs, {stories_without_points} stories)"
            )

        response = ReworkMetricsResponse(
            rework_ratio=rework_ratio,
            stories_analyzed=stories_analyzed,
            bugs_linked=bugs_linked,
            story_points_delivered=story_points_delivered,
            rework_points=rework_points,
            items_excluded=items_excluded,
            warning=warning,
        )

        logger.info(
            f"Calculated rework metrics: {bugs_linked} bugs, "
            f"{stories_analyzed} stories, {rework_ratio}% rework ratio, "
            f"{rework_points} rework points / {story_points_delivered} story points delivered"
        )

        # Cache the result if cache service is available
        if self.cache:
            await self.cache.set(board_id, days, response)

        return response


def get_rework_service() -> ReworkService:
    """
    Dependency for getting rework service instance.

    Returns:
        ReworkService: Configured rework service
    """
    return ReworkService()
