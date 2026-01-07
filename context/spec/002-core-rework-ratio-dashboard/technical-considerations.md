# Technical Specification: Core Rework Ratio Dashboard

- **Functional Specification:** `context/spec/002-core-rework-ratio-dashboard/functional-spec.md`
- **Status:** Approved
- **Author(s):** Poe

---

## 1. High-Level Technical Approach

This feature adds a rework ratio dashboard to the existing application. The backend fetches bug and story data from Jira Cloud REST API, calculates the rework ratio, and caches results in Redis. The frontend extends the dashboard page with a time range selector, main metric card, and context widgets.

**Systems affected:**
- Backend: New `rework` module with service, routes, schemas, cache
- Frontend: Extended dashboard page, new reusable components
- External: Jira Cloud REST API v3, Redis cache

---

## 2. Proposed Solution & Implementation Plan (The "How")

### 2.1 Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js       │────▶│   FastAPI       │────▶│   Redis         │
│   Dashboard     │     │   /api/rework   │     │   (cache)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   Jira Cloud    │
                        │   REST API v3   │
                        └─────────────────┘
```

### 2.2 Rework Calculation Logic

1. **Fetch bugs** — JQL: `project IN boardProjects({board_id}) AND type = Bug AND created >= -{days}d`
2. **Detect story points field** — Query `/rest/api/3/field`, find field with name containing "Story Points"
3. **Fetch issue links** — For each bug, get `/rest/api/3/issue/{key}?fields=issuelinks` (parallel)
4. **Extract parent stories** — Filter links where type is "is caused by", collect unique parent keys
5. **Fetch parent stories** — JQL: `key IN ({key1}, {key2}, ...)`
6. **Calculate metrics:**
   - `rework_points` = sum of bug story points (exclude nulls)
   - `story_points_delivered` = sum of unique parent story points (exclude nulls)
   - `rework_ratio` = round(rework_points / story_points_delivered × 100)
   - `items_excluded` = count of bugs/stories with null story points

### 2.3 API Contract

**GET `/api/rework`**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `board_id` | int | Yes | — | Jira board ID |
| `days` | int | No | 30 | Time range (30, 60, or 90) |

**Response (200 OK):**
```json
{
  "rework_ratio": 12,
  "stories_analyzed": 24,
  "bugs_linked": 8,
  "story_points_delivered": 142,
  "rework_points": 17,
  "items_excluded": 3,
  "warning": "3 items excluded due to missing story points"
}
```

**Error Responses:**
- `401 Unauthorized` — Session expired or invalid
- `400 Bad Request` — Invalid board_id or days parameter
- `502 Bad Gateway` — Jira API error

### 2.4 Data Model / Database Changes

**No new tables required.**

Rework metrics are calculated on-demand and cached in Redis. The existing `users` table provides user authentication context for Jira API calls.

### 2.5 Caching Strategy

**Redis cache key:** `rework:{board_id}:{days}`

| Time Range | TTL | Rationale |
|------------|-----|-----------|
| 30 days | 15 minutes | Recent data, changes frequently |
| 60 days | 30 minutes | Moderate staleness acceptable |
| 90 days | 60 minutes | Historical data, less volatile |

**Cache flow:**
1. Check Redis for cached result
2. If hit → return cached data
3. If miss → calculate, store in Redis with TTL, return

### 2.6 Component Breakdown

**Backend (`app/rework/`):**

| Component | Purpose |
|-----------|---------|
| `schemas.py` | `ReworkMetricsResponse`, `JiraIssue`, `IssueLink` Pydantic models |
| `service.py` | `ReworkService` class — Jira API calls, calculation logic |
| `cache.py` | `CacheService` class — Redis get/set with TTL |
| `routes.py` | `GET /api/rework` endpoint with auth check |

**Frontend:**

| Component | Purpose |
|-----------|---------|
| `TimeRangeSelector` | Button group for 30d/60d/90d selection |
| `ReworkRatioCard` | Large percentage display with context text |
| `ContextWidget` | Reusable metric card (title + value) |
| `ContextWidgetsGrid` | Responsive 4-column grid of widgets |
| `MissingDataWarning` | Yellow banner for excluded items |
| `lib/api.ts` | `getReworkMetrics(boardId, days)` function |

---

## 3. Impact and Risk Analysis

### 3.1 System Dependencies

- **Jira Cloud API:** Bug/story data, issue links
- **Redis:** Caching layer (graceful degradation if unavailable)
- **PostgreSQL:** User session validation only

### 3.2 Potential Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Jira API rate limits (~100 req/min) | Calculation fails for large boards | Redis caching + parallel fetching + batch queries |
| Story points field varies by Jira instance | Wrong field used, incorrect metrics | Auto-detect via `/rest/api/3/field` endpoint |
| Redis unavailable | No caching, increased Jira API load | Graceful degradation — calculate without cache |
| Many bugs without "is caused by" links | 0% rework ratio, confusing UX | Show informative message if no linked bugs found |
| Jira API errors (401, 403, 500) | Dashboard shows error | Specific error messages, retry button |

---

## 4. Testing Strategy

### 4.1 Unit Tests (Backend)

- `ReworkService.calculate_metrics()` — test with mock Jira responses
- Metric calculation edge cases: no bugs, no links, missing story points, division by zero
- Cache service: hit/miss scenarios, TTL handling

### 4.2 Integration Tests (Backend)

- Full API flow with mocked Nango/Jira responses
- Auth validation (401 for unauthenticated requests)
- Query parameter validation (invalid board_id, days)

### 4.3 End-to-End Tests (Playwright)

| Test Case | Description |
|-----------|-------------|
| Rework metrics display | After board selection, verify rework ratio card and all 4 context widgets appear |
| Time range switching | Click 60d/90d, verify metrics refresh and values update |
| Loading states | Verify loading spinner shows during API call |
| Missing data warning | When items excluded, verify yellow warning banner appears |
| Error handling | Mock API failure, verify error message displays |
| Session expiry | Mock 401 response, verify redirect to landing page |

**Playwright test location:** `frontend/e2e/rework-dashboard.spec.ts`
