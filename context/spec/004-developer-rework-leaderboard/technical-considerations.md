# Technical Specification: Developer Rework Leaderboard

- **Functional Specification:** `context/spec/004-developer-rework-leaderboard/functional-spec.md`
- **Status:** Draft
- **Author(s):** [Engineer's Name]

---

## 1. High-Level Technical Approach

This feature adds a "Developer Rework Leaderboard" section to the existing dashboard, displaying per-developer rework metrics with Jira avatars and drill-down capability.

**Backend (Python/FastAPI):**
- Extend the existing `ReworkService` class with a new `get_developer_rework_leaderboard()` method
- Add `assignee` field to existing JQL queries to fetch developer info (name, accountId, avatar URL)
- Implement bug-to-developer attribution via "is caused by" issue links
- Add new endpoint `GET /api/rework/developers`

**Frontend (React/Next.js):**
- Create new `DeveloperLeaderboardTable` component
- Add as a new section on the existing dashboard (after ContextWidgetsGrid)
- Reuse existing patterns: loading skeletons, error states, IssuesModal for drill-down
- Integrate with existing time range selector

**No database changes required** - all data comes from Jira API.

---

## 2. Proposed Solution & Implementation Plan (The "How")

### 2.1 API Contract

**Endpoint:**
```
GET /api/rework/developers?board_id={board_id}&days={days}
```

**Query Parameters:**
| Parameter | Type | Required | Default | Validation |
|-----------|------|----------|---------|------------|
| `board_id` | int | Yes | - | > 0 |
| `days` | int | No | 90 | 7-180 |

**Response Schema:**
```json
{
  "developers": [
    {
      "account_id": "5f7c3b...",
      "display_name": "John Doe",
      "avatar_url": "https://avatar-cdn.atlassian.com/...",
      "rework_ratio": 25.5,
      "stories_count": 12,
      "story_points_delivered": 45.0,
      "bugs_count": 3,
      "bug_points": 11.5,
      "stories": [
        {"key": "PROJ-123", "summary": "...", "story_points": 5.0}
      ],
      "bugs": [
        {"key": "PROJ-456", "summary": "...", "story_points": 2.0, "parent_key": "PROJ-123"}
      ]
    }
  ],
  "total_developers": 8
}
```

**Response Rules:**
- Sorted by `rework_ratio` descending (highest first)
- All developers with at least 1 story are included
- `stories` and `bugs` arrays included for drill-down functionality

---

### 2.2 Backend Changes

#### Files to Modify

| File | Changes |
|------|---------|
| `backend/app/rework/schemas.py` | Add new Pydantic models |
| `backend/app/rework/service.py` | Add new service method |
| `backend/app/rework/routes.py` | Add new endpoint |

#### 2.2.1 New Pydantic Models (`schemas.py`)

```python
class DeveloperIssueDetail(BaseModel):
    """Issue detail for drill-down."""
    key: str
    summary: str
    story_points: Optional[float]
    parent_key: Optional[str] = None  # For bugs: the linked story

class DeveloperMetrics(BaseModel):
    """Metrics for a single developer."""
    account_id: str
    display_name: str
    avatar_url: Optional[str]
    rework_ratio: float
    stories_count: int
    story_points_delivered: float
    bugs_count: int
    bug_points: float
    stories: list[DeveloperIssueDetail]
    bugs: list[DeveloperIssueDetail]

class DeveloperLeaderboardResponse(BaseModel):
    """Leaderboard response."""
    developers: list[DeveloperMetrics]
    total_developers: int
```

#### 2.2.2 Service Method (`service.py`)

Add new method `get_developer_rework_leaderboard()` to `ReworkService`:

```python
async def get_developer_rework_leaderboard(
    self,
    board_id: int,
    days: int,
) -> DeveloperLeaderboardResponse:
    """Calculate rework metrics grouped by developer."""

    # 1. Get project key and story points field (reuse existing methods)
    project_key = await self._get_board_project_key(board_id)
    story_points_field_id = await self._detect_story_points_field()

    # 2. Fetch stories with assignee
    stories = await self._fetch_stories_with_assignee(
        project_key, days, story_points_field_id
    )

    # 3. Fetch bugs with issue links to find parent stories
    bugs_with_parents = await self._fetch_bugs_with_parent_attribution(
        project_key, days, story_points_field_id
    )

    # 4. Group by developer
    developer_data = self._aggregate_by_developer(
        stories, bugs_with_parents, story_points_field_id
    )

    # 5. Calculate ratios and sort
    result = self._calculate_developer_metrics(developer_data)

    return result
```

**Key Helper Methods:**

1. **`_fetch_stories_with_assignee()`** - Modify existing fetch to include assignee field:
   ```python
   fields = f"key,summary,assignee,resolutiondate,{story_points_field_id}"
   ```

2. **`_fetch_bugs_with_parent_attribution()`** - Fetch bugs and their "is caused by" links:
   - Fetch all completed bugs with assignee
   - For each bug, fetch issue links via `/rest/api/3/issue/{key}?fields=issuelinks`
   - Find "is caused by" link and extract parent story key
   - Fetch parent story to get its assignee (for attribution)

3. **`_aggregate_by_developer()`** - Group issues by developer:
   - Stories attributed to their assignee
   - Bugs attributed to the parent story's assignee (not the bug fixer)
   - Build per-developer issue lists for drill-down

4. **`_calculate_developer_metrics()`** - Calculate ratios:
   - Rework ratio = (bug_points / story_points_delivered) × 100
   - Sort by rework_ratio descending

#### 2.2.3 API Endpoint (`routes.py`)

```python
@router.get("/rework/developers", response_model=DeveloperLeaderboardResponse)
async def get_developer_rework_leaderboard(
    board_id: Annotated[int, Query(description="Jira board ID", gt=0)],
    days: Annotated[int, Query(description="Time range in days", ge=7, le=180)] = 90,
) -> DeveloperLeaderboardResponse:
    """Get developer rework leaderboard for a Jira board."""
    service = ReworkService()
    return await service.get_developer_rework_leaderboard(board_id, days)
```

---

### 2.3 Frontend Changes

#### Files to Modify/Create

| File | Changes |
|------|---------|
| `frontend/lib/api.ts` | Add types and API function |
| `frontend/components/developer-leaderboard-table.tsx` | **New** component |
| `frontend/app/dashboard/page.tsx` | Add leaderboard section |

#### 2.3.1 API Client (`api.ts`)

```typescript
export interface DeveloperIssueDetail {
  key: string;
  summary: string;
  story_points: number | null;
  parent_key?: string;
}

export interface DeveloperMetrics {
  account_id: string;
  display_name: string;
  avatar_url: string | null;
  rework_ratio: number;
  stories_count: number;
  story_points_delivered: number;
  bugs_count: number;
  bug_points: number;
  stories: DeveloperIssueDetail[];
  bugs: DeveloperIssueDetail[];
}

export interface DeveloperLeaderboardResponse {
  developers: DeveloperMetrics[];
  total_developers: number;
}

export async function getDeveloperLeaderboard(
  boardId: number,
  days: number
): Promise<DeveloperLeaderboardResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/rework/developers?board_id=${boardId}&days=${days}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch developer leaderboard: ${response.statusText}`);
  }
  return response.json();
}
```

#### 2.3.2 New Component (`developer-leaderboard-table.tsx`)

**Component Structure:**
```
DeveloperLeaderboardTable
├── Card Container (matching existing card styling)
├── Header
│   ├── Title: "Developer Rework Leaderboard"
│   ├── Disclaimer: "This data supports process improvement and coaching conversations."
│   └── Info Tooltip
├── Table
│   ├── Header Row
│   │   └── Columns: Avatar, Name, Rework Ratio, Stories, Points, Bugs, Bug Points
│   └── Body
│       ├── Developer Row (clickable to expand)
│       │   ├── Avatar (48px, rounded)
│       │   ├── Name
│       │   ├── Rework Ratio (color-coded badge)
│       │   └── Metric columns
│       └── Expanded Detail Row (conditionally rendered)
│           ├── Stories sub-table
│           └── Bugs sub-table
├── Loading State (skeleton rows with shimmer)
├── Error State (error message + retry button)
└── Empty State ("No developers with stories in this period")
```

**Props:**
```typescript
interface DeveloperLeaderboardTableProps {
  boardId: number;
  timeRange: number;
}
```

**State Management:**
```typescript
const [data, setData] = useState<DeveloperLeaderboardResponse | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
```

**Color Coding for Rework Ratio:**
| Range | Color | Tailwind Classes |
|-------|-------|------------------|
| 0-10% | Green | `bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200` |
| 11-25% | Blue | `bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200` |
| 26-40% | Amber | `bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200` |
| 41%+ | Red | `bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200` |

**Expandable Row Behavior:**
- Click anywhere on row to toggle expansion
- Chevron icon indicates expand/collapse state
- Smooth CSS transition for expansion animation
- ARIA attributes: `aria-expanded`, `aria-controls`

#### 2.3.3 Dashboard Integration (`page.tsx`)

Add after ContextWidgetsGrid section:

```tsx
{/* Developer Rework Leaderboard */}
{selectedBoard && (
  <DeveloperLeaderboardTable
    boardId={selectedBoard.id}
    timeRange={timeRange}
  />
)}
```

---

## 3. Impact and Risk Analysis

### System Dependencies

- **Jira API**: Uses existing `jira_client.py` - no changes needed
- **Time Range Selector**: Integrates with existing `timeRange` state
- **Dashboard Layout**: Adds new section, no changes to existing components

### Potential Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Performance: Many API calls for issue links** | High | Medium | Batch fetch issue links; consider caching common parent stories |
| **Performance: Large developer list** | Medium | Low | Frontend handles up to ~50 developers; add pagination if needed later |
| **Data accuracy: Bugs without "is caused by" links** | Medium | High | Show warning indicating excluded bugs; document in disclaimer |
| **Data accuracy: Unassigned stories/bugs** | Low | Medium | Skip unassigned issues; include in "excluded" count |
| **Privacy concerns** | Medium | Low | Disclaimer text frames data for improvement purposes |

### Performance Considerations

**Backend:**
- Issue link fetching is the main bottleneck (1 API call per bug)
- Consider parallel fetching with `asyncio.gather()` (batches of 10-20)
- Future optimization: Redis caching with 30-minute TTL

**Frontend:**
- Initial render should handle 20-30 developers smoothly
- Expanded rows render on-demand (not pre-loaded)
- Consider virtualization if >50 developers becomes common

---

## 4. Testing Strategy

### Backend Tests

**Unit Tests (`tests/test_rework_service.py`):**
- `test_developer_leaderboard_basic`: Verify correct calculation with mock data
- `test_developer_leaderboard_attribution`: Bug points attributed to parent story's assignee
- `test_developer_leaderboard_min_threshold`: Developers with <3 stories excluded
- `test_developer_leaderboard_sorting`: Results sorted by rework_ratio descending
- `test_developer_leaderboard_no_assignee`: Unassigned issues handled gracefully
- `test_developer_leaderboard_no_parent_link`: Bugs without "is caused by" excluded

**Integration Tests:**
- `test_developer_leaderboard_endpoint`: Full endpoint test with mocked Jira

### Frontend Tests

**Component Tests (`__tests__/developer-leaderboard-table.test.tsx`):**
- Renders loading skeleton initially
- Renders developer rows after data loads
- Expandable rows toggle on click
- Color coding applied correctly based on rework ratio
- Error state with retry button works
- Empty state shown when no developers meet threshold

**E2E Tests (`e2e/developer-leaderboard.spec.ts`):**
- Leaderboard section visible on dashboard
- Data updates when time range changes
- Expand/collapse row interaction works
- Links to Jira issues work correctly
