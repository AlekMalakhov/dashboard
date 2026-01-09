# Tasks: Rework Ratio Trend Chart

## Slice 1: Playwright E2E Test Setup

Write E2E tests before implementation (test-first approach).

- [x] **Slice 1: Write Playwright E2E tests for trend chart**
  - [x] Create `frontend/e2e/rework-trend-chart.spec.ts` test file
  - [x] Test: Chart container displays after board selection
  - [x] Test: Time range selector shows 1m/3m/6m options with 3m default
  - [x] Test: Switching time range triggers data reload
  - [x] Test: Loading skeleton displays during fetch
  - [x] Test: Error state with retry button on API failure
  - [x] Test: Tooltip appears on chart hover

---

## Slice 2: Static Chart UI with Mock Data

Display the chart component with hardcoded data to verify UI before backend work.

- [x] **Slice 2: Static trend chart component with mock data**
  - [x] Install Recharts dependency (`npm install recharts`)
  - [x] Create `ReworkTrendChart` component with hardcoded weekly data
  - [x] Add line chart with X-axis (weeks), Y-axis (percentage)
  - [x] Add time range selector (1m/3m/6m toggle buttons)
  - [x] Style to match existing dashboard theme (light/dark modes)
  - [x] Add chart to dashboard page below `ReworkRatioCard`
  - [x] Verify chart renders correctly with mock data

---

## Slice 3: Backend API Endpoint with Mock Response

Create the API endpoint returning mock data to verify end-to-end flow.

- [x] **Slice 3: Working API endpoint with mock response**
  - [x] Add `WeeklyDataPoint` and `ReworkTrendResponse` schemas to `schemas.py`
  - [x] Create `GET /api/rework/trend` endpoint in `routes.py`
  - [x] Return hardcoded mock weekly data from endpoint
  - [x] Validate `months` parameter (1, 3, or 6)
  - [x] Add `getReworkTrend()` function to frontend `api.ts`
  - [x] Connect chart component to real API (replace mock data)
  - [x] Verify end-to-end flow works with mock backend data

---

## Slice 4: Backend Service with Real Jira Data

Implement the actual trend calculation using Jira API.

- [x] **Slice 4: Real trend data from Jira**
  - [x] Add `get_rework_trend()` method to `ReworkService`
  - [x] Modify `_fetch_bugs()` to accept custom date range parameter
  - [x] Modify `_fetch_completed_stories()` to accept custom date range parameter
  - [x] Implement week grouping logic (Monday-Sunday, ISO calendar)
  - [x] Calculate rework ratio, points, and counts per week
  - [x] Handle empty weeks (include with 0% ratio)
  - [x] Return ordered list (oldest week first)
  - [x] Verify dashboard shows real trend data

---

## Slice 5: Tooltip Interactivity

Add hover tooltip showing week details.

- [x] **Slice 5: Chart tooltip with week details**
  - [x] Create custom Recharts tooltip component
  - [x] Display week label (e.g., "Week of Jan 6, 2026")
  - [x] Display rework ratio percentage
  - [x] Display rework points and delivered points
  - [x] Style tooltip to match dashboard theme
  - [x] Verify tooltip appears/disappears on hover

---

## Slice 6: Loading and Error States

Add loading skeleton and error handling with retry.

- [x] **Slice 6: Loading and error state handling**
  - [x] Add loading skeleton to chart component (shimmer animation)
  - [x] Add error state with message and "Retry" button
  - [x] Handle API errors gracefully (401, 500, network errors)
  - [x] Verify loading state shows during fetch
  - [x] Verify error state with retry works correctly

---

## Slice 7: Run E2E Tests and Fix Bugs

Execute Playwright tests and fix any issues.

- [x] **Slice 7: Run Playwright tests and debug**
  - [x] Run full E2E test suite for trend chart
  - [x] Debug and fix any failing tests
  - [x] Verify all acceptance criteria are met
  - [x] Ensure tests pass in both light and dark themes
