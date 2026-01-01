# Tasks: Core Rework Ratio Dashboard

## Slice 1: Static Dashboard UI

Display the rework section with placeholder data when a board is selected.

- [x] **Slice 1: Static rework dashboard UI with placeholder data**
  - [x] Create `TimeRangeSelector` component (30d/60d/90d toggle buttons)
  - [x] Create `ReworkRatioCard` component (displays percentage with context text)
  - [x] Create `ContextWidget` component (reusable metric card)
  - [x] Create `ContextWidgetsGrid` component (4-column responsive grid)
  - [x] Add rework section to dashboard page (visible when board selected)
  - [x] Display hardcoded placeholder values (12%, 24 stories, etc.)
  - [x] Verify UI renders correctly with time range switching

---

## Slice 2: Backend Endpoint with Mock Data

Create the API endpoint returning mock data to verify end-to-end flow.

- [x] **Slice 2: Working API endpoint with mock response**
  - [x] Create `app/rework/` module structure (routes, service, schemas)
  - [x] Define `ReworkMetricsResponse` Pydantic schema
  - [x] Create `GET /api/rework` endpoint with auth check
  - [x] Return hardcoded mock metrics from endpoint
  - [x] Add `getReworkMetrics()` function to frontend `api.ts`
  - [x] Connect dashboard to real API (replace hardcoded values)
  - [x] Verify end-to-end flow works with mock data

---

## Slice 3: Fetch Bugs from Jira

Query Jira for bugs created in the time range.

- [x] **Slice 3: Real bug data from Jira**
  - [x] Implement `ReworkService._fetch_bugs()` using JQL via Nango proxy
  - [x] Parse Jira search response into typed models
  - [x] Return actual `bugs_linked` count in response
  - [x] Handle Jira API errors (401, 403, 502)
  - [x] Verify dashboard shows real bug count

---

## Slice 4: Fetch Issue Links and Calculate Rework Ratio

Fetch "is caused by" links and parent stories to calculate the real rework ratio.

- [x] **Slice 4: Real rework ratio calculation**
  - [x] Implement `ReworkService._fetch_issue_links()` for each bug (parallel)
  - [x] Filter links by "is caused by" type, extract parent story keys
  - [x] Implement `ReworkService._fetch_parent_stories()` using batch JQL
  - [x] Calculate `rework_points`, `story_points_delivered`, `rework_ratio`
  - [x] Return all real metrics in response
  - [x] Verify dashboard shows accurate rework ratio

---

## Slice 5: Auto-Detect Story Points Field

Dynamically find the story points custom field in Jira.

- [x] **Slice 5: Story points field auto-detection**
  - [x] Implement `ReworkService._detect_story_points_field()` via `/rest/api/3/field`
  - [x] Find field with name containing "Story Points" or "Story point"
  - [x] Cache detected field ID for session duration
  - [x] Use detected field when reading story points from issues
  - [x] Handle case where story points field not found (error message)

---

## Slice 6: Handle Missing Story Points

Track and warn about items excluded due to missing story points.

- [x] **Slice 6: Missing data warning**
  - [x] Track bugs/stories with null story points during calculation
  - [x] Return `items_excluded` count and `warning` message in response
  - [x] Create `MissingDataWarning` frontend component
  - [x] Display warning banner when items excluded
  - [x] Verify warning appears/hides correctly

---

## Slice 7: Redis Caching

Cache rework metrics to reduce Jira API calls.

- [x] **Slice 7: Redis caching layer**
  - [x] Create `app/rework/cache.py` with `CacheService` class
  - [x] Implement Redis get/set with TTL (15/30/60 min by time range)
  - [x] Add cache check before calculation in `ReworkService`
  - [x] Store results in cache after calculation
  - [x] Handle Redis unavailability gracefully (calculate without cache)
  - [x] Verify caching works (second request returns cached data)

---

## Slice 8: Playwright E2E Tests

End-to-end tests for the rework dashboard.

- [x] **Slice 8: Playwright E2E test suite**
  - [x] Set up Playwright in frontend project (if not already configured)
  - [x] Test: Rework metrics display after board selection
  - [x] Test: Time range switching updates metrics
  - [x] Test: Loading state shows during API call
  - [x] Test: Missing data warning appears when items excluded
  - [x] Test: Error message displays on API failure
  - [x] Test: Session expiry redirects to landing page
