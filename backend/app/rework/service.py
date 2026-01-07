"""Service for calculating rework metrics from Jira data."""

import asyncio

import httpx
from fastapi import HTTPException, status
from loguru import logger

from app.core.jira_client import JiraClient, get_jira_client
from app.rework.schemas import IssueDetail, JiraSearchResponse, ReworkMetricsResponse


class ReworkService:
    """Service for analyzing rework metrics from Jira boards."""

    def __init__(self, jira_client: JiraClient | None = None) -> None:
        """Initialize rework service with Jira client."""
        self.jira = jira_client or get_jira_client()
        self._story_points_field_cache: str | None = None

    async def _get_board_project_key(self, board_id: int) -> str | None:
        """
        Get the project key associated with a board.

        Args:
            board_id: Jira board ID

        Returns:
            Project key or None if not found
        """
        try:
            data = await self.jira.get(f"/rest/agile/1.0/board/{board_id}/project")
            projects = data.get("values", [])
            if projects:
                project_key = projects[0].get("key")
                logger.info(f"Found project key for board {board_id}: {project_key}")
                return project_key
            logger.warning(f"No project found for board {board_id}")
            return None
        except Exception as e:
            logger.error(f"Failed to get project for board {board_id}: {e}")
            return None

    async def _detect_story_points_field(self) -> str | None:
        """
        Auto-detect the story points custom field in Jira.

        Returns:
            Field ID (e.g., "customfield_10028") or None if not found
        """
        # Check cache first
        if self._story_points_field_cache:
            return self._story_points_field_cache

        try:
            logger.info("Detecting story points field...")
            fields = await self.jira.get("/rest/api/3/field")

            # Find field with exact "Story Points" name first (preferred)
            # Then fall back to "Story point estimate" if not found
            story_points_field = None
            estimate_field = None

            for field in fields:
                field_name = field.get("name", "")
                field_id = field.get("id")

                if field_name == "Story Points":
                    story_points_field = field_id
                    logger.info(f"Found 'Story Points' field: {field_id}")
                elif "story point" in field_name.lower() and not story_points_field:
                    estimate_field = field_id
                    logger.info(f"Found story points estimate field: {field_name} ({field_id})")

            # Prefer "Story Points" over "Story point estimate"
            result = story_points_field or estimate_field
            if result:
                self._story_points_field_cache = result
                return result

            logger.warning("Story points field not found")
            return None

        except Exception as e:
            logger.error(f"Failed to detect story points field: {e}")
            return None

    async def _fetch_bugs(
        self,
        project_key: str,
        days: int,
        story_points_field_id: str | None = None,
    ) -> list[dict]:
        """
        Fetch completed bugs from Jira for a project.

        Only bugs with Story Points assigned are fetched for accurate
        rework point calculation.

        Args:
            project_key: Jira project key to query
            days: Number of days to look back
            story_points_field_id: Custom field ID for story points

        Returns:
            List of completed bug issues from Jira
        """
        try:
            # Fetch bugs that were completed (Done/Closed) in the time period
            # Only include bugs with Story Points assigned
            jql = (
                f"project = {project_key} "
                f"AND type = Bug "
                f"AND status IN (Done, Closed) "
                f'AND "Story Points" IS NOT EMPTY '
                f"AND resolved >= -{days}d"
            )
            fields = "key,summary,created"
            if story_points_field_id:
                fields += f",{story_points_field_id}"

            logger.info(f"Fetching bugs for project {project_key} with JQL: {jql}")

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

                data = await self.jira.get("/rest/api/3/search/jql", params=params)
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
                "/rest/api/3/search/jql",
                params={"jql": jql, "fields": fields, "maxResults": 100},
            )

            search_response = JiraSearchResponse(**data)
            logger.info(f"Fetched {len(search_response.issues)} parent stories")

            return [issue.model_dump() for issue in search_response.issues]

        except Exception as e:
            logger.error(f"Failed to fetch parent stories: {e}")
            return []

    async def _fetch_completed_stories(
        self,
        project_key: str,
        days: int,
        story_points_field_id: str | None = None,
    ) -> list[dict]:
        """
        Fetch all completed stories and tasks from Jira for a project.

        Note: Only Stories and Tasks are included (no Epics, Sub-tasks).
        Only items with Story Points assigned are fetched.

        Args:
            project_key: Jira project key to query
            days: Number of days to look back
            story_points_field_id: Custom field ID for story points

        Returns:
            List of completed story/task issues from Jira
        """
        try:
            # Fetch stories and tasks that were resolved in the time period
            # Only include items with Story Points assigned
            jql = (
                f"project = {project_key} "
                f"AND type IN (Story, Task) "
                f"AND status IN (Done, Closed) "
                f'AND "Story Points" IS NOT EMPTY '
                f"AND resolved >= -{days}d"
            )
            fields = "key,summary,resolved"
            if story_points_field_id:
                fields += f",{story_points_field_id}"

            logger.info(f"Fetching completed stories for project {project_key}")

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

                data = await self.jira.get("/rest/api/3/search/jql", params=params)
                search_response = JiraSearchResponse(**data)
                all_issues.extend(search_response.issues)

                logger.info(
                    f"Fetched {len(search_response.issues)} stories "
                    f"(total: {len(all_issues)} / {search_response.total})"
                )

                if len(all_issues) >= search_response.total:
                    break

                start_at = len(all_issues)

            return [issue.model_dump() for issue in all_issues]

        except Exception as e:
            logger.exception(f"Failed to fetch completed stories: {e}")
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

        # Step 1: Get project key for the board
        project_key = await self._get_board_project_key(board_id)
        if not project_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Could not find project for board {board_id}",
            )

        # Step 2: Detect story points field
        story_points_field_id = await self._detect_story_points_field()

        # Step 3: Fetch bugs and completed stories in parallel
        bugs, completed_stories = await asyncio.gather(
            self._fetch_bugs(project_key, days, story_points_field_id),
            self._fetch_completed_stories(project_key, days, story_points_field_id),
        )
        logger.info(f"Found {len(bugs)} bugs and {len(completed_stories)} completed stories")

        # Step 4: Count all bugs (no link filter - matches standard Jira dashboards)
        bugs_linked = len(bugs)
        logger.info(f"Found {bugs_linked} bugs created in the time period")

        # Step 6: Calculate metrics
        stories_analyzed = len(completed_stories)

        # Rework points (sum of all bug story points)
        rework_points = 0.0
        bugs_without_points = 0
        bug_details: list[IssueDetail] = []
        for bug in bugs:
            bug_key = bug["key"]
            bug_summary = bug.get("fields", {}).get("summary", "")
            points = None
            if story_points_field_id:
                points = bug.get("fields", {}).get(story_points_field_id)
            if points is not None and isinstance(points, (int, float)) and points > 0:
                rework_points += float(points)
                bug_details.append(IssueDetail(key=bug_key, summary=bug_summary, story_points=float(points)))
            else:
                bugs_without_points += 1
                bug_details.append(IssueDetail(key=bug_key, summary=bug_summary, story_points=None))

        # Story points delivered (sum of ALL completed story/task story points)
        story_points_delivered = 0.0
        stories_without_points = 0
        story_details: list[IssueDetail] = []
        for story in completed_stories:
            story_key = story["key"]
            story_summary = story.get("fields", {}).get("summary", "")
            points = None
            if story_points_field_id:
                points = story.get("fields", {}).get(story_points_field_id)
            if points is not None and isinstance(points, (int, float)) and points > 0:
                story_points_delivered += float(points)
                story_details.append(IssueDetail(key=story_key, summary=story_summary, story_points=float(points)))
            else:
                stories_without_points += 1
                story_details.append(IssueDetail(key=story_key, summary=story_summary, story_points=None))

        items_excluded = bugs_without_points + stories_without_points

        # Calculate ratio (rounded to 1 decimal place)
        rework_ratio = 0.0
        if story_points_delivered > 0:
            rework_ratio = round((rework_points / story_points_delivered) * 100, 1)

        # Warning message
        warning = None
        if not story_points_field_id:
            warning = "Story points field not found in Jira"
        elif items_excluded > 0:
            warning = f"{items_excluded} items excluded (no story points)"

        response = ReworkMetricsResponse(
            rework_ratio=rework_ratio,
            stories_analyzed=stories_analyzed,
            bugs_linked=bugs_linked,
            story_points_delivered=story_points_delivered,
            rework_points=rework_points,
            items_excluded=items_excluded,
            warning=warning,
            bugs=bug_details,
            stories=story_details,
        )

        logger.info(
            f"Rework metrics: {rework_ratio}% ratio, {bugs_linked} bugs, "
            f"{stories_analyzed} stories"
        )

        return response


def get_rework_service() -> ReworkService:
    """Dependency for getting rework service instance."""
    return ReworkService()
