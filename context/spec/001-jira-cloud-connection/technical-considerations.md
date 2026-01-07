# Technical Specification: Jira Cloud Connection

- **Functional Specification:** `context/spec/001-jira-cloud-connection/functional-spec.md`
- **Status:** Approved (Updated - Nango integration removed)
- **Author(s):** Poe

---

## 1. High-Level Technical Approach

This feature implements secure Jira Cloud authentication using direct Jira Cloud REST API integration with a FastAPI backend and Next.js frontend. The backend handles API token authentication and makes direct calls to the Jira Cloud REST API.

**Systems affected:**
- Frontend: Landing page, auth flow, board selector
- Backend: Auth and boards endpoints
- Database: Users table
- External: Jira Cloud REST API

> **Note:** The original implementation used Nango as an OAuth provider. This approach was abandoned in favor of direct Jira API integration using API tokens.

---

## 2. Proposed Solution & Implementation Plan (The "How")

### 2.1 Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js       │────▶│   FastAPI       │────▶│   Jira Cloud    │
│   Frontend      │     │   Backend       │     │   REST API      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   PostgreSQL    │
                        │   (sessions)    │
                        └─────────────────┘
```

### 2.2 Authentication Flow

1. Backend uses configured Jira API credentials (base URL, email, API token)
2. API calls are made directly to Jira Cloud REST API
3. User sessions are managed via HTTP-only cookies

### 2.3 Data Model / Database Changes

**Table: `users`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `atlassian_account_id` | TEXT | Jira user identifier |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |

### 2.4 API Contracts

**GET `/api/auth/session`**
- Returns current session status
- Response: `{ "authenticated": boolean, "user": { "id": string } | null }`

**POST `/api/auth/callback`**
- Handles authentication callback
- Request: `{ "connection_id": string }`
- Response: `{ "success": boolean, "user": { "id": string } }`
- Creates session cookie (HTTP-only)

**POST `/api/auth/logout`**
- Clears session
- Response: `{ "success": boolean }`

**GET `/api/boards`**
- Fetches boards from Jira
- Response: `{ "boards": [{ "id": number, "name": string }] }`
- Requires authenticated session

### 2.5 Component Breakdown

**Backend (FastAPI):**

| Component | Purpose |
|-----------|---------|
| `app/auth/routes.py` | Auth endpoints (session, callback, logout) |
| `app/auth/service.py` | Session management |
| `app/boards/routes.py` | `/api/boards` endpoint |
| `app/boards/service.py` | Fetches boards from Jira API |
| `app/db/models.py` | SQLAlchemy User model |
| `app/core/config.py` | Jira API credentials, app settings |

**Frontend (Next.js):**

| Component | Purpose |
|-----------|---------|
| `app/page.tsx` | Landing page with "Connect to Jira" button |
| `app/dashboard/page.tsx` | Board selection + dashboard |
| `components/BoardSelector.tsx` | Searchable dropdown for boards |
| `lib/api.ts` | API client for backend calls |

---

## 3. Impact and Risk Analysis

### 3.1 System Dependencies

- **Jira Cloud API:** Board fetching requires Jira API access
- **PostgreSQL:** Session/user storage
- **Redis:** Optional caching for board lists (future optimization)

### 3.2 Potential Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Jira API rate limits | Board fetching may fail | Implement retry logic with exponential backoff |
| Token expiry | API calls fail | Clear error messages, redirect to re-authenticate |
| Network errors | User stuck in flow | Clear error messages, retry button |

---

## 4. Testing Strategy

### 4.1 Unit Tests

- Auth service: session creation, validation, logout
- Boards service: Jira API response parsing, error handling

### 4.2 Integration Tests

- Auth callback flow (mock Jira responses)
- Boards endpoint with mocked Jira API responses
- Session persistence across requests

### 4.3 End-to-End Tests

- Board selection and navigation to dashboard
- Logout and session clearing
- Error scenarios (no boards)
