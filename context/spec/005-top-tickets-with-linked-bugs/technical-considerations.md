# Technical Specification: Top Tickets with Linked Bugs

- **Functional Specification:** `context/spec/005-top-tickets-with-linked-bugs/functional-spec.md`
- **Status:** Completed
- **Author(s):** AI Assistant

---

## 1. High-Level Technical Approach

This feature adds a new dashboard section displaying stories/tasks ranked by the number of linked bugs. The implementation involves:

1. **Backend**: A new API endpoint in the existing `ReworkService` that queries bugs created within the time range, extracts their linked parent tickets via "is caused by" and "relates to" links, aggregates by parent ticket, and returns the ranked list with embedded bug details.

2. **Frontend**: A new React component (`TopTicketsWithBugsTable`) following the existing `DeveloperLeaderboardTable` pattern, with expandable rows for drill-down and a button group for list size selection.

**Systems Affected:**
- `backend/app/rework/` - New endpoint, service method, and schemas
- `frontend/components/` - New table component
- `frontend/lib/api.ts` - New API function
- `frontend/app/dashboard/page.tsx` - Integration of new component

---

## 2. Proposed Solution & Implementation Plan (The "How")

### 2.1 API Contract

**Endpoint:** `GET /api/rework/top-tickets-with-bugs`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `board_id` | int | Yes | - | Jira board ID |
| `days` | int | No | 30 | Time range (7-180 days) |
| `limit` | int | No | 10 | Number of tickets (10, 20, or 50) |

**Response (200 OK):**
```json
{
  "tickets": [
    {
      "key": "PROJ-123",
      "summary": "Implement user login flow",
      "issue_type": "Story",
      "bug_count": 5,
      "bugs": [
        {
          "key": "PROJ-456",
          "summary": "Login fails on mobile Safari",
          "link_type": "is caused by"
        }
      ]
    }
  ],
  "total_tickets_with_bugs": 42,
  "time_range_days": 30,
  "link_types_used": ["is caused by", "relates to"]
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid Jira credentials
- `403 Forbidden` - No access to board
- `502 Bad Gateway` - Jira API error

### 2.2 Backend Implementation

**File: `backend/app/rework/schemas.py`** - Add new Pydantic models:

```python
class LinkedBugDetail(BaseModel):
    """Detail of a bug linked to a ticket."""
    key: str = Field(..., description="Bug issue key")
    summary: str = Field(..., description="Bug summary/title")
    link_type: str = Field(..., description="Link type: 'is caused by' or 'relates to'")

class TopTicketItem(BaseModel):
    """A ticket with its linked bugs."""
    key: str = Field(..., description="Ticket issue key")
    summary: str = Field(..., description="Ticket summary/title")
    issue_type: str = Field(..., description="Issue type (Story/Task)")
    bug_count: int = Field(..., description="Number of linked bugs", ge=0)
    bugs: list[LinkedBugDetail] = Field(default_factory=list, description="Linked bugs")

class TopTicketsWithBugsResponse(BaseModel):
    """Response for top tickets with linked bugs."""
    tickets: list[TopTicketItem] = Field(default_factory=list)
    total_tickets_with_bugs: int = Field(..., description="Total tickets with at least one bug", ge=0)
    time_range_days: int = Field(..., description="Time range used for filtering")
    link_types_used: list[str] = Field(default_factory=list, description="Link types included")
```

**File: `backend/app/rework/service.py`** - Add new method to `ReworkService`:

```python
async def get_top_tickets_with_bugs(
    self,
    board_id: int,
    days: int = 30,
    limit: int = 10,
) -> TopTicketsWithBugsResponse:
    """Get tickets ranked by number of linked bugs."""

    # 1. Get project key from board
    project_key = await self._get_board_project_key(board_id)

    # 2. Detect story points field (for potential future use)
    story_points_field = await self._detect_story_points_field()

    # 3. Fetch bugs created within time range with issue links
    jql = f'project = "{project_key}" AND type = Bug AND created >= "-{days}d"'
    bugs = await self._fetch_issues_with_links(jql, fields="key,summary,issuelinks,issuetype")

    # 4. Group bugs by linked parent ticket
    ticket_bugs_map: dict[str, list[LinkedBugDetail]] = {}
    link_types = ["is caused by", "relates to"]

    for bug in bugs:
        linked_tickets = self._extract_linked_tickets(bug, link_types)
        for ticket_key, link_type in linked_tickets:
            if ticket_key not in ticket_bugs_map:
                ticket_bugs_map[ticket_key] = []
            # Deduplicate: only add if not already linked
            if not any(b.key == bug["key"] for b in ticket_bugs_map[ticket_key]):
                ticket_bugs_map[ticket_key].append(LinkedBugDetail(
                    key=bug["key"],
                    summary=bug["fields"]["summary"],
                    link_type=link_type
                ))

    # 5. Fetch parent ticket details
    parent_keys = list(ticket_bugs_map.keys())
    parent_tickets = await self._fetch_tickets_by_keys(parent_keys)

    # 6. Build ranked list
    ranked_items = []
    for ticket in parent_tickets:
        key = ticket["key"]
        if key in ticket_bugs_map:
            ranked_items.append(TopTicketItem(
                key=key,
                summary=ticket["fields"]["summary"],
                issue_type=ticket["fields"]["issuetype"]["name"],
                bug_count=len(ticket_bugs_map[key]),
                bugs=ticket_bugs_map[key]
            ))

    # 7. Sort by bug count (descending) and apply limit
    ranked_items.sort(key=lambda x: x.bug_count, reverse=True)

    return TopTicketsWithBugsResponse(
        tickets=ranked_items[:limit],
        total_tickets_with_bugs=len(ranked_items),
        time_range_days=days,
        link_types_used=link_types
    )
```

**File: `backend/app/rework/routes.py`** - Add new endpoint:

```python
@router.get("/rework/top-tickets-with-bugs", response_model=TopTicketsWithBugsResponse)
async def get_top_tickets_with_bugs(
    board_id: Annotated[int, Query(description="Jira board ID", gt=0)],
    days: Annotated[int, Query(description="Time range in days", ge=7, le=180)] = 30,
    limit: Annotated[int, Query(description="Number of tickets to return")] = 10,
) -> TopTicketsWithBugsResponse:
    """Get tickets ranked by number of linked bugs."""
    # Validate limit
    if limit not in [10, 20, 50]:
        limit = 10

    rework_service = ReworkService()
    return await rework_service.get_top_tickets_with_bugs(
        board_id=board_id,
        days=days,
        limit=limit
    )
```

### 2.3 Frontend Implementation

**File: `frontend/lib/api.ts`** - Add new types and function:

```typescript
export interface LinkedBug {
  key: string;
  summary: string;
  link_type: string;
}

export interface TopTicketItem {
  key: string;
  summary: string;
  issue_type: string;
  bug_count: number;
  bugs: LinkedBug[];
}

export interface TopTicketsWithBugsResponse {
  tickets: TopTicketItem[];
  total_tickets_with_bugs: number;
  time_range_days: number;
  link_types_used: string[];
}

export async function getTopTicketsWithBugs(
  boardId: number,
  days: number,
  limit: number
): Promise<TopTicketsWithBugsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/rework/top-tickets-with-bugs?board_id=${boardId}&days=${days}&limit=${limit}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch top tickets: ${response.statusText}`);
  }
  return response.json();
}
```

**File: `frontend/components/top-tickets-with-bugs-table.tsx`** - New component:

- Props: `boardId: number`, `timeRange: number`
- Local state: `limit` (default 10), `expandedRows` (Set with max 1 item for accordion)
- Fetches data on mount and when `boardId`, `timeRange`, or `limit` changes
- Renders table with expandable rows showing linked bugs
- Button group for limit selection (10 | 20 | 50)

**File: `frontend/app/dashboard/page.tsx`** - Integration:

```tsx
import TopTicketsWithBugsTable from '@/components/top-tickets-with-bugs-table';

// Add after existing dashboard sections
<TopTicketsWithBugsTable
  boardId={selectedBoard.id}
  timeRange={timeRange}
/>
```

### 2.4 Link Type Processing Logic

The backend will process issue links as follows:

| Link Type | Jira Direction | Logic |
|-----------|----------------|-------|
| "is caused by" | Bug → Story | Check `inwardIssue` when `inward` contains "caused by" |
| "relates to" | Bidirectional | Check both `inwardIssue` and `outwardIssue` when name contains "relates" |

Deduplication ensures each bug is counted only once per ticket, even if linked via multiple types.

---

## 3. Impact and Risk Analysis

### System Dependencies
- **Jira Cloud API**: Relies on `/rest/api/3/search/jql` for fetching bugs and parent tickets
- **Existing ReworkService**: Reuses `_get_board_project_key()`, `_detect_story_points_field()`, and pagination patterns
- **Dashboard state**: Depends on `timeRange` state from parent component

### Potential Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large number of bugs in time range | Slow API response | Pagination is already implemented; consider adding response time logging |
| Many unique parent tickets to fetch | Multiple Jira API calls | Batch fetch tickets using JQL `key IN (...)` with chunking if needed |
| Orphan bugs (no linked parent) | Bugs not appearing | Expected behavior - only bugs with links are relevant to this feature |
| Rate limiting from Jira API | 429 errors | Existing error handling will surface this; consider caching if frequent |

---

## 4. Testing Strategy

### Backend Tests (`backend/tests/test_top_tickets_with_bugs.py`)

- **Unit tests** for link extraction logic (both "is caused by" and "relates to")
- **Unit tests** for deduplication (bug linked via multiple types counts once)
- **Integration tests** mocking Jira API responses:
  - Happy path: bugs with various link types
  - Empty results: no bugs in time range
  - Edge case: bugs with no links (should be excluded)
  - Error handling: 401, 403, 502 responses

### Frontend Tests

- **Component tests** for `TopTicketsWithBugsTable`:
  - Renders loading state
  - Renders data correctly
  - Expand/collapse row behavior (only one at a time)
  - Limit selector changes trigger refetch
- **Integration test** with mocked API

### Manual Testing
- Verify against real Jira board with known bug-to-story links
- Test all three time ranges (30/60/90 days)
- Test all three limit options (10/20/50)
- Verify expand/collapse accordion behavior
