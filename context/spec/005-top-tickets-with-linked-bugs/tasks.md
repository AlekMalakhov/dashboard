# Tasks: Top Tickets with Linked Bugs

## Slice 1: Basic API endpoint returning static/mock data
Get the end-to-end plumbing working with hardcoded response.

- [x] **Slice 1: API endpoint with mock response**
  - [x] Add Pydantic schemas (`LinkedBugDetail`, `TopTicketItem`, `TopTicketsWithBugsResponse`) to `backend/app/rework/schemas.py` **[Agent: general-purpose]**
  - [x] Add route `GET /api/rework/top-tickets-with-bugs` that returns a hardcoded mock response **[Agent: general-purpose]**
  - [x] Verify endpoint works via curl or API client **[Agent: general-purpose]**
  - [x] Run: TC-001 API endpoint returns valid response structure **[Agent: qa-expert]**
  - [x] Run: TC-002 API validates board_id parameter **[Agent: qa-expert]**
  - [x] Run: TC-003 API defaults limit to 10 when not specified **[Agent: qa-expert]**
  - [x] Run: TC-004 API normalizes invalid limit to 10 **[Agent: qa-expert]**

## Slice 2: Frontend component displaying mock data
Get the UI rendering with static data from the new endpoint.

- [x] **Slice 2: Basic table component with API integration**
  - [x] Add TypeScript types and `getTopTicketsWithBugs()` function to `frontend/lib/api.ts` **[Agent: general-purpose]**
  - [x] Create `TopTicketsWithBugsTable` component that fetches and displays data in a simple table (key, summary, bug count) **[Agent: general-purpose]**
  - [x] Integrate component into dashboard page **[Agent: general-purpose]**
  - [x] Run: TC-005 Dashboard displays Top Tickets with Bugs section **[Agent: qa-expert]**
  - [x] Run: TC-006 Table displays ticket key, summary, and bug count **[Agent: qa-expert]**

## Slice 3: Real Jira data - fetch bugs and extract links
Replace mock data with actual Jira API calls.

- [x] **Slice 3: Backend fetches real bugs from Jira**
  - [x] Implement `get_top_tickets_with_bugs()` method in `ReworkService` that fetches bugs created within time range **[Agent: general-purpose]**
  - [x] Implement `_extract_linked_tickets()` helper to process "is caused by" and "relates to" links **[Agent: general-purpose]**
  - [x] Implement `_fetch_tickets_by_keys()` helper to batch-fetch parent ticket details **[Agent: general-purpose]**
  - [x] Wire up the route to call the real service method instead of returning mock data **[Agent: general-purpose]**
  - [x] Run: TC-007 Tickets are ranked by bug count (highest first) **[Agent: qa-expert]**
  - [x] Run: TC-008 API processes 'is caused by' link type **[Agent: qa-expert]**
  - [x] Run: TC-009 API processes 'relates to' link type **[Agent: qa-expert]**
  - [x] Run: TC-010 Bugs linked via multiple types are not double-counted **[Agent: qa-expert]**
  - [x] Run: TC-021 Tickets with zero bugs are not displayed **[Agent: qa-expert]**
  - [x] Run: TC-022 Only Bug issue types are counted **[Agent: qa-expert]**

## Slice 4: List size configuration
Add the limit selector (10/20/50) to the UI.

- [x] **Slice 4: Configurable list size**
  - [x] Add button group for limit selection (10 | 20 | 50) to `TopTicketsWithBugsTable` **[Agent: general-purpose]**
  - [x] Update component to refetch data when limit changes **[Agent: general-purpose]**
  - [x] Store selected limit in local state (default: 10) **[Agent: general-purpose]**
  - [x] Run: TC-011 Limit selector shows options 10, 20, 50 **[Agent: qa-expert]**
  - [x] Run: TC-012 Default limit selection is 10 **[Agent: qa-expert]**
  - [x] Run: TC-013 Changing limit immediately updates the list **[Agent: qa-expert]**

## Slice 5: Time range integration
Connect to dashboard's existing time range selector.

- [x] **Slice 5: Time range filtering**
  - [x] Pass `timeRange` prop from dashboard to `TopTicketsWithBugsTable` **[Agent: general-purpose]**
  - [x] Update component to refetch data when `timeRange` changes **[Agent: general-purpose]**
  - [x] Verify filtering works correctly for 30/60/90 day ranges **[Agent: general-purpose]**
  - [x] Run: TC-014 List respects 30-day time range filter **[Agent: qa-expert]**
  - [x] Run: TC-015 List respects 90-day time range filter **[Agent: qa-expert]**
  - [x] Run: TC-016 Changing time range updates list automatically **[Agent: qa-expert]**

## Slice 6: Expandable rows for bug drill-down
Add click-to-expand behavior showing linked bugs.

- [x] **Slice 6: Bug details drill-down**
  - [x] Add expand/collapse state management (only one row expanded at a time) **[Agent: general-purpose]**
  - [x] Render expandable row content showing linked bugs (key, summary) **[Agent: general-purpose]**
  - [x] Style the expanded section to match existing dashboard patterns **[Agent: general-purpose]**
  - [x] Run: TC-017 Clicking ticket row expands to show linked bugs **[Agent: qa-expert]**
  - [x] Run: TC-018 Expanded row shows bug key and summary **[Agent: qa-expert]**
  - [x] Run: TC-019 Clicking expanded row again collapses it **[Agent: qa-expert]**
  - [x] Run: TC-020 Only one ticket row can be expanded at a time **[Agent: qa-expert]**

## Slice 7: Backend tests
Add comprehensive test coverage for the backend.

- [x] **Slice 7: Backend test coverage**
  - [x] Create `backend/tests/test_top_tickets_with_bugs.py` **[Agent: general-purpose]**
  - [x] Add unit tests for link extraction logic (both link types) **[Agent: general-purpose]**
  - [x] Add unit tests for deduplication (bug linked via multiple types) **[Agent: general-purpose]**
  - [x] Add integration tests with mocked Jira API responses **[Agent: general-purpose]**

## Slice 8: Frontend tests
Add component and integration tests.

- [x] **Slice 8: Frontend test coverage**
  - [x] Add component tests for `TopTicketsWithBugsTable` (loading, data rendering, expand/collapse) **[Agent: general-purpose]**
  - [x] Add test for limit selector triggering refetch **[Agent: general-purpose]**
