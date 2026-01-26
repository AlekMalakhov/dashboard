"""Unit tests for developer rework leaderboard functionality."""

import pytest
from unittest.mock import AsyncMock, patch

from app.rework.service import ReworkService
from app.rework.schemas import (
    DeveloperLeaderboardResponse,
    DeveloperMetrics,
    DeveloperIssueDetail,
)


@pytest.mark.asyncio
async def test_developer_leaderboard_basic():
    """
    Test basic developer leaderboard calculation.

    Verifies that the endpoint returns correct developer metrics
    and that rework_ratio is calculated correctly.
    """
    # Mock Jira API responses
    mock_board_response = {
        "values": [{"key": "PROJ"}]
    }

    mock_fields_response = [
        {
            "id": "customfield_10016",
            "name": "Story Points",
            "custom": True,
        }
    ]

    mock_stories_response = {
        "issues": [
            {
                "key": "PROJ-1",
                "fields": {
                    "summary": "Story 1",
                    "assignee": {
                        "accountId": "user1",
                        "displayName": "User One",
                        "avatarUrls": {"48x48": "https://avatar1.example.com"}
                    },
                    "resolutiondate": "2024-01-15T10:00:00Z",
                    "customfield_10016": 5.0
                }
            },
            {
                "key": "PROJ-2",
                "fields": {
                    "summary": "Story 2",
                    "assignee": {
                        "accountId": "user1",
                        "displayName": "User One",
                        "avatarUrls": {"48x48": "https://avatar1.example.com"}
                    },
                    "resolutiondate": "2024-01-16T10:00:00Z",
                    "customfield_10016": 8.0
                }
            },
            {
                "key": "PROJ-3",
                "fields": {
                    "summary": "Story 3",
                    "assignee": {
                        "accountId": "user1",
                        "displayName": "User One",
                        "avatarUrls": {"48x48": "https://avatar1.example.com"}
                    },
                    "resolutiondate": "2024-01-17T10:00:00Z",
                    "customfield_10016": 3.0
                }
            }
        ],
        "nextPageToken": None,
        "isLast": True
    }

    mock_bugs_response = {
        "issues": [
            {
                "key": "PROJ-100",
                "fields": {
                    "summary": "Bug 1",
                    "assignee": {
                        "accountId": "user2",
                        "displayName": "User Two",
                        "avatarUrls": {"48x48": "https://avatar2.example.com"}
                    },
                    "resolutiondate": "2024-01-20T10:00:00Z",
                    "customfield_10016": 2.0,
                    "issuelinks": [
                        {
                            "type": {
                                "name": "Caused",
                                "inward": "is caused by",
                                "outward": "causes"
                            },
                            "inwardIssue": {
                                "key": "PROJ-1"
                            }
                        }
                    ]
                }
            }
        ],
        "nextPageToken": None,
        "isLast": True
    }

    # Setup mock service
    service = ReworkService()

    async def mock_get(endpoint: str, params: dict | None = None):
        if "board" in endpoint and "project" in endpoint:
            return mock_board_response
        elif "field" in endpoint:
            return mock_fields_response
        elif "search/jql" in endpoint:
            jql = params.get("jql", "") if params else ""
            if "type = Bug" in jql:
                return mock_bugs_response
            else:
                return mock_stories_response
        return {}

    with patch.object(service.jira, 'get', new=AsyncMock(side_effect=mock_get)):
        result = await service.get_developer_rework_leaderboard(board_id=1, days=30)

    # Assertions
    assert isinstance(result, DeveloperLeaderboardResponse)
    assert result.total_developers == 1
    assert result.developers_excluded == 0
    assert len(result.developers) == 1

    # Check developer metrics
    dev = result.developers[0]
    assert dev.account_id == "user1"
    assert dev.display_name == "User One"
    assert dev.avatar_url == "https://avatar1.example.com"
    assert dev.stories_count == 3
    assert dev.story_points_delivered == 16.0  # 5 + 8 + 3
    assert dev.bugs_count == 1
    assert dev.bug_points == 2.0
    # Rework ratio = (2.0 / 16.0) * 100 = 12.5%
    assert dev.rework_ratio == 12.5


@pytest.mark.asyncio
async def test_developer_leaderboard_attribution():
    """
    Test bug attribution to parent story's assignee.

    Verifies that bug points are attributed to the parent story's assignee,
    NOT the bug's assignee. This is the key business logic test.
    """
    # Mock Jira API responses
    mock_board_response = {
        "values": [{"key": "PROJ"}]
    }

    mock_fields_response = [
        {
            "id": "customfield_10016",
            "name": "Story Points",
            "custom": True,
        }
    ]

    mock_stories_response = {
        "issues": [
            {
                "key": "PROJ-1",
                "fields": {
                    "summary": "Story by Alice",
                    "assignee": {
                        "accountId": "alice",
                        "displayName": "Alice Developer",
                        "avatarUrls": {"48x48": "https://avatar-alice.example.com"}
                    },
                    "resolutiondate": "2024-01-15T10:00:00Z",
                    "customfield_10016": 5.0
                }
            },
            {
                "key": "PROJ-2",
                "fields": {
                    "summary": "Story by Alice 2",
                    "assignee": {
                        "accountId": "alice",
                        "displayName": "Alice Developer",
                        "avatarUrls": {"48x48": "https://avatar-alice.example.com"}
                    },
                    "resolutiondate": "2024-01-16T10:00:00Z",
                    "customfield_10016": 8.0
                }
            },
            {
                "key": "PROJ-3",
                "fields": {
                    "summary": "Story by Alice 3",
                    "assignee": {
                        "accountId": "alice",
                        "displayName": "Alice Developer",
                        "avatarUrls": {"48x48": "https://avatar-alice.example.com"}
                    },
                    "resolutiondate": "2024-01-17T10:00:00Z",
                    "customfield_10016": 3.0
                }
            },
            {
                "key": "PROJ-10",
                "fields": {
                    "summary": "Story by Bob",
                    "assignee": {
                        "accountId": "bob",
                        "displayName": "Bob Fixer",
                        "avatarUrls": {"48x48": "https://avatar-bob.example.com"}
                    },
                    "resolutiondate": "2024-01-15T10:00:00Z",
                    "customfield_10016": 5.0
                }
            },
            {
                "key": "PROJ-11",
                "fields": {
                    "summary": "Story by Bob 2",
                    "assignee": {
                        "accountId": "bob",
                        "displayName": "Bob Fixer",
                        "avatarUrls": {"48x48": "https://avatar-bob.example.com"}
                    },
                    "resolutiondate": "2024-01-16T10:00:00Z",
                    "customfield_10016": 8.0
                }
            },
            {
                "key": "PROJ-12",
                "fields": {
                    "summary": "Story by Bob 3",
                    "assignee": {
                        "accountId": "bob",
                        "displayName": "Bob Fixer",
                        "avatarUrls": {"48x48": "https://avatar-bob.example.com"}
                    },
                    "resolutiondate": "2024-01-17T10:00:00Z",
                    "customfield_10016": 3.0
                }
            }
        ],
        "nextPageToken": None,
        "isLast": True
    }

    mock_bugs_response = {
        "issues": [
            {
                "key": "PROJ-100",
                "fields": {
                    "summary": "Bug fixed by Bob",
                    "assignee": {
                        "accountId": "bob",
                        "displayName": "Bob Fixer",
                        "avatarUrls": {"48x48": "https://avatar-bob.example.com"}
                    },
                    "resolutiondate": "2024-01-20T10:00:00Z",
                    "customfield_10016": 3.0,
                    "issuelinks": [
                        {
                            "type": {
                                "name": "Caused",
                                "inward": "is caused by",
                                "outward": "causes"
                            },
                            "inwardIssue": {
                                "key": "PROJ-1"  # Alice's story
                            }
                        }
                    ]
                }
            }
        ],
        "nextPageToken": None,
        "isLast": True
    }

    # Setup mock service
    service = ReworkService()

    async def mock_get(endpoint: str, params: dict | None = None):
        if "board" in endpoint and "project" in endpoint:
            return mock_board_response
        elif "field" in endpoint:
            return mock_fields_response
        elif "search/jql" in endpoint:
            jql = params.get("jql", "") if params else ""
            if "type = Bug" in jql:
                return mock_bugs_response
            else:
                return mock_stories_response
        return {}

    with patch.object(service.jira, 'get', new=AsyncMock(side_effect=mock_get)):
        result = await service.get_developer_rework_leaderboard(board_id=1, days=30)

    # Assertions
    assert result.total_developers == 2
    assert len(result.developers) == 2

    # Find Alice and Bob in results
    alice = next((d for d in result.developers if d.account_id == "alice"), None)
    bob = next((d for d in result.developers if d.account_id == "bob"), None)

    assert alice is not None, "Alice should be in results"
    assert bob is not None, "Bob should be in results"

    # Alice should have the bug attributed to her (she wrote the story)
    # even though Bob fixed the bug
    assert alice.bugs_count == 1
    assert alice.bug_points == 3.0
    assert alice.story_points_delivered == 16.0  # 5 + 8 + 3
    # Rework ratio = (3.0 / 16.0) * 100 = 18.75% -> rounds to 18.8
    assert alice.rework_ratio == 18.8

    # Bob should have NO bugs attributed to him (he only fixed the bug)
    assert bob.bugs_count == 0
    assert bob.bug_points == 0.0
    assert bob.story_points_delivered == 16.0  # 5 + 8 + 3
    assert bob.rework_ratio == 0.0


@pytest.mark.asyncio
async def test_developer_leaderboard_min_threshold():
    """
    Test minimum story threshold filter.

    Verifies that developers with fewer than 3 stories are excluded
    and that developers_excluded count is correct.
    """
    # Mock Jira API responses
    mock_board_response = {
        "values": [{"key": "PROJ"}]
    }

    mock_fields_response = [
        {
            "id": "customfield_10016",
            "name": "Story Points",
            "custom": True,
        }
    ]

    mock_stories_response = {
        "issues": [
            # Dev1: 1 story (excluded)
            {
                "key": "PROJ-1",
                "fields": {
                    "summary": "Story 1",
                    "assignee": {
                        "accountId": "dev1",
                        "displayName": "Dev One",
                        "avatarUrls": {"48x48": "https://avatar1.example.com"}
                    },
                    "resolutiondate": "2024-01-15T10:00:00Z",
                    "customfield_10016": 5.0
                }
            },
            # Dev2: 2 stories (excluded)
            {
                "key": "PROJ-2",
                "fields": {
                    "summary": "Story 2",
                    "assignee": {
                        "accountId": "dev2",
                        "displayName": "Dev Two",
                        "avatarUrls": {"48x48": "https://avatar2.example.com"}
                    },
                    "resolutiondate": "2024-01-16T10:00:00Z",
                    "customfield_10016": 3.0
                }
            },
            {
                "key": "PROJ-3",
                "fields": {
                    "summary": "Story 3",
                    "assignee": {
                        "accountId": "dev2",
                        "displayName": "Dev Two",
                        "avatarUrls": {"48x48": "https://avatar2.example.com"}
                    },
                    "resolutiondate": "2024-01-17T10:00:00Z",
                    "customfield_10016": 5.0
                }
            },
            # Dev3: 3 stories (included)
            {
                "key": "PROJ-4",
                "fields": {
                    "summary": "Story 4",
                    "assignee": {
                        "accountId": "dev3",
                        "displayName": "Dev Three",
                        "avatarUrls": {"48x48": "https://avatar3.example.com"}
                    },
                    "resolutiondate": "2024-01-18T10:00:00Z",
                    "customfield_10016": 2.0
                }
            },
            {
                "key": "PROJ-5",
                "fields": {
                    "summary": "Story 5",
                    "assignee": {
                        "accountId": "dev3",
                        "displayName": "Dev Three",
                        "avatarUrls": {"48x48": "https://avatar3.example.com"}
                    },
                    "resolutiondate": "2024-01-19T10:00:00Z",
                    "customfield_10016": 3.0
                }
            },
            {
                "key": "PROJ-6",
                "fields": {
                    "summary": "Story 6",
                    "assignee": {
                        "accountId": "dev3",
                        "displayName": "Dev Three",
                        "avatarUrls": {"48x48": "https://avatar3.example.com"}
                    },
                    "resolutiondate": "2024-01-20T10:00:00Z",
                    "customfield_10016": 5.0
                }
            },
            # Dev4: 5 stories (included)
            {
                "key": "PROJ-7",
                "fields": {
                    "summary": "Story 7",
                    "assignee": {
                        "accountId": "dev4",
                        "displayName": "Dev Four",
                        "avatarUrls": {"48x48": "https://avatar4.example.com"}
                    },
                    "resolutiondate": "2024-01-21T10:00:00Z",
                    "customfield_10016": 1.0
                }
            },
            {
                "key": "PROJ-8",
                "fields": {
                    "summary": "Story 8",
                    "assignee": {
                        "accountId": "dev4",
                        "displayName": "Dev Four",
                        "avatarUrls": {"48x48": "https://avatar4.example.com"}
                    },
                    "resolutiondate": "2024-01-22T10:00:00Z",
                    "customfield_10016": 2.0
                }
            },
            {
                "key": "PROJ-9",
                "fields": {
                    "summary": "Story 9",
                    "assignee": {
                        "accountId": "dev4",
                        "displayName": "Dev Four",
                        "avatarUrls": {"48x48": "https://avatar4.example.com"}
                    },
                    "resolutiondate": "2024-01-23T10:00:00Z",
                    "customfield_10016": 3.0
                }
            },
            {
                "key": "PROJ-10",
                "fields": {
                    "summary": "Story 10",
                    "assignee": {
                        "accountId": "dev4",
                        "displayName": "Dev Four",
                        "avatarUrls": {"48x48": "https://avatar4.example.com"}
                    },
                    "resolutiondate": "2024-01-24T10:00:00Z",
                    "customfield_10016": 1.0
                }
            },
            {
                "key": "PROJ-11",
                "fields": {
                    "summary": "Story 11",
                    "assignee": {
                        "accountId": "dev4",
                        "displayName": "Dev Four",
                        "avatarUrls": {"48x48": "https://avatar4.example.com"}
                    },
                    "resolutiondate": "2024-01-25T10:00:00Z",
                    "customfield_10016": 1.0
                }
            }
        ],
        "nextPageToken": None,
        "isLast": True
    }

    mock_bugs_response = {
        "issues": [],
        "nextPageToken": None,
        "isLast": True
    }

    # Setup mock service
    service = ReworkService()

    async def mock_get(endpoint: str, params: dict | None = None):
        if "board" in endpoint and "project" in endpoint:
            return mock_board_response
        elif "field" in endpoint:
            return mock_fields_response
        elif "search/jql" in endpoint:
            jql = params.get("jql", "") if params else ""
            if "type = Bug" in jql:
                return mock_bugs_response
            else:
                return mock_stories_response
        return {}

    with patch.object(service.jira, 'get', new=AsyncMock(side_effect=mock_get)):
        result = await service.get_developer_rework_leaderboard(board_id=1, days=30)

    # Assertions
    # Only dev3 (3 stories) and dev4 (5 stories) should be included
    assert result.total_developers == 2
    assert result.developers_excluded == 2
    assert len(result.developers) == 2
    assert result.warning == "2 developer(s) hidden (fewer than 3 stories)"

    # Check that only developers with 3+ stories are included
    included_devs = {d.account_id for d in result.developers}
    assert "dev3" in included_devs
    assert "dev4" in included_devs
    assert "dev1" not in included_devs
    assert "dev2" not in included_devs


@pytest.mark.asyncio
async def test_developer_leaderboard_sorting():
    """
    Test sorting by rework ratio descending.

    Verifies that results are sorted by rework_ratio descending (highest first).
    """
    # Mock Jira API responses
    mock_board_response = {
        "values": [{"key": "PROJ"}]
    }

    mock_fields_response = [
        {
            "id": "customfield_10016",
            "name": "Story Points",
            "custom": True,
        }
    ]

    mock_stories_response = {
        "issues": [
            # DevA: 10 story points
            {
                "key": "PROJ-1",
                "fields": {
                    "summary": "Story A1",
                    "assignee": {
                        "accountId": "devA",
                        "displayName": "Developer A",
                        "avatarUrls": {"48x48": "https://avatarA.example.com"}
                    },
                    "resolutiondate": "2024-01-15T10:00:00Z",
                    "customfield_10016": 3.0
                }
            },
            {
                "key": "PROJ-2",
                "fields": {
                    "summary": "Story A2",
                    "assignee": {
                        "accountId": "devA",
                        "displayName": "Developer A",
                        "avatarUrls": {"48x48": "https://avatarA.example.com"}
                    },
                    "resolutiondate": "2024-01-16T10:00:00Z",
                    "customfield_10016": 3.0
                }
            },
            {
                "key": "PROJ-3",
                "fields": {
                    "summary": "Story A3",
                    "assignee": {
                        "accountId": "devA",
                        "displayName": "Developer A",
                        "avatarUrls": {"48x48": "https://avatarA.example.com"}
                    },
                    "resolutiondate": "2024-01-17T10:00:00Z",
                    "customfield_10016": 4.0
                }
            },
            # DevB: 20 story points
            {
                "key": "PROJ-10",
                "fields": {
                    "summary": "Story B1",
                    "assignee": {
                        "accountId": "devB",
                        "displayName": "Developer B",
                        "avatarUrls": {"48x48": "https://avatarB.example.com"}
                    },
                    "resolutiondate": "2024-01-15T10:00:00Z",
                    "customfield_10016": 8.0
                }
            },
            {
                "key": "PROJ-11",
                "fields": {
                    "summary": "Story B2",
                    "assignee": {
                        "accountId": "devB",
                        "displayName": "Developer B",
                        "avatarUrls": {"48x48": "https://avatarB.example.com"}
                    },
                    "resolutiondate": "2024-01-16T10:00:00Z",
                    "customfield_10016": 7.0
                }
            },
            {
                "key": "PROJ-12",
                "fields": {
                    "summary": "Story B3",
                    "assignee": {
                        "accountId": "devB",
                        "displayName": "Developer B",
                        "avatarUrls": {"48x48": "https://avatarB.example.com"}
                    },
                    "resolutiondate": "2024-01-17T10:00:00Z",
                    "customfield_10016": 5.0
                }
            },
            # DevC: 10 story points
            {
                "key": "PROJ-20",
                "fields": {
                    "summary": "Story C1",
                    "assignee": {
                        "accountId": "devC",
                        "displayName": "Developer C",
                        "avatarUrls": {"48x48": "https://avatarC.example.com"}
                    },
                    "resolutiondate": "2024-01-15T10:00:00Z",
                    "customfield_10016": 3.0
                }
            },
            {
                "key": "PROJ-21",
                "fields": {
                    "summary": "Story C2",
                    "assignee": {
                        "accountId": "devC",
                        "displayName": "Developer C",
                        "avatarUrls": {"48x48": "https://avatarC.example.com"}
                    },
                    "resolutiondate": "2024-01-16T10:00:00Z",
                    "customfield_10016": 3.0
                }
            },
            {
                "key": "PROJ-22",
                "fields": {
                    "summary": "Story C3",
                    "assignee": {
                        "accountId": "devC",
                        "displayName": "Developer C",
                        "avatarUrls": {"48x48": "https://avatarC.example.com"}
                    },
                    "resolutiondate": "2024-01-17T10:00:00Z",
                    "customfield_10016": 4.0
                }
            }
        ],
        "nextPageToken": None,
        "isLast": True
    }

    mock_bugs_response = {
        "issues": [
            # Bug for DevA: 5 points -> 50% ratio (5/10)
            {
                "key": "PROJ-100",
                "fields": {
                    "summary": "Bug for A",
                    "assignee": {
                        "accountId": "devX",
                        "displayName": "Fixer X",
                        "avatarUrls": {"48x48": "https://avatarX.example.com"}
                    },
                    "resolutiondate": "2024-01-20T10:00:00Z",
                    "customfield_10016": 5.0,
                    "issuelinks": [
                        {
                            "type": {
                                "name": "Caused",
                                "inward": "is caused by",
                                "outward": "causes"
                            },
                            "inwardIssue": {
                                "key": "PROJ-1"
                            }
                        }
                    ]
                }
            },
            # Bug for DevB: 4 points -> 20% ratio (4/20)
            {
                "key": "PROJ-101",
                "fields": {
                    "summary": "Bug for B",
                    "assignee": {
                        "accountId": "devX",
                        "displayName": "Fixer X",
                        "avatarUrls": {"48x48": "https://avatarX.example.com"}
                    },
                    "resolutiondate": "2024-01-21T10:00:00Z",
                    "customfield_10016": 4.0,
                    "issuelinks": [
                        {
                            "type": {
                                "name": "Caused",
                                "inward": "is caused by",
                                "outward": "causes"
                            },
                            "inwardIssue": {
                                "key": "PROJ-10"
                            }
                        }
                    ]
                }
            },
            # Bug for DevC: 1 point -> 10% ratio (1/10)
            {
                "key": "PROJ-102",
                "fields": {
                    "summary": "Bug for C",
                    "assignee": {
                        "accountId": "devX",
                        "displayName": "Fixer X",
                        "avatarUrls": {"48x48": "https://avatarX.example.com"}
                    },
                    "resolutiondate": "2024-01-22T10:00:00Z",
                    "customfield_10016": 1.0,
                    "issuelinks": [
                        {
                            "type": {
                                "name": "Caused",
                                "inward": "is caused by",
                                "outward": "causes"
                            },
                            "inwardIssue": {
                                "key": "PROJ-20"
                            }
                        }
                    ]
                }
            }
        ],
        "nextPageToken": None,
        "isLast": True
    }

    # Setup mock service
    service = ReworkService()

    async def mock_get(endpoint: str, params: dict | None = None):
        if "board" in endpoint and "project" in endpoint:
            return mock_board_response
        elif "field" in endpoint:
            return mock_fields_response
        elif "search/jql" in endpoint:
            jql = params.get("jql", "") if params else ""
            if "type = Bug" in jql:
                return mock_bugs_response
            else:
                return mock_stories_response
        return {}

    with patch.object(service.jira, 'get', new=AsyncMock(side_effect=mock_get)):
        result = await service.get_developer_rework_leaderboard(board_id=1, days=30)

    # Assertions
    assert result.total_developers == 3
    assert len(result.developers) == 3

    # Verify sorting order: highest rework ratio first
    # Expected order: DevA (50%), DevB (20%), DevC (10%)
    assert result.developers[0].account_id == "devA"
    assert result.developers[0].rework_ratio == 50.0

    assert result.developers[1].account_id == "devB"
    assert result.developers[1].rework_ratio == 20.0

    assert result.developers[2].account_id == "devC"
    assert result.developers[2].rework_ratio == 10.0

    # Verify descending order
    for i in range(len(result.developers) - 1):
        assert result.developers[i].rework_ratio >= result.developers[i + 1].rework_ratio
