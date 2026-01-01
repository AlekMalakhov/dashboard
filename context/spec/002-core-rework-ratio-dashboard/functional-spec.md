# Functional Specification: Core Rework Ratio Dashboard

- **Roadmap Item:** Core Rework Ratio Dashboard (Phase 1)
- **Status:** Approved
- **Author:** Poe

---

## 1. Overview and Rationale (The "Why")

Product/Project Managers and QA Leads currently spend 30+ minutes per week manually querying Jira and calculating rework in spreadsheets. They need instant visibility into rework ratio — the effort spent fixing bugs relative to original development work.

This feature provides an at-a-glance dashboard showing the rework ratio for a selected Jira board, allowing users to:
- Understand the true cost of features
- Identify quality trends over different time periods
- Make data-driven decisions about process improvements

**Success Criteria:**
- Users can see rework ratio within seconds of loading the dashboard
- Calculation is automatic with no manual data extraction
- Time range filtering allows trend comparison (30d vs 60d vs 90d)

---

## 2. Functional Requirements (The "What")

### 2.1 Rework Ratio Display

- **As a** Product Manager or QA Lead, **I want to** see the overall rework ratio for my selected board, **so that** I can instantly understand how much effort is going to bug fixes.

  **Acceptance Criteria:**
  - [ ] Dashboard displays rework ratio as a whole number percentage (e.g., "12%")
  - [ ] Contextual text explains the metric (e.g., "12% of effort went to bug fixes")
  - [ ] Ratio is calculated as: `Rework Points / Delivered Points × 100`

### 2.2 Rework Ratio Calculation

- **As a** user, **I want** the rework ratio calculated automatically from Jira data, **so that** I don't need to manually extract and calculate.

  **Acceptance Criteria:**
  - [ ] System finds all bugs created within the selected time range (from today)
  - [ ] System identifies bugs linked to stories/tasks via Jira native "is caused by" link type
  - [ ] **Rework Points** = sum of story points from linked bugs
  - [ ] **Delivered Points** = sum of story points from unique parent stories/tasks
  - [ ] Each parent story's points count only once, even if it has multiple linked bugs

### 2.3 Time Range Selector

- **As a** user, **I want to** filter by different time ranges, **so that** I can compare rework trends across periods.

  **Acceptance Criteria:**
  - [ ] Three options available: 30 days, 60 days, 90 days
  - [ ] Default selection is 30 days
  - [ ] Selecting a different range recalculates all metrics immediately
  - [ ] Time range is based on bug creation date (e.g., "30 days" = bugs created in the last 30 days from today)

### 2.4 Context Widgets

- **As a** user, **I want to** see supporting metrics alongside the rework ratio, **so that** I can understand the data behind the percentage.

  **Acceptance Criteria:**
  - [ ] **Stories Analyzed**: Count of unique parent stories/tasks linked to bugs in the period
  - [ ] **Bugs Linked**: Count of bugs with "is caused by" links created in the period
  - [ ] **Story Points Delivered**: Total story points from unique parent stories
  - [ ] **Rework Points**: Total story points from linked bugs
  - [ ] All widgets update when time range changes

### 2.5 Missing Data Handling

- **As a** user, **I want to** know if data is incomplete, **so that** I can trust the accuracy of the metrics.

  **Acceptance Criteria:**
  - [ ] If any bugs or stories are missing story points, they are excluded from the calculation
  - [ ] A warning message displays: "X items excluded due to missing story points"
  - [ ] Warning only appears when items are actually excluded

---

## 3. Scope and Boundaries

### In-Scope

- Rework ratio calculation and display for a single selected board
- Time range selector (30d, 60d, 90d)
- Context widgets (Stories, Bugs, Delivered Points, Rework Points)
- Warning for missing story points
- Using Jira native "is caused by" link type

### Out-of-Scope

- **Story/Task Breakdown** — per-item rework table (Phase 2)
- **Highest Rework First Sorting** — sorting by rework ratio (Phase 2)
- **Story Details Drill-Down** — clicking to see linked bugs (Phase 2)
- **Trend Analysis** — historical charts (Phase 3)
- **Breakdown by Team Member** (Phase 3)
- **Multi-Board Support** (Phase 3)
- **Export to CSV/PDF** (Phase 3)
