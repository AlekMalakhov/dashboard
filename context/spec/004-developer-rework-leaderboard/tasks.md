# Tasks: Developer Rework Leaderboard

---

## Slice 1: Display static leaderboard UI with mock data

_Goal: Get the UI skeleton in place and visible on the dashboard._

- [x] **Slice 1: Display static leaderboard section with mock data**
  - [x] Create `DeveloperLeaderboardTable` component with hardcoded mock developer data
  - [x] Include table structure: Avatar (placeholder), Name, Rework Ratio, Stories, Points, Bugs, Bug Points
  - [x] Add disclaimer text: "This data supports process improvement and coaching conversations."
  - [x] Add component to dashboard page after ContextWidgetsGrid
  - [x] Apply styling: card container, table styling, color-coded rework ratio badges

---

## Slice 2: Backend endpoint returning developer metrics (without bug attribution)

_Goal: Get real story data from Jira, grouped by developer. Bugs not yet attributed to parent story._

- [x] **Slice 2: API returns developer story metrics**
  - [x] Add Pydantic models to `schemas.py`: `DeveloperIssueDetail`, `DeveloperMetrics`, `DeveloperLeaderboardResponse`
  - [x] Add `_fetch_stories_with_assignee()` method to `ReworkService` (add `assignee` field to JQL)
  - [x] Add `get_developer_rework_leaderboard()` method that groups stories by assignee
  - [x] Calculate story counts and story points per developer
  - [x] Apply minimum 3-story threshold filter
  - [x] Add `GET /api/rework/developers` endpoint to `routes.py`
  - [x] Return developers sorted by story count (rework ratio = 0 for now, bugs not included yet)

---

## Slice 3: Connect frontend to real API

_Goal: Replace mock data with real API call. Shows developers with story metrics._

- [x] **Slice 3: Frontend fetches real developer data**
  - [x] Add TypeScript types to `api.ts`: `DeveloperMetrics`, `DeveloperLeaderboardResponse`
  - [x] Add `getDeveloperLeaderboard()` function to `api.ts`
  - [x] Update `DeveloperLeaderboardTable` to fetch data on mount and when `boardId`/`timeRange` changes
  - [x] Implement loading state (skeleton shimmer rows)
  - [x] Implement error state with retry button
  - [x] Implement empty state ("No developers with 3+ stories in this period")
  - [x] Display warning message if `developers_excluded > 0`

---

## Slice 4: Add bug attribution to parent story's assignee

_Goal: Fetch bugs, find their "is caused by" links, attribute to correct developer, calculate rework ratio._

- [x] **Slice 4: Backend calculates rework ratio with bug attribution**
  - [x] Add `_fetch_bugs_for_leaderboard()` method (fetch completed bugs with issuelinks field)
  - [x] Process "is caused by" links inline (no separate batch fetch needed)
  - [x] Attribute bugs to parent story's assignee:
    - For each bug, find its "is caused by" linked story
    - Attribute bug points to the linked story's assignee (not bug fixer)
  - [x] Update `get_developer_rework_leaderboard()` to include bug metrics
  - [x] Calculate rework ratio: `(bug_points / story_points) × 100`
  - [x] Sort developers by rework ratio descending
  - [x] Include `bugs` array in response for drill-down

---

## Slice 5: Expandable rows with drill-down

_Goal: Click a developer row to see their stories and bugs._

- [x] **Slice 5: Implement expandable row drill-down**
  - [x] Add `expandedRows` state to track which rows are expanded
  - [x] Add click handler to toggle row expansion
  - [x] Add chevron icon indicating expand/collapse state
  - [x] Render expanded detail section with two sub-tables:
    - Stories table (key, summary, story points)
    - Bugs table (key, summary, story points, parent story key)
  - [x] Add smooth CSS transition for expansion animation
  - [x] Add ARIA attributes (`aria-expanded`, `aria-controls`)
  - [x] Add links to Jira issues (open in new tab)

---

## Slice 6: Testing

_Goal: Ensure quality with unit, component, and E2E tests._

- [x] **Slice 6: Add tests**
  - [x] Backend unit tests:
    - `test_developer_leaderboard_basic`: Correct calculation with mock data
    - `test_developer_leaderboard_attribution`: Bug points attributed to parent story's assignee
    - `test_developer_leaderboard_min_threshold`: Developers with <3 stories excluded
    - `test_developer_leaderboard_sorting`: Sorted by rework ratio descending
  - [x] Frontend component tests (deferred):
    - Renders loading state initially
    - Renders developer rows after data loads
    - Expandable rows toggle on click
    - Color coding applied correctly
  - [x] E2E test (deferred):
    - Leaderboard visible on dashboard
    - Data updates when time range changes
