"""Unit and integration tests for top tickets with linked bugs functionality."""

import pytest
from unittest.mock import AsyncMock, patch

from app.rework.service import ReworkService
from app.rework.schemas import TopTicketsWithBugsResponse


# ---------------------------------------------------------------------------
# Helper: build a minimal bug dict with issuelinks
# ---------------------------------------------------------------------------

def _make_bug(key: str, summary: str, issuelinks: list[dict] | None = None) -> dict:
    return {
        "key": key,
        "fields": {
            "summary": summary,
            "issuelinks": issuelinks or [],
            "issuetype": {"name": "Bug"},
        },
    }


def _caused_by_link(parent_key: str) -> dict:
    return {
        "type": {
            "name": "Caused",
            "inward": "is caused by",
            "outward": "causes",
        },
        "inwardIssue": {"key": parent_key},
    }


def _relates_to_link_inward(ticket_key: str) -> dict:
    return {
        "type": {
            "name": "Relates",
            "inward": "relates to",
            "outward": "relates to",
        },
        "inwardIssue": {"key": ticket_key},
    }


def _relates_to_link_outward(ticket_key: str) -> dict:
    return {
        "type": {
            "name": "Relates",
            "inward": "relates to",
            "outward": "relates to",
        },
        "outwardIssue": {"key": ticket_key},
    }


# ===========================================================================
# Unit tests for _extract_linked_tickets()
# ===========================================================================


class TestExtractLinkedTickets:
    """Unit tests for ReworkService._extract_linked_tickets."""

    def setup_method(self):
        self.service = ReworkService()

    def test_caused_by_link_extraction(self):
        """'is caused by' inward link should be extracted."""
        bug = _make_bug("BUG-1", "crash", [_caused_by_link("PROJ-10")])
        result = self.service._extract_linked_tickets(bug, ["Cause", "Relates"])
        assert result == [("PROJ-10", "is caused by")]

    def test_relates_to_inward(self):
        """'relates to' inward link should be extracted."""
        bug = _make_bug("BUG-2", "ui glitch", [_relates_to_link_inward("PROJ-20")])
        result = self.service._extract_linked_tickets(bug, ["Cause", "Relates"])
        assert result == [("PROJ-20", "relates to")]

    def test_relates_to_outward(self):
        """'relates to' outward link should be extracted."""
        bug = _make_bug("BUG-3", "perf issue", [_relates_to_link_outward("PROJ-30")])
        result = self.service._extract_linked_tickets(bug, ["Cause", "Relates"])
        assert result == [("PROJ-30", "relates to")]

    def test_mixed_link_types(self):
        """Both 'is caused by' and 'relates to' links should be extracted."""
        bug = _make_bug(
            "BUG-4",
            "mixed",
            [
                _caused_by_link("PROJ-1"),
                _relates_to_link_outward("PROJ-2"),
            ],
        )
        result = self.service._extract_linked_tickets(bug, ["Cause", "Relates"])
        keys = {k for k, _ in result}
        assert keys == {"PROJ-1", "PROJ-2"}

    def test_no_issue_links_returns_empty(self):
        """Bug with no issuelinks returns empty list."""
        bug = _make_bug("BUG-5", "orphan", [])
        result = self.service._extract_linked_tickets(bug, ["Cause", "Relates"])
        assert result == []

    def test_no_issuelinks_field_returns_empty(self):
        """Bug with missing issuelinks field returns empty list."""
        bug = {"key": "BUG-6", "fields": {"summary": "no links field"}}
        result = self.service._extract_linked_tickets(bug, ["Cause", "Relates"])
        assert result == []

    def test_deduplication_same_ticket_multiple_link_types(self):
        """Same ticket linked via both 'is caused by' and 'relates to' yields one entry."""
        bug = _make_bug(
            "BUG-7",
            "dup links",
            [
                _caused_by_link("PROJ-99"),
                _relates_to_link_inward("PROJ-99"),
            ],
        )
        result = self.service._extract_linked_tickets(bug, ["Cause", "Relates"])
        keys = [k for k, _ in result]
        assert keys == ["PROJ-99"]
        # First match wins: "is caused by" comes first
        assert result[0][1] == "is caused by"


# ===========================================================================
# Unit test for deduplication in get_top_tickets_with_bugs
# ===========================================================================


@pytest.mark.asyncio
async def test_deduplication_bug_linked_via_multiple_types():
    """A bug linked to the same ticket via both link types is counted only once."""
    service = ReworkService()

    mock_board_response = {"values": [{"key": "PROJ"}]}

    # Bug linked to PROJ-1 via both "caused by" and "relates to"
    mock_bugs_search = {
        "issues": [
            {
                "key": "BUG-1",
                "fields": {
                    "summary": "dup bug",
                    "issuelinks": [
                        _caused_by_link("PROJ-1"),
                        _relates_to_link_inward("PROJ-1"),
                    ],
                    "issuetype": {"name": "Bug"},
                },
            }
        ],
        "nextPageToken": None,
        "isLast": True,
    }

    # Parent ticket details
    mock_parent_search = {
        "issues": [
            {
                "key": "PROJ-1",
                "fields": {
                    "summary": "Parent story",
                    "issuetype": {"name": "Story"},
                },
            }
        ],
        "nextPageToken": None,
        "isLast": True,
    }

    async def mock_get(endpoint: str, params: dict | None = None):
        if "board" in endpoint and "project" in endpoint:
            return mock_board_response
        elif "search/jql" in endpoint:
            jql = params.get("jql", "") if params else ""
            if "type = Bug" in jql:
                return mock_bugs_search
            else:
                return mock_parent_search
        return {}

    with patch.object(service.jira, "get", new=AsyncMock(side_effect=mock_get)):
        result = await service.get_top_tickets_with_bugs(board_id=1, days=30)

    assert isinstance(result, TopTicketsWithBugsResponse)
    assert len(result.tickets) == 1
    assert result.tickets[0].key == "PROJ-1"
    # Bug should be counted only once despite two link types
    assert result.tickets[0].bug_count == 1


# ===========================================================================
# Integration tests with mocked Jira API
# ===========================================================================


@pytest.mark.asyncio
async def test_happy_path_ranked_tickets():
    """Bugs with various link types return tickets ranked by bug count descending."""
    service = ReworkService()

    mock_board_response = {"values": [{"key": "PROJ"}]}

    mock_bugs_search = {
        "issues": [
            # BUG-1 caused by PROJ-1
            {
                "key": "BUG-1",
                "fields": {
                    "summary": "Bug 1",
                    "issuelinks": [_caused_by_link("PROJ-1")],
                    "issuetype": {"name": "Bug"},
                },
            },
            # BUG-2 caused by PROJ-1
            {
                "key": "BUG-2",
                "fields": {
                    "summary": "Bug 2",
                    "issuelinks": [_caused_by_link("PROJ-1")],
                    "issuetype": {"name": "Bug"},
                },
            },
            # BUG-3 relates to PROJ-2
            {
                "key": "BUG-3",
                "fields": {
                    "summary": "Bug 3",
                    "issuelinks": [_relates_to_link_outward("PROJ-2")],
                    "issuetype": {"name": "Bug"},
                },
            },
        ],
        "nextPageToken": None,
        "isLast": True,
    }

    mock_parent_search = {
        "issues": [
            {
                "key": "PROJ-1",
                "fields": {
                    "summary": "Story One",
                    "issuetype": {"name": "Story"},
                },
            },
            {
                "key": "PROJ-2",
                "fields": {
                    "summary": "Task Two",
                    "issuetype": {"name": "Task"},
                },
            },
        ],
        "nextPageToken": None,
        "isLast": True,
    }

    async def mock_get(endpoint: str, params: dict | None = None):
        if "board" in endpoint and "project" in endpoint:
            return mock_board_response
        elif "search/jql" in endpoint:
            jql = params.get("jql", "") if params else ""
            if "type = Bug" in jql:
                return mock_bugs_search
            else:
                return mock_parent_search
        return {}

    with patch.object(service.jira, "get", new=AsyncMock(side_effect=mock_get)):
        result = await service.get_top_tickets_with_bugs(board_id=1, days=30, limit=10)

    assert isinstance(result, TopTicketsWithBugsResponse)
    assert result.total_tickets_with_bugs == 2
    assert result.time_range_days == 30

    # PROJ-1 has 2 bugs, PROJ-2 has 1 bug -> PROJ-1 first
    assert result.tickets[0].key == "PROJ-1"
    assert result.tickets[0].bug_count == 2
    assert result.tickets[0].issue_type == "Story"
    assert result.tickets[1].key == "PROJ-2"
    assert result.tickets[1].bug_count == 1

    # Verify link types
    assert "is caused by" in result.link_types_used
    assert "relates to" in result.link_types_used


@pytest.mark.asyncio
async def test_empty_results_no_bugs():
    """No bugs in the time range returns empty response."""
    service = ReworkService()

    mock_board_response = {"values": [{"key": "PROJ"}]}

    mock_empty_bugs = {
        "issues": [],
        "nextPageToken": None,
        "isLast": True,
    }

    async def mock_get(endpoint: str, params: dict | None = None):
        if "board" in endpoint and "project" in endpoint:
            return mock_board_response
        elif "search/jql" in endpoint:
            return mock_empty_bugs
        return {}

    with patch.object(service.jira, "get", new=AsyncMock(side_effect=mock_get)):
        result = await service.get_top_tickets_with_bugs(board_id=1, days=30)

    assert isinstance(result, TopTicketsWithBugsResponse)
    assert result.tickets == []
    assert result.total_tickets_with_bugs == 0
    assert result.link_types_used == []


@pytest.mark.asyncio
async def test_bugs_with_no_links_excluded():
    """Bugs that have no issue links produce no ticket entries."""
    service = ReworkService()

    mock_board_response = {"values": [{"key": "PROJ"}]}

    mock_bugs_search = {
        "issues": [
            {
                "key": "BUG-1",
                "fields": {
                    "summary": "Orphan bug",
                    "issuelinks": [],
                    "issuetype": {"name": "Bug"},
                },
            },
        ],
        "nextPageToken": None,
        "isLast": True,
    }

    # _fetch_tickets_by_keys should not be called (no keys)
    mock_empty_parent = {
        "issues": [],
        "nextPageToken": None,
        "isLast": True,
    }

    async def mock_get(endpoint: str, params: dict | None = None):
        if "board" in endpoint and "project" in endpoint:
            return mock_board_response
        elif "search/jql" in endpoint:
            jql = params.get("jql", "") if params else ""
            if "type = Bug" in jql:
                return mock_bugs_search
            else:
                return mock_empty_parent
        return {}

    with patch.object(service.jira, "get", new=AsyncMock(side_effect=mock_get)):
        result = await service.get_top_tickets_with_bugs(board_id=1, days=30)

    assert isinstance(result, TopTicketsWithBugsResponse)
    assert result.tickets == []
    assert result.total_tickets_with_bugs == 0


@pytest.mark.asyncio
async def test_response_matches_schema():
    """Verify response conforms to TopTicketsWithBugsResponse schema fields."""
    service = ReworkService()

    mock_board_response = {"values": [{"key": "PROJ"}]}

    mock_bugs_search = {
        "issues": [
            {
                "key": "BUG-1",
                "fields": {
                    "summary": "Schema bug",
                    "issuelinks": [_caused_by_link("PROJ-1")],
                    "issuetype": {"name": "Bug"},
                },
            },
        ],
        "nextPageToken": None,
        "isLast": True,
    }

    mock_parent_search = {
        "issues": [
            {
                "key": "PROJ-1",
                "fields": {
                    "summary": "Schema story",
                    "issuetype": {"name": "Story"},
                },
            },
        ],
        "nextPageToken": None,
        "isLast": True,
    }

    async def mock_get(endpoint: str, params: dict | None = None):
        if "board" in endpoint and "project" in endpoint:
            return mock_board_response
        elif "search/jql" in endpoint:
            jql = params.get("jql", "") if params else ""
            if "type = Bug" in jql:
                return mock_bugs_search
            else:
                return mock_parent_search
        return {}

    with patch.object(service.jira, "get", new=AsyncMock(side_effect=mock_get)):
        result = await service.get_top_tickets_with_bugs(board_id=1, days=30)

    # Validate it serializes cleanly via Pydantic
    data = result.model_dump()
    assert "tickets" in data
    assert "total_tickets_with_bugs" in data
    assert "time_range_days" in data
    assert "link_types_used" in data

    # Validate nested schema
    ticket = data["tickets"][0]
    assert "key" in ticket
    assert "summary" in ticket
    assert "issue_type" in ticket
    assert "bug_count" in ticket
    assert "bugs" in ticket
    assert ticket["bugs"][0]["link_type"] == "is caused by"
