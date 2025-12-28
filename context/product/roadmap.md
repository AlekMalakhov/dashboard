# Product Roadmap: Jira Dashboard

_This roadmap outlines our strategic direction based on customer needs and business goals. It focuses on the "what" and "why," not the technical "how."_

---

### Phase 1

_The highest priority features that form the core foundation of the product._

- [ ] **Jira Cloud Connection**
  - [ ] **Secure Authentication:** Allow users to connect to their Jira Cloud instance via OAuth, providing secure access to project data.
  - [ ] **Board/Project Selection:** Enable users to select which Jira board or project to analyze.

- [ ] **Core Rework Ratio Dashboard**
  - [ ] **Rework Ratio Calculation:** Automatically calculate rework ratio by analyzing "is caused by" links between bugs and stories/tasks, comparing their story points.
  - [ ] **Time Range Selector:** Allow users to filter the data by 30-day, 60-day, or 90-day time ranges.

---

### Phase 2

_Once the foundational features are complete, we will move on to these high-value additions._

- [ ] **Story/Task Breakdown**
  - [ ] **Per-Item Rework Table:** Display a sortable table showing rework ratio for each individual story/task.
  - [ ] **Highest Rework First Sorting:** Default sort by highest rework ratio to surface problem areas immediately.

- [ ] **Enhanced Insights**
  - [ ] **Story Details Drill-Down:** Allow users to click on a story/task to see linked bugs and their story points.
  - [ ] **Overall Rework Summary:** Display aggregate rework ratio for the selected time period at the top of the dashboard.

---

### Phase 3

_Features planned for future consideration. Their priority and scope may be refined based on user feedback from earlier phases._

- [ ] **Trend Analysis**
  - [ ] **Historical Trend Charts:** Visualize how rework ratio changes over time to track quality improvements.
  - [ ] **Breakdown by Team Member:** Show rework ratio attributed to individual team members.

- [ ] **Multiple Boards & Export**
  - [ ] **Multi-Board Support:** Allow users to analyze and compare rework across multiple Jira boards.
  - [ ] **Export to CSV/PDF:** Enable users to download rework reports for sharing and documentation.
