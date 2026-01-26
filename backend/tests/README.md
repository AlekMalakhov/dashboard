# Backend Test Suite

This directory contains the unit tests for the Jira Dashboard backend.

## Test Structure

```
tests/
├── __init__.py
├── test_developer_leaderboard.py   # Tests for developer rework leaderboard
└── README.md                        # This file
```

## Running Tests

### Prerequisites

Install test dependencies:

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Run All Tests

```bash
cd backend
source venv/bin/activate
PYTHONPATH=/Users/amalakhov/jira-dashboard/backend pytest tests/ -v
```

### Run Specific Test File

```bash
cd backend
source venv/bin/activate
PYTHONPATH=/Users/amalakhov/jira-dashboard/backend pytest tests/test_developer_leaderboard.py -v
```

### Run Specific Test

```bash
cd backend
source venv/bin/activate
PYTHONPATH=/Users/amalakhov/jira-dashboard/backend pytest tests/test_developer_leaderboard.py::test_developer_leaderboard_basic -v
```

## Test Coverage

### Developer Leaderboard Tests (`test_developer_leaderboard.py`)

This file contains comprehensive tests for the developer rework leaderboard functionality:

#### `test_developer_leaderboard_basic`
Tests basic functionality:
- Verifies that the endpoint returns correct developer metrics
- Checks that rework_ratio is calculated correctly
- Validates developer details (name, avatar, account ID)

#### `test_developer_leaderboard_attribution`
Tests the critical bug attribution logic:
- Creates bugs linked to stories via "is caused by" relationship
- Verifies that bug points are attributed to the parent story's assignee
- Confirms that the bug fixer is NOT blamed for the bug
- This is the key business logic test

#### `test_developer_leaderboard_min_threshold`
Tests the minimum story threshold filter:
- Creates developers with varying story counts (1, 2, 3, 5 stories)
- Verifies that developers with fewer than 3 stories are excluded
- Checks that `developers_excluded` count is correct
- Validates the warning message

#### `test_developer_leaderboard_sorting`
Tests result sorting:
- Creates developers with different rework ratios
- Verifies that results are sorted by rework_ratio descending (highest first)
- Ensures proper ordering of all developers

## Mock Data Structure

Tests use mock Jira API responses to simulate real-world scenarios without making actual API calls.

### Story Mock Structure

```python
{
    "issues": [
        {
            "key": "PROJ-1",
            "fields": {
                "summary": "Story 1",
                "assignee": {
                    "accountId": "user1",
                    "displayName": "User One",
                    "avatarUrls": {"48x48": "https://avatar.example.com"}
                },
                "resolutiondate": "2024-01-15T10:00:00Z",
                "customfield_10016": 5.0  # story points
            }
        }
    ],
    "nextPageToken": None,
    "isLast": True
}
```

### Bug Mock Structure (with Issue Links)

```python
{
    "issues": [
        {
            "key": "PROJ-100",
            "fields": {
                "summary": "Bug 1",
                "assignee": {
                    "accountId": "user2",
                    "displayName": "User Two"
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
                            "key": "PROJ-1"  # Parent story
                        }
                    }
                ]
            }
        }
    ],
    "nextPageToken": None,
    "isLast": True
}
```

## Key Testing Patterns

### Async Testing

All service methods are async, so tests use `@pytest.mark.asyncio` decorator:

```python
@pytest.mark.asyncio
async def test_example():
    service = ReworkService()
    result = await service.get_developer_rework_leaderboard(board_id=1, days=30)
    assert result is not None
```

### Mocking Jira API

Tests mock the Jira client's `get` method to return predefined responses:

```python
async def mock_get(endpoint: str, params: dict | None = None):
    if "board" in endpoint:
        return mock_board_response
    elif "field" in endpoint:
        return mock_fields_response
    # ... more conditions
    return {}

with patch.object(service.jira, 'get', new=AsyncMock(side_effect=mock_get)):
    result = await service.get_developer_rework_leaderboard(board_id=1, days=30)
```

## Configuration

Test configuration is defined in `pytest.ini`:

- Test discovery patterns
- Async mode settings
- Logging configuration
- Output verbosity

## Best Practices

1. **Always mock external dependencies** - Never make real API calls in unit tests
2. **Test edge cases** - Include tests for empty results, missing data, etc.
3. **Use descriptive test names** - Test names should clearly describe what they test
4. **Keep tests isolated** - Each test should be independent and not rely on others
5. **Verify all important logic** - Test critical business rules thoroughly
