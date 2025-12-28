# Tasks: Jira Cloud Connection

## Slice 1: Project Scaffolding

Set up the basic project structure so both frontend and backend are runnable.

- [x] **Slice 1: Project scaffolding with runnable frontend and backend**
  - [x] Initialize Next.js frontend project with TypeScript
  - [x] Initialize FastAPI backend project with basic structure
  - [x] Create Docker Compose configuration (FastAPI, PostgreSQL, Redis)
  - [x] Add health check endpoint (`GET /api/health`) to backend
  - [x] Verify both frontend and backend start without errors

---

## Slice 2: Static Landing Page

User can see the landing page with a non-functional button.

- [x] **Slice 2: Display landing page with "Connect to Jira" button**
  - [x] Create landing page (`app/page.tsx`) with centered "Connect to Jira" button
  - [x] Add basic styling (minimal, clean layout)
  - [x] Button is visible but does not trigger any action yet

---

## Slice 3: OAuth Flow with Nango

User can authenticate with Jira via Nango and return to the app.

- [x] **Slice 3: Working OAuth authentication flow**
  - [x] Set up Nango account and configure Jira integration
  - [x] Add Nango frontend SDK to Next.js
  - [x] Create `lib/nango.ts` wrapper to trigger OAuth popup
  - [x] Wire "Connect to Jira" button to open Nango OAuth popup
  - [x] Create database migration for `users` table
  - [x] Create `User` SQLAlchemy model
  - [x] Add `POST /api/auth/callback` endpoint to receive Nango connection ID
  - [x] Create user record in database on successful callback
  - [x] Set HTTP-only session cookie on successful auth
  - [x] Redirect user to `/dashboard` after successful authentication

---

## Slice 4: Session Persistence and Auth State

User stays logged in after page refresh; unauthenticated users are redirected.

- [x] **Slice 4: Session persistence and protected routes**
  - [x] Add `GET /api/auth/session` endpoint to check auth status
  - [x] Create `lib/api.ts` client for backend calls
  - [x] Add auth check to `/dashboard` page (redirect to `/` if not authenticated)
  - [x] Show loading state while checking session
  - [x] Display error message on landing page if OAuth fails

---

## Slice 5: Board Selection

Authenticated user can see and select a Jira board.

- [x] **Slice 5: Fetch and display boards in searchable dropdown**
  - [x] Add `GET /api/boards` endpoint that fetches boards from Jira via Nango
  - [x] Create `BoardSelector.tsx` component (searchable dropdown)
  - [x] Fetch boards on dashboard page load
  - [x] Display "No items" message if user has no accessible boards
  - [x] On board selection, store selected board ID in state (placeholder for next feature)
  - [x] Show selected board name after selection

---

## Slice 6: Logout

User can log out and return to landing page.

- [x] **Slice 6: Logout functionality**
  - [x] Add `POST /api/auth/logout` endpoint to clear session
  - [x] Add "Logout" button to dashboard page
  - [x] On logout, redirect to landing page
  - [x] Verify session is cleared (refresh shows landing page)

---

## Slice 7: Session Expiry Handling

Expired sessions redirect gracefully to login.

- [x] **Slice 7: Handle session and token expiry**
  - [x] Backend catches 401 from Jira API (expired token)
  - [x] Return 401 to frontend when session is invalid
  - [x] Frontend detects 401 and redirects to landing page
  - [x] No cryptic errors shown — flow restarts cleanly
