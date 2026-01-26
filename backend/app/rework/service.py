"""Service for calculating rework metrics from Jira data."""

import asyncio
from datetime import datetime, timedelta

import httpx
from fastapi import HTTPException, status
from loguru import logger

from app.core.jira_client import JiraClient, get_jira_client
from app.rework.schemas import IssueDetail, JiraSearchResponse, ReworkMetricsResponse, ReworkTrendResponse, WeeklyDataPoint


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
            # Fetch bugs that were completed in the time period
            # Only include bugs with Story Points assigned
            # Using statusCategory = Done to capture all "done" statuses (Done, Closed, Resolved, etc.)
            jql = (
                f"project = {project_key} "
                f"AND type = Bug "
                f"AND statusCategory = Done "
                f'AND "Story Points" IS NOT EMPTY '
                f'AND resolved >= "-{days}d"'
            )
            fields = "key,summary,created,resolutiondate"
            if story_points_field_id:
                fields += f",{story_points_field_id}"

            logger.info(f"Fetching bugs for project {project_key} with JQL: {jql}")

            all_issues = []
            max_results = 100  # Jira API max per request
            next_page_token: str | None = None

            while True:
                params: dict = {
                    "jql": jql,
                    "fields": fields,
                    "maxResults": max_results,
                }
                if next_page_token:
                    params["nextPageToken"] = next_page_token

                data = await self.jira.get("/rest/api/3/search/jql", params=params)
                search_response = JiraSearchResponse(**data)
                all_issues.extend(search_response.issues)

                logger.info(
                    f"Fetched {len(search_response.issues)} bugs "
                    f"(accumulated: {len(all_issues)}, isLast: {search_response.isLast})"
                )

                if search_response.isLast:
                    break

                next_page_token = search_response.nextPageToken

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

            all_issues = []
            max_results = 100  # Jira API max per request
            next_page_token: str | None = None

            while True:
                params: dict = {
                    "jql": jql,
                    "fields": fields,
                    "maxResults": max_results,
                }
                if next_page_token:
                    params["nextPageToken"] = next_page_token

                data = await self.jira.get("/rest/api/3/search/jql", params=params)
                search_response = JiraSearchResponse(**data)
                all_issues.extend(search_response.issues)

                logger.info(
                    f"Fetched {len(search_response.issues)} parent stories "
                    f"(accumulated: {len(all_issues)}, isLast: {search_response.isLast})"
                )

                if search_response.isLast:
                    break

                next_page_token = search_response.nextPageToken

            return [issue.model_dump() for issue in all_issues]

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
            # Using statusCategory = Done to capture all "done" statuses (Done, Closed, Resolved, etc.)
            jql = (
                f"project = {project_key} "
                f"AND type IN (Story, Task) "
                f"AND statusCategory = Done "
                f'AND "Story Points" IS NOT EMPTY '
                f'AND resolved >= "-{days}d"'
            )
            fields = "key,summary,resolutiondate"
            if story_points_field_id:
                fields += f",{story_points_field_id}"

            logger.info(f"Fetching completed stories for project {project_key} with JQL: {jql}")

            all_issues = []
            max_results = 100  # Jira API max per request
            next_page_token: str | None = None

            while True:
                params: dict = {
                    "jql": jql,
                    "fields": fields,
                    "maxResults": max_results,
                }
                if next_page_token:
                    params["nextPageToken"] = next_page_token

                data = await self.jira.get("/rest/api/3/search/jql", params=params)
                search_response = JiraSearchResponse(**data)
                all_issues.extend(search_response.issues)

                logger.info(
                    f"Fetched {len(search_response.issues)} stories "
                    f"(accumulated: {len(all_issues)}, isLast: {search_response.isLast})"
                )

                if search_response.isLast:
                    break

                next_page_token = search_response.nextPageToken

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

    @staticmethod
    def _get_week_start(date_str: str) -> str:
        """
        Get Monday (start of week) for a given date string.

        Uses ISO week definition where Monday is the first day of the week.

        Args:
            date_str: ISO 8601 date string (e.g., "2024-01-15T10:30:00Z")

        Returns:
            ISO format date string for Monday of that week (YYYY-MM-DD)
        """
        # Parse the date string (handle various ISO formats)
        if "T" in date_str:
            date_obj = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        else:
            date_obj = datetime.fromisoformat(date_str)

        # Get Monday of the week (weekday() returns 0 for Monday, 6 for Sunday)
        days_since_monday = date_obj.weekday()
        monday = date_obj - timedelta(days=days_since_monday)

        return monday.strftime("%Y-%m-%d")

    def _group_issues_by_week(
        self,
        issues: list[dict],
        story_points_field_id: str | None,
    ) -> dict[str, tuple[float, int]]:
        """
        Group issues by week start date and sum story points.

        Args:
            issues: List of Jira issues with 'resolved' field
            story_points_field_id: Custom field ID for story points

        Returns:
            Dict mapping week_start_date to (total_story_points, issue_count)
        """
        weeks: dict[str, tuple[float, int]] = {}

        for issue in issues:
            # Get resolved date (Jira REST API uses "resolutiondate" field name)
            resolved_date = issue.get("fields", {}).get("resolutiondate")
            if not resolved_date:
                continue

            # Get week start date
            week_start = self._get_week_start(resolved_date)

            # Get story points
            points = 0.0
            if story_points_field_id:
                points_value = issue.get("fields", {}).get(story_points_field_id)
                if points_value is not None and isinstance(points_value, (int, float)):
                    points = float(points_value)

            # Add to week totals
            if week_start in weeks:
                current_points, current_count = weeks[week_start]
                weeks[week_start] = (current_points + points, current_count + 1)
            else:
                weeks[week_start] = (points, 1)

        return weeks

    def _generate_all_weeks(self, start_date: datetime, end_date: datetime) -> list[str]:
        """
        Generate all Monday dates between start and end date (inclusive).

        Args:
            start_date: Start of date range
            end_date: End of date range

        Returns:
            List of ISO format date strings for all Mondays in range
        """
        # Get Monday of the start week
        days_since_monday = start_date.weekday()
        current_monday = start_date - timedelta(days=days_since_monday)

        weeks = []
        while current_monday <= end_date:
            weeks.append(current_monday.strftime("%Y-%m-%d"))
            current_monday += timedelta(days=7)

        return weeks

    async def get_rework_trend(
        self,
        board_id: int,
        days: int,
    ) -> ReworkTrendResponse:
        """
        Calculate weekly rework ratio trend for a Jira board.

        Args:
            board_id: Jira board ID to analyze
            days: Number of days to look back (7-180)

        Returns:
            ReworkTrendResponse: Weekly trend data with metrics
        """
        logger.info(f"Calculating rework trend for board {board_id}, days {days}")

        # Step 1: Get project key for the board
        project_key = await self._get_board_project_key(board_id)
        if not project_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Could not find project for board {board_id}",
            )

        # Step 2: Detect story points field
        story_points_field_id = await self._detect_story_points_field()

        # Step 3: Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        # Align start_date to Monday of that week for complete week data
        # This ensures displayed weeks have all their data fetched
        days_since_monday = start_date.weekday()
        start_date = start_date - timedelta(days=days_since_monday)
        # Recalculate days to include the full start week
        # Add 1 day to account for time-of-day precision in Jira's relative date queries
        fetch_days = (end_date - start_date).days + 1

        logger.info(f"Fetching data from {start_date.date()} to {end_date.date()}")

        # Step 4: Fetch all bugs and stories in parallel
        bugs, stories = await asyncio.gather(
            self._fetch_bugs(project_key, fetch_days, story_points_field_id),
            self._fetch_completed_stories(project_key, fetch_days, story_points_field_id),
        )
        logger.info(f"Found {len(bugs)} bugs and {len(stories)} completed stories")

        # Step 5: Group by week
        bugs_by_week = self._group_issues_by_week(bugs, story_points_field_id)
        stories_by_week = self._group_issues_by_week(stories, story_points_field_id)

        # Step 6: Generate all weeks in range
        all_weeks = self._generate_all_weeks(start_date, end_date)

        # Step 7: Calculate metrics per week
        weekly_data: list[WeeklyDataPoint] = []
        total_items_excluded = 0

        for week_start in all_weeks:
            # Get data for this week (default to 0 points and 0 count if no data)
            rework_points, bugs_count = bugs_by_week.get(week_start, (0.0, 0))
            delivered_points, stories_count = stories_by_week.get(week_start, (0.0, 0))

            # Calculate rework ratio
            rework_ratio = 0.0
            if delivered_points > 0:
                rework_ratio = (rework_points / delivered_points) * 100

            weekly_data.append(
                WeeklyDataPoint(
                    week_start_date=week_start,
                    rework_ratio=round(rework_ratio, 1),
                    rework_points=rework_points,
                    delivered_points=delivered_points,
                    bugs_count=bugs_count,
                    stories_count=stories_count,
                )
            )

        # Step 8: Check for items without story points
        bugs_without_points = sum(
            1 for bug in bugs if not bug.get("fields", {}).get(story_points_field_id)
        )
        stories_without_points = sum(
            1 for story in stories if not story.get("fields", {}).get(story_points_field_id)
        )
        total_items_excluded = bugs_without_points + stories_without_points

        # Warning message
        warning = None
        if not story_points_field_id:
            warning = "Story points field not found in Jira"
        elif total_items_excluded > 0:
            warning = f"{total_items_excluded} items excluded (no story points)"

        response = ReworkTrendResponse(
            weeks=weekly_data,
            total_weeks=len(weekly_data),
            items_excluded=total_items_excluded,
            warning=warning,
        )

        logger.info(f"Generated {len(weekly_data)} weeks of trend data for board {board_id}")

        return response


def get_rework_service() -> ReworkService:
    """Dependency for getting rework service instance."""
    return ReworkService()
