# Test Cases: Developer Rework Leaderboard

## Overview

This document outlines the test cases for the Developer Rework Leaderboard feature. Tests are organized by category following the existing E2E test patterns in the codebase.

---

## 1. Backend Unit Tests

**File:** `backend/tests/test_developer_leaderboard.py`

### 1.1 Basic Calculation Tests

| Test ID | Test Name | Description | Input | Expected Output |
|---------|-----------|-------------|-------|-----------------|
| BE-001 | `test_developer_leaderboard_basic` | Verify correct calculation with mock Jira data | 3 developers with stories and bugs | Returns metrics for all 3 developers with correct ratios |
| BE-002 | `test_developer_leaderboard_empty` | Handle case with no stories in time range | Empty Jira response | Returns empty developers list, `total_developers=0` |
| BE-003 | `test_rework_ratio_calculation` | Verify rework ratio formula | Dev with 10 bug points, 50 story points | `rework_ratio = 20.0` |
| BE-004 | `test_zero_story_points_handling` | Handle developer with 0 story points | Dev with 3 stories but 0 total points | `rework_ratio = 0` (avoid division by zero) |

### 1.2 Attribution Tests

| Test ID | Test Name | Description | Input | Expected Output |
|---------|-----------|-------------|-------|-----------------|
| BE-005 | `test_bug_attribution_to_parent_story_assignee` | Bug points attributed to parent story's assignee, not bug fixer | Bug assigned to Dev B, parent story assigned to Dev A | Bug points counted against Dev A |
| BE-006 | `test_story_attribution_by_assignee` | Stories attributed to their assignee | Story assigned to Dev A | Story counted for Dev A only |
| BE-007 | `test_bug_without_parent_link_excluded` | Bugs without "is caused by" link excluded | Bug with no issue links | Bug not counted in any developer's metrics |
| BE-008 | `test_unassigned_story_excluded` | Unassigned stories not counted | Story with `assignee: null` | Story excluded from all metrics |
| BE-009 | `test_unassigned_bug_parent_handling` | Bug linked to unassigned story | Bug linked to story with no assignee | Bug excluded from attribution |

### 1.3 Filtering Tests

| Test ID | Test Name | Description | Input | Expected Output |
|---------|-----------|-------------|-------|-----------------|
| BE-010 | `test_time_range_filtering` | Only stories within time range included | Stories from 30, 60, 100 days ago, days=90 | Only stories from 30, 60 days ago |
| BE-011 | `test_all_developers_with_stories_included` | All developers with at least 1 story included | Dev with 1 story, Dev with 5 stories | Both developers in response |
| BE-012 | `test_developer_with_single_story` | Developer with exactly 1 story included | Dev with 1 story | Dev included in response with correct metrics |

### 1.4 Sorting Tests

| Test ID | Test Name | Description | Input | Expected Output |
|---------|-----------|-------------|-------|-----------------|
| BE-013 | `test_sorted_by_rework_ratio_descending` | Results sorted by rework ratio descending | Devs with ratios: 10%, 30%, 20% | Order: 30%, 20%, 10% |
| BE-014 | `test_equal_ratios_stable_sort` | Stable sort when ratios are equal | Devs with same ratio | Consistent ordering (by name or account_id) |

### 1.5 Response Structure Tests

| Test ID | Test Name | Description | Input | Expected Output |
|---------|-----------|-------------|-------|-----------------|
| BE-015 | `test_response_contains_all_fields` | Response contains all required fields | Valid request | All fields present: account_id, display_name, avatar_url, etc. |
| BE-016 | `test_stories_array_included` | Developer's stories array populated | Dev with 5 stories | `stories` array has 5 items with key, summary, story_points |
| BE-017 | `test_bugs_array_included` | Developer's bugs array populated | Dev with 3 attributed bugs | `bugs` array has 3 items with key, summary, story_points, parent_key |
| BE-018 | `test_avatar_url_nullable` | Handle developers without avatar | Dev without Jira avatar | `avatar_url = null` |

### 1.6 API Endpoint Tests

| Test ID | Test Name | Description | Input | Expected Output |
|---------|-----------|-------------|-------|-----------------|
| BE-019 | `test_endpoint_success` | Endpoint returns 200 with valid params | `board_id=1&days=90` | 200 OK with valid response |
| BE-020 | `test_endpoint_validation_board_id` | Reject invalid board_id | `board_id=0` | 422 Validation Error |
| BE-021 | `test_endpoint_validation_days_min` | Reject days below minimum | `days=6` | 422 Validation Error |
| BE-022 | `test_endpoint_validation_days_max` | Reject days above maximum | `days=181` | 422 Validation Error |
| BE-023 | `test_endpoint_default_days` | Default days=90 when not provided | `board_id=1` (no days param) | Uses 90 days |

---

## 2. Frontend Component Tests

**File:** `frontend/__tests__/developer-leaderboard-table.test.tsx`

### 2.1 Rendering Tests

| Test ID | Test Name | Description | Setup | Assertion |
|---------|-----------|-------------|-------|-----------|
| FE-001 | `renders loading skeleton initially` | Loading state shown before data | Mock pending API | Skeleton rows visible |
| FE-002 | `renders developer rows after data loads` | Table populated with developer data | Mock successful API | Rows with names, avatars, metrics visible |
| FE-003 | `renders disclaimer text` | Disclaimer visible in header | Mock successful API | "This data supports process improvement..." visible |
| FE-004 | `renders table column headers` | All column headers present | Mock successful API | Avatar, Name, Rework Ratio, Stories, Points, Bugs, Bug Points visible |
| FE-005 | `renders empty state` | Empty state when no developers have stories | Mock empty response | "No developers with stories in this period" message visible |
| FE-006 | `renders error state with retry` | Error state with retry button | Mock failed API | Error message and retry button visible |

### 2.2 Avatar Rendering Tests

| Test ID | Test Name | Description | Setup | Assertion |
|---------|-----------|-------------|-------|-----------|
| FE-007 | `renders developer avatar from URL` | Avatar image loaded | Dev with avatar_url | `<img>` with correct src |
| FE-008 | `renders placeholder for missing avatar` | Fallback when no avatar | Dev with `avatar_url: null` | Placeholder icon or initials shown |

### 2.3 Color Coding Tests

| Test ID | Test Name | Description | Setup | Assertion |
|---------|-----------|-------------|-------|-----------|
| FE-009 | `applies green badge for 0-10% ratio` | Green styling for low ratio | Dev with 8% rework ratio | Badge has `bg-emerald-*` classes |
| FE-010 | `applies blue badge for 11-25% ratio` | Blue styling for moderate ratio | Dev with 18% rework ratio | Badge has `bg-blue-*` classes |
| FE-011 | `applies amber badge for 26-40% ratio` | Amber styling for high ratio | Dev with 35% rework ratio | Badge has `bg-amber-*` classes |
| FE-012 | `applies red badge for 41%+ ratio` | Red styling for very high ratio | Dev with 55% rework ratio | Badge has `bg-red-*` classes |

### 2.4 Expandable Row Tests

| Test ID | Test Name | Description | Setup | Assertion |
|---------|-----------|-------------|-------|-----------|
| FE-013 | `expands row on click` | Clicking row shows detail | Mock data, click row | Detail section visible |
| FE-014 | `collapses row on second click` | Clicking again hides detail | Expanded row, click again | Detail section hidden |
| FE-015 | `shows stories in expanded view` | Stories table in detail | Expand row | Stories sub-table visible with keys, summaries, points |
| FE-016 | `shows bugs in expanded view` | Bugs table in detail | Expand row | Bugs sub-table visible with keys, parent keys |
| FE-017 | `chevron icon rotates on expand` | Visual indicator of state | Toggle expansion | Chevron rotation changes |
| FE-018 | `aria-expanded attribute updates` | Accessibility attribute | Toggle expansion | `aria-expanded` toggles true/false |

### 2.5 Data Fetching Tests

| Test ID | Test Name | Description | Setup | Assertion |
|---------|-----------|-------------|-------|-----------|
| FE-019 | `fetches data on mount` | API called when component mounts | Render component | `getDeveloperLeaderboard` called |
| FE-020 | `refetches when boardId changes` | New API call on board change | Change boardId prop | New API call with updated boardId |
| FE-021 | `refetches when timeRange changes` | New API call on time range change | Change timeRange prop | New API call with updated days |
| FE-022 | `retry button refetches data` | Retry works after error | Error state, click retry | API called again |

---

## 3. E2E Tests

**File:** `frontend/e2e/developer-leaderboard.spec.ts`

### 3.1 Display Tests

| Test ID | Test Name | Description | Preconditions | Steps | Expected Result |
|---------|-----------|-------------|---------------|-------|-----------------|
| E2E-001 | `displays leaderboard section on dashboard` | Leaderboard visible after load | Dashboard loads | 1. Navigate to dashboard 2. Wait for board selection | "Developer Rework Leaderboard" section visible |
| E2E-002 | `displays developer rows with metrics` | Developers shown with data | API returns 3 developers | 1. Navigate to dashboard 2. Wait for leaderboard | 3 rows with names, avatars, metrics |
| E2E-003 | `displays disclaimer message` | Disclaimer in header | Dashboard loads | 1. Navigate to dashboard | "This data supports process improvement..." visible |

### 3.2 Time Range Integration Tests

| Test ID | Test Name | Description | Preconditions | Steps | Expected Result |
|---------|-----------|-------------|---------------|-------|-----------------|
| E2E-004 | `updates leaderboard when time range changes` | Data refreshes on range change | Mock different data for 90d vs 30d | 1. Load dashboard (90d) 2. Change to 30d | New developer data displayed |
| E2E-005 | `shows different metrics for different ranges` | Metrics change based on time range | Dev A: different story counts in 90d vs 30d | 1. Load 90d 2. Switch to 30d | Dev A metrics updated accordingly |

### 3.3 Loading State Tests

| Test ID | Test Name | Description | Preconditions | Steps | Expected Result |
|---------|-----------|-------------|---------------|-------|-----------------|
| E2E-006 | `shows loading skeleton during fetch` | Skeleton while loading | Mock API with 2s delay | 1. Navigate to dashboard | Skeleton rows visible, then replaced with data |
| E2E-007 | `shows loading on time range change` | Loading during refetch | Mock API with delay | 1. Load dashboard 2. Change time range | Loading indicator shown during fetch |

### 3.4 Error Handling Tests

| Test ID | Test Name | Description | Preconditions | Steps | Expected Result |
|---------|-----------|-------------|---------------|-------|-----------------|
| E2E-008 | `displays error state on API failure` | Error message shown | Mock 500 response | 1. Navigate to dashboard | Error message and retry button visible |
| E2E-009 | `retry button recovers from error` | Retry works | Mock 500, then 200 | 1. See error 2. Click retry | Data loads successfully |

### 3.5 Empty State Tests

| Test ID | Test Name | Description | Preconditions | Steps | Expected Result |
|---------|-----------|-------------|---------------|-------|-----------------|
| E2E-010 | `shows empty state when no developers have stories` | Empty message | Mock empty developers array | 1. Navigate to dashboard | "No developers with stories in this period" message |

### 3.6 Drill-Down Interaction Tests

| Test ID | Test Name | Description | Preconditions | Steps | Expected Result |
|---------|-----------|-------------|---------------|-------|-----------------|
| E2E-011 | `expands developer row on click` | Row expansion works | Developer data loaded | 1. Click developer row | Detail section expands with stories/bugs |
| E2E-012 | `collapses developer row on second click` | Row collapse works | Row expanded | 1. Click same row again | Detail section collapses |
| E2E-013 | `displays stories in expanded view` | Stories sub-table | Expand row | 1. Click to expand | Stories table with keys, summaries, points |
| E2E-014 | `displays bugs in expanded view` | Bugs sub-table | Expand row | 1. Click to expand | Bugs table with keys, parent story links |
| E2E-015 | `Jira links open in new tab` | Links work | Expand row | 1. Click Jira issue link | Opens Jira in new tab |

### 3.7 Sorting Tests

| Test ID | Test Name | Description | Preconditions | Steps | Expected Result |
|---------|-----------|-------------|---------------|-------|-----------------|
| E2E-016 | `developers sorted by rework ratio descending` | Default sort order | Devs with ratios: 10%, 30%, 20% | 1. Load dashboard | Order: 30% first, then 20%, then 10% |

### 3.8 Accessibility Tests

| Test ID | Test Name | Description | Preconditions | Steps | Expected Result |
|---------|-----------|-------------|---------------|-------|-----------------|
| E2E-017 | `keyboard navigation works` | Tab through rows | Dashboard loaded | 1. Tab through table | Focus moves through rows, Enter expands |
| E2E-018 | `screen reader announces row content` | ARIA labels correct | Dashboard loaded | 1. Use screen reader | Developer name, metrics announced |

---

## 4. Mock Data Requirements

### 4.1 Developer Leaderboard Mock Data

```typescript
// Add to frontend/e2e/fixtures/mock-data.ts

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

export function createDeveloperMetrics(overrides: Partial<DeveloperMetrics> = {}): DeveloperMetrics {
  return {
    account_id: '5f7c3b1234567890',
    display_name: 'John Doe',
    avatar_url: 'https://avatar-cdn.atlassian.com/johndoe',
    rework_ratio: 15.5,
    stories_count: 8,
    story_points_delivered: 42,
    bugs_count: 2,
    bug_points: 6.5,
    stories: [
      { key: 'PROJ-101', summary: 'Implement user authentication', story_points: 8 },
      { key: 'PROJ-102', summary: 'Add password reset flow', story_points: 5 },
    ],
    bugs: [
      { key: 'PROJ-201', summary: 'Login fails on Safari', story_points: 3, parent_key: 'PROJ-101' },
    ],
    ...overrides,
  };
}

export function createDeveloperLeaderboardResponse(
  overrides: Partial<DeveloperLeaderboardResponse> = {}
): DeveloperLeaderboardResponse {
  return {
    developers: [
      createDeveloperMetrics({ display_name: 'Alice Smith', rework_ratio: 25.0 }),
      createDeveloperMetrics({ display_name: 'Bob Johnson', rework_ratio: 18.5, account_id: '5f7c3b0987654321' }),
      createDeveloperMetrics({ display_name: 'Carol White', rework_ratio: 8.2, account_id: '5f7c3b1122334455' }),
    ],
    total_developers: 3,
    ...overrides,
  };
}

// Pre-built leaderboard data
export const LEADERBOARD_DATA_DEFAULT = createDeveloperLeaderboardResponse();

export const LEADERBOARD_DATA_EMPTY = createDeveloperLeaderboardResponse({
  developers: [],
  total_developers: 0,
});
```

### 4.2 API Mock Function

```typescript
// Add to frontend/e2e/fixtures/api-mocks.ts

export async function mockDeveloperLeaderboardApi(
  page: Page,
  data: DeveloperLeaderboardResponse = LEADERBOARD_DATA_DEFAULT,
  options: MockApiOptions & { boardId?: number | string; days?: number | string } = {}
): Promise<void> {
  const { delay = 0, status = 200, boardId, days } = options;

  await page.route(/\/api\/rework\/developers\?/, async (route) => {
    const url = route.request().url();

    if (boardId !== undefined && !url.includes(`board_id=${boardId}`)) {
      return route.fallback();
    }
    if (days !== undefined && !url.includes(`days=${days}`)) {
      return route.fallback();
    }

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(status === 200 ? data : { error: 'Internal server error' }),
    });
  });
}

// Update mockAllApis to include leaderboard
export async function mockAllApis(
  page: Page,
  options: {
    boards?: Board[];
    metrics?: ReworkMetrics;
    trendData?: TrendData;
    leaderboardData?: DeveloperLeaderboardResponse;
  } = {}
): Promise<void> {
  const { boards, metrics, trendData, leaderboardData } = options;

  await Promise.all([
    mockBoardsApi(page, boards),
    mockReworkMetricsApi(page, metrics),
    mockTrendApi(page, trendData),
    mockDeveloperLeaderboardApi(page, leaderboardData),
  ]);
}
```

### 4.3 Page Object Methods

```typescript
// Add to frontend/e2e/pages/dashboard.page.ts

// Add locators to constructor:
readonly leaderboardSection: Locator;
readonly leaderboardTable: Locator;
readonly leaderboardDisclaimer: Locator;
readonly leaderboardRows: Locator;

// In constructor:
this.leaderboardSection = page.getByRole('region', { name: /developer rework leaderboard/i });
this.leaderboardTable = this.leaderboardSection.locator('table');
this.leaderboardDisclaimer = this.leaderboardSection.getByText(/this data supports process improvement/i);
this.leaderboardRows = this.leaderboardTable.locator('tbody tr');

// Add methods:

/**
 * Wait for developer leaderboard to load
 */
async waitForLeaderboardLoaded(): Promise<void> {
  await expect(this.leaderboardSection).toBeVisible();
  await expect(this.leaderboardSection.locator('[class*="skeleton"]')).not.toBeVisible({ timeout: 5000 });
}

/**
 * Get number of developer rows
 */
async getDeveloperRowCount(): Promise<number> {
  return await this.leaderboardRows.count();
}

/**
 * Click on a developer row by name
 */
async clickDeveloperRow(developerName: string): Promise<void> {
  await this.leaderboardSection.getByText(developerName).click();
}

/**
 * Check if developer row is expanded
 */
async isDeveloperRowExpanded(developerName: string): Promise<boolean> {
  const row = this.leaderboardSection.locator(`tr:has-text("${developerName}")`);
  const expanded = await row.getAttribute('aria-expanded');
  return expanded === 'true';
}

/**
 * Get developer's expanded detail section
 */
getDeveloperDetailSection(developerName: string): Locator {
  return this.leaderboardSection.locator(`[aria-labelledby*="${developerName}"]`);
}

/**
 * Verify leaderboard empty state
 */
async expectLeaderboardEmpty(): Promise<void> {
  await expect(
    this.leaderboardSection.getByText(/no developers with stories in this period/i)
  ).toBeVisible();
}

/**
 * Get developer's rework ratio badge text
 */
async getDeveloperReworkRatio(developerName: string): Promise<string> {
  const row = this.leaderboardSection.locator(`tr:has-text("${developerName}")`);
  const badge = row.locator('[class*="badge"], [data-testid="rework-ratio"]');
  return await badge.textContent() ?? '';
}
```

---

## 5. Test Data Scenarios

### 5.1 Standard Scenarios

| Scenario | Developers | Rework Ratios |
|----------|------------|---------------|
| Default | Alice (25%), Bob (18.5%), Carol (8.2%) | Mixed |
| High Rework Team | Dev1 (55%), Dev2 (42%), Dev3 (38%) | All high |
| Low Rework Team | Dev1 (5%), Dev2 (8%), Dev3 (12%) | All low |
| Single Developer | Alice (15%) | - |
| Empty | None | - |

### 5.2 Edge Cases

| Scenario | Description | Expected Behavior |
|----------|-------------|-------------------|
| No stories in time range | No developers have stories | Empty state shown |
| Developer with 0% rework | No bugs attributed | 0% shown with green badge |
| Developer with 100% rework | Bug points = story points | 100% shown with red badge |
| Developer with 1 story | Single story in time range | Developer shown with correct metrics |
| Missing avatar | Developer has no Jira avatar | Placeholder shown |
| Very long name | 50+ character display name | Name truncated with ellipsis |
| Unicode name | Name with emoji/special chars | Rendered correctly |

---

## 6. Implementation Checklist

### Backend
- [ ] Add Pydantic models to `schemas.py`
- [ ] Implement `get_developer_rework_leaderboard()` in `service.py`
- [ ] Add endpoint to `routes.py`
- [ ] Write unit tests in `test_developer_leaderboard.py`

### Frontend
- [ ] Add TypeScript types to `api.ts`
- [ ] Add API function to `api.ts`
- [ ] Create `DeveloperLeaderboardTable` component
- [ ] Add component to dashboard
- [ ] Write component tests

### E2E
- [ ] Add mock data to `fixtures/mock-data.ts`
- [ ] Add API mock to `fixtures/api-mocks.ts`
- [ ] Add page object methods to `dashboard.page.ts`
- [ ] Create `developer-leaderboard.spec.ts`
