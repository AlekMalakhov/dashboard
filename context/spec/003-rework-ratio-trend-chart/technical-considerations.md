# Technical Specification: Rework Ratio Trend Chart

- **Functional Specification:** `context/spec/003-rework-ratio-trend-chart/functional-spec.md`
- **Status:** Approved
- **Author(s):** Claude (AI Technical Architect)

---

## 1. High-Level Technical Approach

This feature adds a historical trend visualization to the existing Rework Ratio Dashboard. The implementation spans both backend and frontend:

**Backend (Python/FastAPI):**
- New endpoint `GET /api/rework/trend` returns weekly rework ratio data
- Reuses existing `ReworkService` patterns with a new method for trend calculation
- Uses efficient "single query + post-processing" approach (2 Jira API calls total)
- Groups issues by week (Monday-Sunday) using Python datetime

**Frontend (React/Next.js):**
- Install Recharts library for chart visualization
- New `ReworkTrendChart` component with embedded time range selector
- Positioned below the existing Rework Ratio Card
- Follows existing patterns for loading/error states and theming

**No database changes required** - all data is fetched from Jira API in real-time.

---

## 2. Proposed Solution & Implementation Plan

### 2.1. Backend: New Pydantic Schemas

**File:** `backend/app/rework/schemas.py`

```python
class WeeklyDataPoint(BaseModel):
    """Single week's rework metrics."""
    week_start_date: str  # ISO 8601 date (YYYY-MM-DD)
    rework_ratio: float   # Percentage (0-100+)
    rework_points: float  # Story points from bugs
    delivered_points: float  # Story points from stories/tasks
    bugs_count: int       # Number of bugs resolved
    stories_count: int    # Number of stories/tasks resolved

class ReworkTrendResponse(BaseModel):
    """Response model for rework trend over time."""
    weeks: list[WeeklyDataPoint]  # Ordered oldest-first
    total_weeks: int
    items_excluded: int
    warning: Optional[str] = None
```

### 2.2. Backend: New API Endpoint

**File:** `backend/app/rework/routes.py`

```python
@router.get("/rework/trend", response_model=ReworkTrendResponse)
async def get_rework_trend(
    board_id: Annotated[int, Query(gt=0)],
    days: Annotated[int, Query(ge=7, le=180)] = 90,
) -> ReworkTrendResponse:
    """Get weekly rework ratio trend for specified time range."""
```

**Validation:**
- `days` must be between 7 and 180 (consistent with main rework API)
- `board_id` must be positive integer
- User must be authenticated (existing auth middleware)

### 2.3. Backend: Service Method

**File:** `backend/app/rework/service.py`

New method `get_rework_trend()` in `ReworkService`:

**Algorithm:**
1. Calculate date range: `start_date = today - days`
2. Fetch ALL bugs resolved in range (reuse `_fetch_bugs()` with modified JQL)
3. Fetch ALL completed stories in range (reuse `_fetch_completed_stories()`)
4. Group issues by week using `resolved` date field
5. For each week, calculate: rework_ratio, rework_points, delivered_points, counts
6. Handle empty weeks: include with 0% ratio, 0 points
7. Return ordered list (oldest week first)

**Week Grouping Logic:**
- Week starts on Monday (ISO standard)
- Use `datetime.isocalendar()` for consistent week calculation
- Handle timezone: use UTC for all calculations

**Reused Code:**
- `_get_board_project_key()` - as-is
- `_detect_story_points_field()` - as-is (with existing cache)
- `_fetch_bugs()` - modify to accept custom date range parameter
- `_fetch_completed_stories()` - modify to accept custom date range parameter
- Error handling patterns - as-is

### 2.4. Frontend: New Dependencies

**File:** `frontend/package.json`

```json
{
  "dependencies": {
    "recharts": "^2.x"
  }
}
```

### 2.5. Frontend: API Client Extension

**File:** `frontend/lib/api.ts`

```typescript
interface WeeklyDataPoint {
  week_start_date: string;
  rework_ratio: number;
  rework_points: number;
  delivered_points: number;
  bugs_count: number;
  stories_count: number;
}

interface ReworkTrendResponse {
  weeks: WeeklyDataPoint[];
  total_weeks: number;
  items_excluded: number;
  warning?: string;
}

export async function getReworkTrend(
  boardId: number,
  days: number = 90
): Promise<ReworkTrendResponse>
```

### 2.6. Frontend: New Component

**File:** `frontend/components/rework-trend-chart.tsx`

**Structure:**
```
<ReworkTrendChart>
  ├── Header: "Work Breakdown"
  ├── Chart Container:
  │   ├── Loading: Skeleton shimmer
  │   ├── Error: Message + Retry button
  │   └── Data: Recharts LineChart
  └── Warning Banner (if items_excluded > 0)
</ReworkTrendChart>
```

**Props:**
- `boardId: number` - Jira board ID
- `timeRange: number` - Time range in days (7-180), passed from parent dashboard
- `className?: string` - Optional CSS class

**Recharts Configuration:**
- `ResponsiveContainer` for auto-sizing
- `LineChart` with `CartesianGrid`, `XAxis`, `YAxis`, `Tooltip`, `Line`
- X-axis: Week labels (e.g., "Jan 6")
- Y-axis: Percentage with automatic scale
- Line: Smooth curve (`type="monotone"`)
- Tooltip: Custom component showing all week details

**Styling:**
- Card wrapper matching existing components
- Dark/light theme support using CSS variables
- Loading skeleton using existing `skeleton-shimmer` class
- Error state matching `ReworkRatioCard` error pattern

### 2.7. Frontend: Dashboard Integration

**File:** `frontend/app/dashboard/page.tsx`

Insert `ReworkTrendChart` between `ReworkRatioCard` and `ContextWidgetsGrid`:

```tsx
{selectedBoard && (
  <>
    <ReworkRatioCard ... />
    <ReworkTrendChart boardId={selectedBoard.id} />  {/* NEW */}
    <ContextWidgetsGrid ... />
  </>
)}
```

**State Management:**
- The chart uses the same time range as the main dashboard (passed via `timeRange` prop)
- Fetches data when `boardId` or `timeRange` changes
- Shares time range with the rework ratio card for consistent data display

---

## 3. Impact and Risk Analysis

### System Dependencies

- **Jira API:** Additional API calls for trend data (2 calls per trend request)
- **Existing ReworkService:** Modifications to support date range parameters
- **Frontend bundle size:** Recharts adds ~100KB gzipped

### Potential Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large data volumes (6 months) | Slow response, memory usage | Pagination already implemented; can add response size limits |
| Jira API rate limits | 429 errors | Reuse single-query approach; can add Redis caching later |
| Empty weeks in data | Chart looks sparse | Show 0% data points to maintain continuity |
| Timezone inconsistencies | Wrong week grouping | Use UTC throughout; parse Jira dates carefully |
| Recharts bundle size | Larger initial load | Library is tree-shakeable; only import needed components |

---

## 4. Testing Strategy

### Playwright End-to-End Tests (Write First)

Write Playwright E2E tests **before** implementing the feature. After implementation, run the tests to verify correctness and debug/fix any bugs that appear.

**Test Scenarios to Write:**
- Chart displays after board selection
- Time range switching (1m/3m/6m) updates chart data
- Tooltip appears on hover with correct week details
- Loading state shows during data fetch
- Error state displays with retry functionality
- Empty data handling (no data for selected period)
- Chart renders correctly in both light and dark themes

**Test File:** `frontend/e2e/rework-trend-chart.spec.ts`
