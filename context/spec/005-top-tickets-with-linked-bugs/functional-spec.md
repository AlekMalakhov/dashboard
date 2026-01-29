# Functional Specification: Top Tickets with Linked Bugs

- **Roadmap Item:** Bug Attribution Analysis - Identify which stories/tasks produce the most bugs
- **Status:** Completed
- **Author:** AI Assistant

---

## 1. Overview and Rationale (The "Why")

### Problem Statement
Product Managers and QA Leads currently have no easy way to see which stories or tasks have attracted the most bugs. While the existing rework ratio metric shows the *effort* spent on bugs (via story points), it doesn't reveal the *frequency* of bugs per ticket. A story with one 8-point bug looks different from a story with eight 1-point bugs, yet both have similar rework ratios.

### Purpose
This feature provides a ranked view of tickets (stories and tasks) by the **number of linked bugs**, helping users:
- **Identify bug hotspots:** Quickly see which work items have generated the most defects
- **Understand quality patterns:** Recognize which types of work or areas consistently produce more bugs
- **Prioritize process improvements:** Focus attention on the areas with the highest bug frequency

### Success Criteria
- Users can identify the tickets with the most bugs within 30 seconds
- The list updates automatically based on the selected time range
- Users can drill down to see which specific bugs are linked to any ticket

---

## 2. Functional Requirements (The "What")

### 2.1 Top Tickets List Display

- **As a** Product Manager or QA Lead, **I want to** see a ranked list of stories/tasks by bug count, **so that** I can identify which work items have produced the most defects.

**Acceptance Criteria:**
- [x] A new dashboard section titled "Top Tickets with Bugs" is displayed
- [x] The list shows tickets ranked by number of linked bugs (highest first)
- [x] Each row displays: Ticket Key (e.g., "PROJ-123"), Ticket Title/Summary, Bug Count
- [x] Both Stories and Tasks are included in the list (combined, no filtering)
- [x] Tickets with zero linked bugs are NOT displayed in the list

### 2.2 List Size Configuration

- **As a** user, **I want to** configure how many tickets appear in the list, **so that** I can adjust the view to my needs.

**Acceptance Criteria:**
- [x] A dropdown/selector allows choosing between 10, 20, or 50 items
- [x] Default selection is 10 items
- [x] Changing the selection immediately updates the displayed list
- [x] The selected size persists during the session

### 2.3 Bug Link Type Inclusion

- **As a** user, **I want** bugs connected via multiple relationship types to be counted, **so that** I get a complete picture of bug associations.

**Acceptance Criteria:**
- [x] Bugs linked via **"is caused by"** relationship are counted
- [x] Bugs linked via **"relates to"** relationship are counted
- [x] Each unique bug is counted only once per ticket (no double-counting if linked via multiple types)
- [x] Only issues of type "Bug" are counted as bugs

### 2.4 Time Range Filtering

- **As a** user, **I want** the list to respect the existing time range selector, **so that** I can analyze bug patterns for specific periods.

**Acceptance Criteria:**
- [x] The list filters based on the dashboard's existing 30/60/90 day selector
- [x] The time filter applies to the **bug creation date** (showing tickets that had bugs created within the selected period)
- [x] Changing the time range updates the list automatically

### 2.5 Bug Details Drill-Down

- **As a** user, **I want to** click on a ticket to see its linked bugs, **so that** I can understand what specific issues occurred.

**Acceptance Criteria:**
- [x] Clicking on a ticket row expands to show the list of linked bugs
- [x] Each bug in the expanded view shows: Bug Key, Bug Title/Summary
- [x] The expanded view can be collapsed by clicking the row again
- [x] Only one ticket can be expanded at a time (expanding another collapses the previous)

---

## 3. Scope and Boundaries

### In-Scope
- New dashboard section displaying top tickets ranked by bug count
- Configurable list size (10, 20, 50)
- Bug counting from "is caused by" and "relates to" link types
- Integration with existing time range selector (30/60/90 days)
- Click-to-expand drill-down showing linked bugs

### Out-of-Scope
- **Other roadmap items** (these will be addressed in separate specifications):
  - Jira Cloud Connection
  - Core Rework Ratio Dashboard
  - Story/Task Breakdown (Per-Item Rework Table)
  - Enhanced Insights (Story Details Drill-Down, Overall Rework Summary)
  - Trend Analysis (Historical Trend Charts, Breakdown by Team Member)
  - Multiple Boards & Export
- Grouping by Epic, Component, or Sprint
- Filtering by issue type (Stories only vs Tasks only)
- Direct link to open ticket in Jira from this view
- Bug severity/priority weighting
- Export of this specific list
