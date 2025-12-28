# Product Definition: Jira Dashboard

- **Version:** 1.0
- **Status:** Proposed

---

## 1. The Big Picture (The "Why")

### 1.1. Project Vision & Purpose

To provide Product/Project Managers and QA Leads with instant visibility into rework ratio — the effort spent fixing bugs relative to original development work — eliminating the need for manual Jira queries and spreadsheet calculations.

### 1.2. Target Audience

- **Product/Project Managers** who need to understand the true cost of features and identify areas with quality issues.
- **QA Leads** who need to track quality trends and identify problematic areas in the codebase.

### 1.3. User Personas

- **Persona 1: "Alex the Product Manager"**
  - **Role:** Product Manager responsible for a development team.
  - **Goal:** Wants to quickly understand which features required the most rework so they can improve estimation and planning.
  - **Frustration:** Currently spends 30+ minutes per week manually querying Jira and calculating rework in spreadsheets.

- **Persona 2: "Sam the QA Lead"**
  - **Role:** QA Lead overseeing quality for the product.
  - **Goal:** Wants to identify which stories consistently produce bugs to focus testing efforts and advocate for better practices.
  - **Frustration:** Has no easy way to see the relationship between original work and resulting bugs.

### 1.4. Success Metrics

- Users can identify which stories have the highest rework ratio within 1 minute (vs. 30+ minutes manually).
- Rework ratio is automatically calculated without manual data extraction.
- Dashboard provides actionable insights with minimal configuration.

---

## 2. The Product Experience (The "What")

### 2.1. Core Features

- **Jira Cloud Integration:** Secure connection to Jira Cloud to fetch stories, tasks, and bugs.
- **Rework Ratio Calculation:** Automatic calculation of rework ratio using story points from bugs linked via "is caused by" relationship divided by story points of the original story/task.
- **Time Range Selector:** Filter data by 30-day, 60-day, or 90-day time ranges.
- **Story/Task Breakdown:** View rework ratio per individual story/task with sorting (highest rework first).

### 2.2. User Journey

1. User opens the Jira Dashboard web application.
2. User authenticates with their Jira Cloud instance.
3. User selects a Jira board/project to analyze.
4. Dashboard displays the overall rework ratio for the selected time range (30d/60d/90d).
5. User views a table of stories/tasks sorted by rework ratio.
6. User identifies high-rework items and takes action (investigation, process improvement, etc.).

---

## 3. Project Boundaries

### 3.1. What's In-Scope for this Version

- Jira Cloud authentication and connection.
- Rework ratio calculation (bug story points / original story points via "is caused by" links).
- Time range selector: 30 days, 60 days, 90 days.
- Table/list showing rework ratio per story/task.
- Basic sorting (highest rework first).

### 3.2. What's Out-of-Scope (Non-Goals)

- Multiple boards support (single board focus for v1).
- Breakdown by team member.
- Historical trend charts.
- Export functionality (PDF/CSV).
- Alerts and notifications.
- Jira Server/Data Center support.
- Mobile application.
