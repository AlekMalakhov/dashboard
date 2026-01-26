# Functional Specification: Developer Rework Leaderboard

- **Roadmap Item:** Breakdown by Team Member (Phase 3 - Trend Analysis)
- **Status:** Draft
- **Author:** [Your Name]

---

## 1. Overview and Rationale (The "Why")

### Problem Statement

Product Managers and QA Leads currently have no visibility into which individual developers produce work that results in higher or lower rework. Without this data, they cannot:
- Identify developers who may benefit from additional coaching or training
- Make informed decisions about pairing assignments
- Track whether process improvements are working at the individual level

### Solution

Add a "Developer Rework Leaderboard" section to the existing dashboard that displays each developer's rework metrics alongside their Jira avatar and name. This enables data-driven conversations about quality and targeted improvement efforts.

### Success Criteria

- Users can identify which developers have the highest rework ratio within 30 seconds
- Data is presented with appropriate context to support constructive conversations (not punitive use)

---

## 2. Functional Requirements (The "What")

### 2.1 Developer List Display

The dashboard shall display a new section titled "Developer Rework Leaderboard" containing a table with the following columns:

| Column | Description |
|--------|-------------|
| Avatar | Developer's profile picture from Jira |
| Name | Developer's display name from Jira |
| Rework Ratio | Bug story points / Story points delivered, shown as percentage |
| Stories | Count of stories/tasks assigned to this developer |
| Story Points | Total story points delivered by this developer |
| Bugs | Count of bugs linked to this developer's stories |
| Bug Points | Total story points of bugs linked to this developer's stories |

**Acceptance Criteria:**
- [ ] Each row displays the developer's Jira avatar (or placeholder if none)
- [ ] Each row displays the developer's Jira display name
- [ ] Rework ratio is calculated as: (sum of bug story points) / (sum of story points delivered) × 100%
- [ ] All numeric columns display integer values (counts) or percentages (ratio)

### 2.2 Attribution Logic

**Story Attribution:**
- A story/task is attributed to the developer listed in the **Assignee** field at time of query

**Bug Attribution:**
- When a bug is linked to a story via "is caused by" relationship, the bug's story points are attributed to the **original story's assignee** (the developer who implemented the feature), not the bug's assignee (the developer who fixes the bug)

**Acceptance Criteria:**
- [ ] Stories are attributed based on the Assignee field
- [ ] Bug story points are counted against the assignee of the linked parent story, not the bug fixer
- [ ] Bugs without "is caused by" links are not included in developer metrics

### 2.3 Filtering and Minimum Threshold

**Time Range:**
- The existing time range selector (30/60/90 days) applies to this section
- Only stories completed within the selected time range are included

**Minimum Threshold:**
- Developers with fewer than **3 stories** in the selected time range are **hidden** from the list
- This prevents misleading ratios from small sample sizes

**Acceptance Criteria:**
- [ ] Changing the time range selector updates the Developer Leaderboard
- [ ] Developers with 0, 1, or 2 stories in the time range do not appear in the list
- [ ] Developers with 3+ stories appear in the list

### 2.4 Sorting

- Default sort: **Highest rework ratio first** (descending)
- This surfaces developers who may need the most attention at the top

**Acceptance Criteria:**
- [ ] On page load, developers are sorted by rework ratio descending
- [ ] The developer with the highest rework ratio appears first

### 2.5 Drill-Down Interaction

- Clicking on a developer row expands or navigates to show that developer's individual stories and their linked bugs

**Acceptance Criteria:**
- [ ] Clicking a developer row reveals a detail view
- [ ] The detail view shows each story assigned to that developer
- [ ] Each story shows its linked bugs (via "is caused by") and their story points
- [ ] User can collapse/close the detail view to return to the main list

### 2.6 Contextual Framing

- The section shall display a brief disclaimer to frame the data constructively

**Suggested text:** "This data supports process improvement and coaching conversations."

**Acceptance Criteria:**
- [ ] A disclaimer/context message is visible near the section header
- [ ] The message communicates that data is for improvement purposes

---

## 3. Scope and Boundaries

### In-Scope

- Display list of developers with avatar, name, and rework metrics
- Attribution based on Assignee field
- Bug points attributed to original story author
- Time range filtering (30/60/90 days)
- Minimum 3-story threshold to appear in list
- Default sort by highest rework ratio
- Drill-down to see developer's stories and linked bugs
- Contextual framing message
- New section on existing dashboard (not separate page)

### Out-of-Scope

The following are explicitly NOT included in this specification (separate roadmap items):

- Jira Cloud Connection (Secure Authentication, Board/Project Selection)
- Core Rework Ratio Dashboard (Rework Ratio Calculation, Time Range Selector)
- Story/Task Breakdown (Per-Item Rework Table)
- Enhanced Insights (Story Details Drill-Down, Overall Rework Summary)
- Historical Trend Charts
- Multi-Board Support
- Export to CSV/PDF
- Comparison between developers over time (trend lines per developer)
- Team-level grouping (grouping developers by Jira team)
- Configurable minimum threshold (hardcoded to 3)
- Alternative sort options (only highest rework first)
