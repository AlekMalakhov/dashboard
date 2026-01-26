# Manual Test Cases: Developer Rework Leaderboard

**Feature:** Developer Rework Leaderboard
**Specification:** `context/spec/004-developer-rework-leaderboard/functional-spec.md`
**Last Updated:** 2026-01-26

---

## Test Environment Prerequisites

- Dashboard application is running and accessible
- Valid Jira Cloud connection is configured
- Test board has developers with stories
- Test board has bugs linked to stories via "is caused by" relationship
- Access to Jira to verify data accuracy

---

## 1. Happy Path Tests

### TC-001: Leaderboard section displays on dashboard

**Priority:** P0 (blocker)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- User is logged in
- At least one Jira board is available

**Steps:**
1. Navigate to the dashboard → Dashboard loads successfully
2. Select a Jira board from the board selector → Board is selected
3. Wait for all sections to load → Loading indicators disappear

**Expected Result:**
- "Developer Rework Leaderboard" section is visible on the dashboard
- Section appears after the existing metrics/widgets area
- Section header shows "Developer Rework Leaderboard" title

**Verification Method:** Application

---

### TC-002: Developer rows display with all required columns

**Priority:** P0 (blocker)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Dashboard is loaded with a board that has developers with stories

**Steps:**
1. Navigate to dashboard and select a board → Board loads
2. Scroll to Developer Rework Leaderboard section → Section is visible
3. Examine the table headers → All column headers visible
4. Examine the first developer row → All data columns populated

**Expected Result:**
- Table displays the following columns: Avatar, Name, Rework Ratio, Stories, Story Points, Bugs, Bug Points
- Each developer row shows:
  - Profile picture (or placeholder if none)
  - Developer's display name from Jira
  - Rework ratio as a percentage (e.g., "25.5%")
  - Stories count as integer
  - Story Points as number
  - Bugs count as integer
  - Bug Points as number

**Verification Method:** Application

---

### TC-003: Developers sorted by rework ratio descending

**Priority:** P1 (critical)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Board has at least 3 developers with stories
- Developers have different rework ratios

**Steps:**
1. Navigate to dashboard and select board → Board loads
2. Scroll to Developer Rework Leaderboard → Section visible
3. Note the rework ratio of each developer from top to bottom → Ratios recorded

**Expected Result:**
- Developer with highest rework ratio appears first
- Each subsequent developer has equal or lower rework ratio than the one above
- Sorting is automatic on page load (no user action needed)

**Verification Method:** Application
**Test Data / Resources:**
- Record the rework ratios: Row 1: ___%, Row 2: ___%, Row 3: ___%
- Confirm: Row 1 >= Row 2 >= Row 3

---

### TC-004: Contextual disclaimer is displayed

**Priority:** P2 (major)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Dashboard is loaded

**Steps:**
1. Navigate to dashboard and select a board → Board loads
2. Locate the Developer Rework Leaderboard section → Section visible
3. Look for disclaimer text near the section header → Disclaimer visible

**Expected Result:**
- Disclaimer text is visible near or below the section header
- Text reads: "This data supports process improvement and coaching conversations." (or similar constructive framing)

**Verification Method:** Application

---

### TC-005: Time range selector affects leaderboard data

**Priority:** P1 (critical)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Board has stories completed at different times (some in last 30 days, some 60-90 days ago)
- Different developers may have different activity in different time ranges

**Steps:**
1. Navigate to dashboard and select board with time range set to 90 days → Data loads
2. Note the developers shown and their metrics → Baseline recorded
3. Change time range to 30 days → Data refreshes
4. Compare developers shown with 90-day view → Differences noted

**Expected Result:**
- Leaderboard updates when time range changes
- Only stories completed within selected time range are counted
- Developer counts and ratios may change based on time range
- Loading indicator appears during data refresh

**Verification Method:** Application
**Test Data / Resources:**
- 90-day developers: _______
- 30-day developers: _______

---

### TC-006: All developers with stories are shown

**Priority:** P1 (critical)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Board has developers with varying story counts (including those with only 1 or 2 stories)

**Steps:**
1. In Jira, identify developers with different story counts in the time range → Developer names noted
2. Navigate to dashboard leaderboard → Section visible
3. Verify all developers with at least 1 story appear in the list → All developers found

**Expected Result:**
- All developers who have completed at least 1 story in the time range appear in the list
- No minimum story threshold is applied
- Developers with 1, 2, or any number of stories are included

**Verification Method:** Application + Jira Console
**Test Data / Resources:**
- Developer with 1 story (should appear): _______
- Developer with 2 stories (should appear): _______
- Developer with many stories (should appear): _______

---

## 2. Drill-Down Interaction Tests

### TC-007: Clicking developer row expands detail view

**Priority:** P1 (critical)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Leaderboard displays at least one developer

**Steps:**
1. Navigate to leaderboard section → Section visible
2. Click anywhere on a developer row → Row expands
3. Examine expanded content → Detail view visible

**Expected Result:**
- Clicking row reveals detail/expanded section
- Expanded section shows list of stories assigned to that developer
- Each story displays: Issue key, Summary, Story Points
- Expanded section shows list of bugs attributed to that developer
- Each bug displays: Issue key, Summary, Story Points, Parent story key

**Verification Method:** Application

---

### TC-008: Collapse expanded row

**Priority:** P2 (major)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Developer row is expanded

**Steps:**
1. With a developer row expanded → Detail view visible
2. Click the same row again → Row collapses
3. Verify detail section is hidden → Detail view not visible

**Expected Result:**
- Clicking expanded row again collapses it
- Detail section is hidden
- Row returns to normal appearance
- User can collapse/close to return to main list view

**Verification Method:** Application

---

### TC-009: Expand multiple rows simultaneously

**Priority:** P3 (minor)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Leaderboard has at least 2 developers

**Steps:**
1. Click on first developer row → Row 1 expands
2. Click on second developer row → Row 2 expands
3. Verify both rows are expanded → Both detail views visible

**Expected Result:**
- Multiple rows can be expanded at the same time (OR)
- Expanding one row collapses the previously expanded row (accordion behavior)
- Either behavior is acceptable - document actual behavior

**Verification Method:** Application
**Test Data / Resources:**
- Actual behavior: [ ] Multiple expand  [ ] Accordion (single expand)

---

## 3. Bug Attribution Tests

### TC-010: Bug points attributed to original story assignee

**Priority:** P0 (blocker)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Have a bug that is linked to a story via "is caused by" relationship
- Bug is assigned to Developer B (bug fixer)
- Parent story is assigned to Developer A (original author)

**Steps:**
1. In Jira, note: Bug KEY, Bug points, Bug assignee (B), Parent story KEY, Parent story assignee (A) → Data recorded
2. Navigate to dashboard leaderboard → Section visible
3. Find Developer A in the list → Developer A found
4. Expand Developer A's row → Detail view visible
5. Verify the bug appears in Developer A's bug list → Bug listed under A
6. Find Developer B in the list → Developer B found (if they have stories)
7. Expand Developer B's row → Detail view visible
8. Verify the bug does NOT appear in Developer B's bug list → Bug NOT listed under B

**Expected Result:**
- Bug story points are counted against Developer A (parent story author)
- Bug story points are NOT counted against Developer B (bug fixer)
- Developer A's rework ratio reflects this bug
- Developer B's rework ratio does not include this bug

**Verification Method:** Application + Jira Console
**Test Data / Resources:**
- Bug key: _______
- Bug story points: _______
- Bug assignee (fixer): Developer B = _______
- Parent story key: _______
- Parent story assignee (author): Developer A = _______

---

### TC-011: Bugs without "is caused by" link are excluded

**Priority:** P1 (critical)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Have a bug that does NOT have "is caused by" issue link

**Steps:**
1. In Jira, identify a bug without "is caused by" link → Bug key noted
2. Note the bug's assignee → Assignee noted
3. Navigate to dashboard leaderboard → Section visible
4. Find the bug's assignee in the list (if they have stories) → Developer found
5. Expand their row and check bug list → Bug list visible

**Expected Result:**
- Bug without "is caused by" link does NOT appear in any developer's bug list
- Bug's story points are not counted in any developer's rework ratio

**Verification Method:** Application + Jira Console
**Test Data / Resources:**
- Bug without link: _______
- Bug assignee: _______

---

## 4. Avatar and Display Tests

### TC-012: Developer avatar displays correctly

**Priority:** P2 (major)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Board has developers with Jira profile pictures set

**Steps:**
1. Navigate to leaderboard section → Section visible
2. Examine developer rows → Avatars visible
3. Compare displayed avatar to Jira profile picture → Match verified

**Expected Result:**
- Avatar image matches developer's Jira profile picture
- Avatar is appropriately sized (not distorted)
- Avatar is rounded/circular

**Verification Method:** Application + Jira Console

---

### TC-013: Placeholder shown for missing avatar

**Priority:** P3 (minor)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Board has a developer without a Jira profile picture

**Steps:**
1. Identify developer without Jira avatar → Developer noted
2. Navigate to leaderboard section → Section visible
3. Find that developer's row → Row visible
4. Examine avatar column → Placeholder visible

**Expected Result:**
- Placeholder icon or initials shown instead of blank space
- Placeholder is visually consistent with other avatars (same size, shape)

**Verification Method:** Application + Jira Console
**Test Data / Resources:**
- Developer without avatar: _______

---

## 5. Edge Cases

### TC-014: Board with no developers with stories

**Priority:** P2 (major)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Board where no developers have stories in the time range

**Steps:**
1. Select a board with no recent stories → Board selected
2. Navigate to leaderboard section → Section visible
3. Observe the content → Empty state or message shown

**Expected Result:**
- Empty state message displayed (e.g., "No developers with stories in this period")
- Table is not shown or shows no rows

**Verification Method:** Application

---

### TC-015: Developer with 0% rework ratio

**Priority:** P2 (major)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Developer has stories but no bugs attributed

**Steps:**
1. Identify developer with stories but no attributed bugs → Developer noted
2. Navigate to leaderboard section → Section visible
3. Find that developer in the list → Developer found
4. Check their rework ratio → Ratio displayed

**Expected Result:**
- Rework ratio displays as "0%" or "0.0%"
- Developer appears in the list (not filtered out)
- Row displays correctly without errors

**Verification Method:** Application + Jira Console
**Test Data / Resources:**
- Developer with 0% rework: _______

---

### TC-016: Developer with very high rework ratio (>100%)

**Priority:** P3 (minor)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Developer has bug points exceeding their story points delivered

**Steps:**
1. Identify or create scenario where bug points > story points → Scenario ready
2. Navigate to leaderboard section → Section visible
3. Find that developer → Developer found
4. Check rework ratio display → Ratio displayed

**Expected Result:**
- Ratio >100% displays correctly (e.g., "125%", "150%")
- No display errors or overflow issues
- Sorting still works correctly

**Verification Method:** Application
**Test Data / Resources:**
- Developer with >100% rework (if any): _______

---

### TC-017: Large number of developers

**Priority:** P3 (minor)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Board with 20+ developers who have stories

**Steps:**
1. Select board with many developers → Board selected
2. Navigate to leaderboard section → Section visible
3. Scroll through the list → All developers visible
4. Check for performance issues → Responsiveness noted

**Expected Result:**
- All developers with stories are listed
- Table scrolls smoothly
- No significant lag or performance issues
- Page remains responsive

**Verification Method:** Application

---

### TC-018: Developer with only 1 story

**Priority:** P2 (major)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Developer has exactly 1 story in the time range

**Steps:**
1. Identify developer with exactly 1 story → Developer noted
2. Navigate to leaderboard section → Section visible
3. Find that developer in the list → Developer found
4. Expand their row → Detail view visible
5. Verify 1 story is shown → Story listed

**Expected Result:**
- Developer with 1 story appears in the list
- Rework ratio is calculated correctly
- Expanded view shows the single story
- No warnings or special treatment for low story count

**Verification Method:** Application + Jira Console
**Test Data / Resources:**
- Developer with 1 story: _______

---

## 6. Error Handling Tests

### TC-019: API error displays gracefully

**Priority:** P1 (critical)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Ability to simulate API failure (network disconnect or test environment)

**Steps:**
1. Disconnect network or trigger API failure → Error condition created
2. Navigate to dashboard or refresh → Page loads
3. Observe leaderboard section → Error state visible

**Expected Result:**
- Error message is displayed (not a blank section or spinner stuck forever)
- Error message is user-friendly (not technical stack trace)
- Retry button or refresh option is available

**Verification Method:** Application

---

### TC-020: Retry after error

**Priority:** P2 (major)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Leaderboard is showing error state

**Steps:**
1. With leaderboard showing error → Error visible
2. Restore network connectivity → Network available
3. Click retry button or refresh → Action taken

**Expected Result:**
- Data loads successfully after retry
- Error state is replaced with normal data view
- No stale error messages remain

**Verification Method:** Application

---

## 7. Data Accuracy Verification

### TC-021: Verify rework ratio calculation

**Priority:** P0 (blocker)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Access to Jira to manually calculate expected values

**Steps:**
1. Select a specific developer from the leaderboard → Developer selected
2. Note dashboard values: Story Points Delivered, Bug Points, Rework Ratio → Values recorded
3. In Jira, manually sum story points for this developer's stories in time range → Manual total calculated
4. In Jira, manually sum bug points for bugs attributed to this developer → Manual bug total calculated
5. Calculate expected ratio: (Bug Points / Story Points) × 100 → Expected ratio calculated
6. Compare dashboard ratio to expected ratio → Values compared

**Expected Result:**
- Story Points on dashboard matches Jira manual calculation
- Bug Points on dashboard matches Jira manual calculation
- Rework Ratio = (Bug Points / Story Points) × 100
- Values match within acceptable rounding tolerance

**Verification Method:** Application + Jira Console
**Test Data / Resources:**
- Developer: _______
- Dashboard Story Points: _______
- Jira Story Points: _______
- Dashboard Bug Points: _______
- Jira Bug Points: _______
- Dashboard Rework Ratio: _______
- Calculated Rework Ratio: _______

---

### TC-022: Verify story count accuracy

**Priority:** P1 (critical)
**Type:** Feature
**Module:** Developer Rework Leaderboard
**Preconditions:**
- Access to Jira

**Steps:**
1. Select a developer from leaderboard → Developer selected
2. Note "Stories" count from dashboard → Count recorded
3. Expand the developer row → Stories list visible
4. Count the stories in expanded view → List count recorded
5. In Jira, query stories assigned to this developer in time range → Jira count obtained

**Expected Result:**
- Stories count matches number of items in expanded list
- Count matches Jira query results

**Verification Method:** Application + Jira Console
**Test Data / Resources:**
- Developer: _______
- Dashboard Stories count: _______
- Expanded list count: _______
- Jira query count: _______

---

## Test Summary Checklist

### P0 - Blocker (Must pass before release)
- [ ] TC-001: Leaderboard section displays on dashboard
- [ ] TC-002: Developer rows display with all required columns
- [ ] TC-010: Bug points attributed to original story assignee
- [ ] TC-021: Verify rework ratio calculation

### P1 - Critical (Should pass before release)
- [ ] TC-003: Developers sorted by rework ratio descending
- [ ] TC-005: Time range selector affects leaderboard data
- [ ] TC-006: All developers with stories are shown
- [ ] TC-007: Clicking developer row expands detail view
- [ ] TC-011: Bugs without "is caused by" link are excluded
- [ ] TC-019: API error displays gracefully
- [ ] TC-022: Verify story count accuracy

### P2 - Major (Should be addressed)
- [ ] TC-004: Contextual disclaimer is displayed
- [ ] TC-008: Collapse expanded row
- [ ] TC-012: Developer avatar displays correctly
- [ ] TC-014: Board with no developers with stories
- [ ] TC-015: Developer with 0% rework ratio
- [ ] TC-018: Developer with only 1 story
- [ ] TC-020: Retry after error

### P3 - Minor (Nice to have)
- [ ] TC-009: Expand multiple rows simultaneously
- [ ] TC-013: Placeholder shown for missing avatar
- [ ] TC-016: Developer with very high rework ratio
- [ ] TC-017: Large number of developers
