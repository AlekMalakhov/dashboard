# Functional Specification: Jira Cloud Connection

- **Roadmap Item:** Jira Cloud Connection (Phase 1)
- **Status:** Approved
- **Author:** Poe

---

## 1. Overview and Rationale (The "Why")

This feature enables users to securely connect to their Jira Cloud instance via OAuth 2.0 and select which board to analyze. This is the foundational capability that unlocks all other dashboard functionality.

**Problem:** Product/Project Managers and QA Leads currently spend 30+ minutes manually querying Jira and calculating rework metrics in spreadsheets. Before the dashboard can provide value, users must first authenticate with Jira and specify which board contains their data.

**Desired Outcome:** Users can connect to Jira and select a board in under 1 minute, with no technical setup required.

---

## 2. Functional Requirements (The "What")

### 2.1 Landing Page (Unauthenticated State)

- **As a** visitor, **I want to** see a simple way to connect to Jira, **so that** I can start using the dashboard.
  - **Acceptance Criteria:**
    - [ ] The landing page displays a "Connect to Jira" button.
    - [ ] No other explanatory text or UI elements are required on this page.
    - [ ] Clicking the button initiates the Jira OAuth 2.0 (3LO) flow.

### 2.2 OAuth Authentication

- **As a** user, **I want to** authenticate with my Jira Cloud account, **so that** the dashboard can access my project data securely.
  - **Acceptance Criteria:**
    - [ ] Clicking "Connect to Jira" redirects the user to Atlassian's OAuth consent screen.
    - [ ] After the user grants access, they are automatically redirected back to the dashboard.
    - [ ] The dashboard stores the OAuth token securely for the session.
    - [ ] If OAuth fails (user denies access or network error), the user sees a clear error message explaining what went wrong.
    - [ ] The user remains on the landing page after an OAuth failure and can retry.

### 2.3 Board Selection

- **As an** authenticated user, **I want to** select which Jira board to analyze, **so that** I can see rework metrics for the relevant project.
  - **Acceptance Criteria:**
    - [ ] After successful authentication, the user sees a searchable dropdown list of boards.
    - [ ] The dropdown only displays boards the user has access to in Jira.
    - [ ] The user can type in the dropdown to filter the list of boards.
    - [ ] If the user has no accessible boards, the dropdown displays a "No items" message.
    - [ ] Board selection is not saved — the user must select a board each time after login.
    - [ ] After selecting a board, the user is taken directly to the rework ratio dashboard.

### 2.4 Logout

- **As an** authenticated user, **I want to** log out of the dashboard, **so that** I can switch accounts or end my session.
  - **Acceptance Criteria:**
    - [ ] A "Logout" button is visible to authenticated users.
    - [ ] Clicking "Logout" clears the session and redirects the user to the "Connect to Jira" landing page.

### 2.5 Session Expiry

- **As a** user whose session has expired, **I want to** be prompted to re-authenticate, **so that** I can continue using the dashboard.
  - **Acceptance Criteria:**
    - [ ] If the OAuth token expires during a session, the user is automatically redirected to the "Connect to Jira" landing page.
    - [ ] No cryptic error is shown — the flow simply restarts.

---

## 3. Scope and Boundaries

### In-Scope

- "Connect to Jira" landing page with single button
- Jira OAuth 2.0 (3LO) authentication flow
- Searchable dropdown for board selection
- Display only boards the user has access to
- Logout functionality
- Session expiry handling (redirect to login)
- Clear error messages for OAuth failures

### Out-of-Scope

The following are separate roadmap items and will be addressed in their own specifications:

- **Core Rework Ratio Dashboard** (Phase 1) — calculating and displaying rework metrics
- **Story/Task Breakdown** (Phase 2) — per-item rework table
- **Enhanced Insights** (Phase 2) — drill-down and summary views
- **Trend Analysis** (Phase 3) — historical charts
- **Multiple Boards & Export** (Phase 3) — multi-board support, CSV/PDF export

Additionally out-of-scope for this feature:

- Saving board selection between sessions
- Project selection (only board selection)
- Jira Server/Data Center support
