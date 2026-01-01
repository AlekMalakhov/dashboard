"""Service for calculating rework metrics from Jira data."""

import asyncio
from typing import TYPE_CHECKING

import httpx
from fastapi import HTTPException, status
from loguru import logger

from app.core.jira_client import JiraClient, get_jira_client
from app.rework.schemas import JiraSearchResponse, ReworkMetricsResponse

if TYPE_CHECKING:
    from app.rework.cache import CacheService


class ReworkService:
    """Service for analyzing rework metrics from Jira boards."""

    def __init__(
        self,
        jira_client: JiraClient | None = None,
        cache: "CacheService | None" = None,
    ) -> None:
        """
        Initialize rework service with Jira client.

        Args:
            jira_client: Jira API client (uses singleton if not provided)
            cache: Optional cache service for caching metrics
        """
        self.jira = jira_client or get_jira_client()
        self.cache = cache
        self._story_points_field_cache: str | None = None

    async def _detect_story_points_field(self) -> str | None:
        """
        Auto-detect the story points custom field in Jira.

        Returns:
            Field ID (e.g., "customfield_10016") or None if not found
        """
        # Check cache first
        if self._story_points_field_cache:
            return self._story_points_field_cache

        try:
            logger.info("Detecting story points field...")
            fields = await self.jira.get("/rest/api/3/field")

            # Find field with "Story Points" or "Story point" in name
            for field in fields:
                field_name = field.get("name", "").lower()
                if "story point" in field_name:
                    field_id = field.get("id")
                    logger.info(f"Found story points field: {field.get('name')} ({field_id})")
                    self._story_points_field_cache = field_id
                    return field_id

            logger.warning("Story points field not found")
            return None

        except Exception as e:
            logger.error(f"Failed to detect story points field: {e}")
            return None

    async def _fetch_bugs(
        self,
        board_id: int,
        days: int,
        story_points_field_id: str | None = None,
    ) -> list[dict]:
        """
        Fetch bugs from Jira for a board.

        Args:
            board_id: Jira board ID to query
            days: Number of days to look back
            story_points_field_id: Custom field ID for story points

        Returns:
            List of bug issues from Jira
        """
        try:
            jql = f"project IN boardProjects({board_id}) AND type = Bug AND created >= -{days}d"
            fields = "key,summary,created"
            if story_points_field_id:
                fields += f",{story_points_field_id}"

            logger.info(f"Fetching bugs for board {board_id} with JQL: {jql}")

            all_issues = []
            start_at = 0
            max_results = 100

            while True:
                params = {
                    "jql": jql,
                    "fields": fields,
                    "maxResults": max_results,
                    "startAt": start_at,
                }

                data = await self.jira.get("/rest/api/3/search", params=params)
                search_response = JiraSearchResponse(**data)
                all_issues.extend(search_response.issues)

                logger.info(
                    f"Fetched {len(search_response.issues)} bugs "
                    f"(total: {len(all_issues)} / {search_response.total})"
                )

                if len(all_issues) >= search_response.total:
                    break

                start_at = len(all_issues)

            return [issue.model_dump() for issue in all_issues]

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Jira credentials",
                )
            if e.response.status_code == 403:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access to Jira is forbidden",
                )
            logger.error(f"Jira API error: {e.response.status_code}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to communicate with Jira API",
            )
        except Exception as e:
            logger.exception(f"Failed to fetch bugs: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve bugs from Jira",
            )

    async def _fetch_issue_links(self, issue_key: str) -> list[dict]:
        """Fetch issue links for a specific Jira issue."""
        try:
            data = await self.jira.get(
                f"/rest/api/3/issue/{issue_key}",
                params={"fields": "issuelinks"},
            )
            return data.get("fields", {}).get("issuelinks", [])
        except Exception as e:
            logger.warning(f"Failed to fetch issue links for {issue_key}: {e}")
            return []

    async def _fetch_parent_stories(
        self,
        story_keys: list[str],
        story_points_field_id: str | None,
    ) -> list[dict]:
        """Fetch parent stories in batch using JQL search."""
        if not story_keys:
            return []

        try:
            keys_jql = ", ".join(story_keys)
            jql = f"key IN ({keys_jql})"
            fields = "key,summary"
            if story_points_field_id:
                fields += f",{story_points_field_id}"

            logger.info(f"Fetching {len(story_keys)} parent stories")

            data = await self.jira.get(
                "/rest/api/3/search",
                params={"jql": jql, "fields": fields, "maxResults": 100},
            )

            search_response = JiraSearchResponse(**data)
            logger.info(f"Fetched {len(search_response.issues)} parent stories")

            return [issue.model_dump() for issue in search_response.issues]

        except Exception as e:
            logger.error(f"Failed to fetch parent stories: {e}")
            return []

    async def get_rework_metrics(
        self,
        board_id: int,
        days: int,
    ) -> ReworkMetricsResponse:
        """
        Calculate rework metrics for a Jira board.

        Args:
            board_id: Jira board ID to analyze
            days: Number of days to look back (30, 60, or 90)

        Returns:
            ReworkMetricsResponse: Calculated rework metrics
        """
        logger.info(f"Calculating rework metrics for board {board_id}, days {days}")

        # Check cache first
        if self.cache:
            cached = await self.cache.get(board_id, days)
            if cached:
                logger.info(f"Returning cached metrics for board {board_id}")
                return cached

        # Step 1: Detect story points field
        story_points_field_id = await self._detect_story_points_field()

        # Step 2: Fetch bugs
        bugs = await self._fetch_bugs(board_id, days, story_points_field_id)
        bugs_linked = len(bugs)
        logger.info(f"Found {bugs_linked} bugs")

        # Step 3: Fetch issue links in parallel
        logger.info("Fetching issue links...")
        link_tasks = [self._fetch_issue_links(bug["key"]) for bug in bugs]
        all_links = await asyncio.gather(*link_tasks)

        # Step 4: Extract parent story keys from "is caused by" links
        parent_story_keys = set()
        bug_story_points_map = {}

        for bug, links in zip(bugs, all_links):
            bug_key = bug["key"]
            if story_points_field_id:
                bug_story_points_map[bug_key] = bug.get("fields", {}).get(
                    story_points_field_id
                )
            else:
                bug_story_points_map[bug_key] = None

            for link in links:
                link_type = link.get("type", {})
                if link_type.get("inward") == "is caused by":
                    parent_key = link.get("inwardIssue", {}).get("key")
                    if parent_key:
                        parent_story_keys.add(parent_key)

        logger.info(f"Found {len(parent_story_keys)} unique parent stories")

        # Step 5: Fetch parent stories
        parent_stories = await self._fetch_parent_stories(
            list(parent_story_keys), story_points_field_id
        )

        # Step 6: Calculate metrics
        stories_analyzed = len(parent_stories)

        # Rework points (bug story points)
        rework_points = 0
        bugs_without_points = 0
        for points in bug_story_points_map.values():
            if points is not None and isinstance(points, (int, float)):
                rework_points += int(points)
            else:
                bugs_without_points += 1

        # Story points delivered
        story_points_delivered = 0
        stories_without_points = 0
        for story in parent_stories:
            points = None
            if story_points_field_id:
                points = story.get("fields", {}).get(story_points_field_id)
            if points is not None and isinstance(points, (int, float)):
                story_points_delivered += int(points)
            else:
                stories_without_points += 1

        items_excluded = bugs_without_points + stories_without_points

        # Calculate ratio
        rework_ratio = 0
        if story_points_delivered > 0:
            rework_ratio = round((rework_points / story_points_delivered) * 100)

        # Warning message
        warning = None
        if not story_points_field_id:
            warning = "Story points field not found in Jira"
        elif items_excluded > 0:
            warning = f"{items_excluded} items excluded due to missing story points"

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
            f"Rework metrics: {rework_ratio}% ratio, {bugs_linked} bugs, "
            f"{stories_analyzed} stories"
        )

        # Cache result
        if self.cache:
            await self.cache.set(board_id, days, response)

        return response


def get_rework_service() -> ReworkService:
    """Dependency for getting rework service instance."""
    return ReworkService()
