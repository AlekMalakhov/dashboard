# Technical Specification: Jira Cloud Connection

- **Functional Specification:** `context/spec/001-jira-cloud-connection/functional-spec.md`
- **Status:** Approved
- **Author(s):** Poe

---

## 1. High-Level Technical Approach

This feature implements secure Jira Cloud authentication using Nango as the OAuth provider, with a FastAPI backend and Next.js frontend. Nango handles the entire OAuth 2.0 (3LO) flow, token storage, and automatic refresh — our backend simply retrieves tokens via Nango SDK when making Jira API calls.

**Systems affected:**
- Frontend: New landing page, auth flow, board selector
- Backend: New auth and boards endpoints
- Database: New users table
- External: Nango (OAuth), Jira Cloud API

---

## 2. Proposed Solution & Implementation Plan (The "How")

### 2.1 Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js       │────▶│   FastAPI       │────▶│   Nango         │
│   Frontend      │     │   Backend       │     │   (OAuth)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   PostgreSQL    │     │   Jira Cloud    │
                        │   (sessions)    │     │   REST API      │
                        └─────────────────┘     └─────────────────┘
```

### 2.2 OAuth Flow with Nango

1. User clicks "Connect to Jira" on landing page
2. Frontend uses Nango frontend SDK to open OAuth popup
3. User authorizes in Atlassian consent screen
4. Nango receives callback, stores tokens, returns connection ID
5. Frontend sends connection ID to backend `/api/auth/callback`
6. Backend creates user record and session
7. User is redirected to dashboard (board selection)

### 2.3 Data Model / Database Changes

**New table: `users`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `nango_connection_id` | TEXT (unique) | Reference to Nango connection |
| `atlassian_account_id` | TEXT | Jira user identifier |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |

### 2.4 API Contracts

**GET `/api/auth/session`**
- Returns current session status
- Response: `{ "authenticated": boolean, "user": { "id": string } | null }`

**POST `/api/auth/callback`**
- Receives Nango connection ID after OAuth
- Request: `{ "connection_id": string }`
- Response: `{ "success": boolean, "user": { "id": string } }`
- Creates session cookie (HTTP-only)

**POST `/api/auth/logout`**
- Clears session
- Response: `{ "success": boolean }`

**GET `/api/boards`**
- Fetches boards from Jira via Nango
- Response: `{ "boards": [{ "id": number, "name": string }] }`
- Requires authenticated session

### 2.5 Component Breakdown

**Backend (FastAPI):**

| Component | Purpose |
|-----------|---------|
| `app/auth/routes.py` | Auth endpoints (session, callback, logout) |
| `app/auth/service.py` | Session management, Nango SDK integration |
| `app/boards/routes.py` | `/api/boards` endpoint |
| `app/boards/service.py` | Fetches boards from Jira API via Nango |
| `app/db/models.py` | SQLAlchemy User model |
| `app/core/config.py` | Nango API keys, app settings |

**Frontend (Next.js):**

| Component | Purpose |
|-----------|---------|
| `app/page.tsx` | Landing page with "Connect to Jira" button |
| `app/dashboard/page.tsx` | Board selection + dashboard placeholder |
| `components/BoardSelector.tsx` | Searchable dropdown for boards |
| `lib/nango.ts` | Nango frontend SDK wrapper |
| `lib/api.ts` | API client for backend calls |

---

## 3. Impact and Risk Analysis

### 3.1 System Dependencies

- **Nango:** OAuth flow depends entirely on Nango service availability
- **Jira Cloud API:** Board fetching requires Jira API access
- **PostgreSQL:** Session/user storage
- **Redis:** Optional caching for board lists (future optimization)

### 3.2 Potential Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Nango service outage | Users cannot authenticate | No mitigation for v1; consider fallback OAuth in future |
| Jira API rate limits | Board fetching may fail | Implement retry logic with exponential backoff |
| Token expiry mid-session | API calls fail | Nango auto-refreshes; backend catches 401 and redirects to login |
| Network errors during OAuth | User stuck in flow | Clear error messages, retry button on landing page |

---

## 4. Testing Strategy

### 4.1 Unit Tests

- Auth service: session creation, validation, logout
- Boards service: Jira API response parsing, error handling

### 4.2 Integration Tests

- OAuth callback flow (mock Nango responses)
- Boards endpoint with mocked Jira API responses
- Session persistence across requests

### 4.3 End-to-End Tests

- Full OAuth flow with Nango sandbox
- Board selection and navigation to dashboard
- Logout and session clearing
- Error scenarios (OAuth denied, no boards)
