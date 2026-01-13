/**
 * Service for calculating rework metrics from Jira data.
 * Ported from Python backend/app/rework/service.py
 */

import {
  getJiraClient,
  type JiraIssue,
  type JiraSearchResponse,
  type JiraField,
  type JiraBoardProjectResponse,
} from './jira-client';

// Types for rework metrics
export interface IssueDetail {
  key: string;
  summary: string;
  story_points: number | null;
}

export interface ReworkMetricsResponse {
  rework_ratio: number;
  stories_analyzed: number;
  bugs_linked: number;
  story_points_delivered: number;
  rework_points: number;
  items_excluded: number;
  warning: string | null;
  bugs: IssueDetail[];
  stories: IssueDetail[];
}

export interface WeeklyDataPoint {
  week_start_date: string;
  rework_ratio: number;
  rework_points: number;
  delivered_points: number;
  bugs_count: number;
  stories_count: number;
}

export interface ReworkTrendResponse {
  weeks: WeeklyDataPoint[];
  total_weeks: number;
  items_excluded: number;
  warning: string | null;
}

// Cache for story points field ID
let storyPointsFieldCache: string | null = null;

/**
 * Get the project key associated with a board.
 */
async function getBoardProjectKey(boardId: number): Promise<string | null> {
  try {
    const jira = getJiraClient();
    const data = await jira.get<JiraBoardProjectResponse>(
      `/rest/agile/1.0/board/${boardId}/project`
    );

    if (data.values && data.values.length > 0) {
      return data.values[0].key;
    }
    return null;
  } catch (error) {
    console.error(`Failed to get project for board ${boardId}:`, error);
    return null;
  }
}

/**
 * Auto-detect the story points custom field in Jira.
 */
async function detectStoryPointsField(): Promise<string | null> {
  if (storyPointsFieldCache) {
    return storyPointsFieldCache;
  }

  try {
    const jira = getJiraClient();
    const fields = await jira.get<JiraField[]>('/rest/api/3/field');

    let storyPointsField: string | null = null;
    let estimateField: string | null = null;

    for (const field of fields) {
      const fieldName = field.name || '';
      const fieldId = field.id;

      if (fieldName === 'Story Points') {
        storyPointsField = fieldId;
      } else if (
        fieldName.toLowerCase().includes('story point') &&
        !storyPointsField
      ) {
        estimateField = fieldId;
      }
    }

    const result = storyPointsField || estimateField;
    if (result) {
      storyPointsFieldCache = result;
    }
    return result;
  } catch (error) {
    console.error('Failed to detect story points field:', error);
    return null;
  }
}

/**
 * Fetch completed bugs from Jira for a project.
 */
async function fetchBugs(
  projectKey: string,
  days: number,
  storyPointsFieldId: string | null
): Promise<JiraIssue[]> {
  const jira = getJiraClient();

  const jql = `project = ${projectKey} AND type = Bug AND statusCategory = Done AND "Story Points" IS NOT EMPTY AND resolved >= "-${days}d"`;

  let fields = 'key,summary,created,resolutiondate';
  if (storyPointsFieldId) {
    fields += `,${storyPointsFieldId}`;
  }

  const allIssues: JiraIssue[] = [];
  let nextPageToken: string | null = null;

  while (true) {
    const params: Record<string, string | number | undefined> = {
      jql,
      fields,
      maxResults: 100,
    };
    if (nextPageToken) {
      params.nextPageToken = nextPageToken;
    }

    const data = await jira.get<JiraSearchResponse>(
      '/rest/api/3/search/jql',
      params
    );
    allIssues.push(...data.issues);

    if (data.isLast) {
      break;
    }

    nextPageToken = data.nextPageToken || null;
  }

  return allIssues;
}

/**
 * Fetch completed stories and tasks from Jira for a project.
 */
async function fetchCompletedStories(
  projectKey: string,
  days: number,
  storyPointsFieldId: string | null
): Promise<JiraIssue[]> {
  const jira = getJiraClient();

  const jql = `project = ${projectKey} AND type IN (Story, Task) AND statusCategory = Done AND "Story Points" IS NOT EMPTY AND resolved >= "-${days}d"`;

  let fields = 'key,summary,resolutiondate';
  if (storyPointsFieldId) {
    fields += `,${storyPointsFieldId}`;
  }

  const allIssues: JiraIssue[] = [];
  let nextPageToken: string | null = null;

  while (true) {
    const params: Record<string, string | number | undefined> = {
      jql,
      fields,
      maxResults: 100,
    };
    if (nextPageToken) {
      params.nextPageToken = nextPageToken;
    }

    const data = await jira.get<JiraSearchResponse>(
      '/rest/api/3/search/jql',
      params
    );
    allIssues.push(...data.issues);

    if (data.isLast) {
      break;
    }

    nextPageToken = data.nextPageToken || null;
  }

  return allIssues;
}

/**
 * Calculate rework metrics for a Jira board.
 */
export async function getReworkMetrics(
  boardId: number,
  days: number
): Promise<ReworkMetricsResponse> {
  // Step 1: Get project key for the board
  const projectKey = await getBoardProjectKey(boardId);
  if (!projectKey) {
    throw new Error(`Could not find project for board ${boardId}`);
  }

  // Step 2: Detect story points field
  const storyPointsFieldId = await detectStoryPointsField();

  // Step 3: Fetch bugs and completed stories in parallel
  const [bugs, completedStories] = await Promise.all([
    fetchBugs(projectKey, days, storyPointsFieldId),
    fetchCompletedStories(projectKey, days, storyPointsFieldId),
  ]);

  // Step 4: Count all bugs
  const bugsLinked = bugs.length;
  const storiesAnalyzed = completedStories.length;

  // Step 5: Calculate rework points
  let reworkPoints = 0;
  let bugsWithoutPoints = 0;
  const bugDetails: IssueDetail[] = [];

  for (const bug of bugs) {
    const bugKey = bug.key;
    const bugSummary = (bug.fields.summary as string) || '';
    let points: number | null = null;

    if (storyPointsFieldId) {
      const pointsValue = bug.fields[storyPointsFieldId];
      if (typeof pointsValue === 'number' && pointsValue > 0) {
        points = pointsValue;
        reworkPoints += points;
      }
    }

    if (points === null) {
      bugsWithoutPoints++;
    }

    bugDetails.push({
      key: bugKey,
      summary: bugSummary,
      story_points: points,
    });
  }

  // Step 6: Calculate delivered points
  let storyPointsDelivered = 0;
  let storiesWithoutPoints = 0;
  const storyDetails: IssueDetail[] = [];

  for (const story of completedStories) {
    const storyKey = story.key;
    const storySummary = (story.fields.summary as string) || '';
    let points: number | null = null;

    if (storyPointsFieldId) {
      const pointsValue = story.fields[storyPointsFieldId];
      if (typeof pointsValue === 'number' && pointsValue > 0) {
        points = pointsValue;
        storyPointsDelivered += points;
      }
    }

    if (points === null) {
      storiesWithoutPoints++;
    }

    storyDetails.push({
      key: storyKey,
      summary: storySummary,
      story_points: points,
    });
  }

  const itemsExcluded = bugsWithoutPoints + storiesWithoutPoints;

  // Calculate ratio
  let reworkRatio = 0;
  if (storyPointsDelivered > 0) {
    reworkRatio = Math.round((reworkPoints / storyPointsDelivered) * 1000) / 10;
  }

  // Warning message
  let warning: string | null = null;
  if (!storyPointsFieldId) {
    warning = 'Story points field not found in Jira';
  } else if (itemsExcluded > 0) {
    warning = `${itemsExcluded} items excluded (no story points)`;
  }

  return {
    rework_ratio: reworkRatio,
    stories_analyzed: storiesAnalyzed,
    bugs_linked: bugsLinked,
    story_points_delivered: storyPointsDelivered,
    rework_points: reworkPoints,
    items_excluded: itemsExcluded,
    warning,
    bugs: bugDetails,
    stories: storyDetails,
  };
}

/**
 * Get Monday (start of week) for a given date string.
 */
function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const dayOfWeek = date.getUTCDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
  date.setUTCDate(date.getUTCDate() - diff);
  return date.toISOString().split('T')[0];
}

/**
 * Group issues by week start date and sum story points.
 */
function groupIssuesByWeek(
  issues: JiraIssue[],
  storyPointsFieldId: string | null
): Map<string, { points: number; count: number }> {
  const weeks = new Map<string, { points: number; count: number }>();

  for (const issue of issues) {
    const resolvedDate = issue.fields.resolutiondate as string | undefined;
    if (!resolvedDate) continue;

    const weekStart = getWeekStart(resolvedDate);

    let points = 0;
    if (storyPointsFieldId) {
      const pointsValue = issue.fields[storyPointsFieldId];
      if (typeof pointsValue === 'number') {
        points = pointsValue;
      }
    }

    const existing = weeks.get(weekStart) || { points: 0, count: 0 };
    weeks.set(weekStart, {
      points: existing.points + points,
      count: existing.count + 1,
    });
  }

  return weeks;
}

/**
 * Generate all Monday dates between start and end date.
 */
function generateAllWeeks(startDate: Date, endDate: Date): string[] {
  const weeks: string[] = [];

  // Get Monday of the start week
  const current = new Date(startDate);
  const dayOfWeek = current.getUTCDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  current.setUTCDate(current.getUTCDate() - diff);

  while (current <= endDate) {
    weeks.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 7);
  }

  return weeks;
}

/**
 * Calculate weekly rework ratio trend for a Jira board.
 */
export async function getReworkTrend(
  boardId: number,
  months: number
): Promise<ReworkTrendResponse> {
  // Step 1: Get project key for the board
  const projectKey = await getBoardProjectKey(boardId);
  if (!projectKey) {
    throw new Error(`Could not find project for board ${boardId}`);
  }

  // Step 2: Detect story points field
  const storyPointsFieldId = await detectStoryPointsField();

  // Step 3: Calculate date range
  const days = months * 30;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Step 4: Fetch all bugs and stories in parallel
  const [bugs, stories] = await Promise.all([
    fetchBugs(projectKey, days, storyPointsFieldId),
    fetchCompletedStories(projectKey, days, storyPointsFieldId),
  ]);

  // Step 5: Group by week
  const bugsByWeek = groupIssuesByWeek(bugs, storyPointsFieldId);
  const storiesByWeek = groupIssuesByWeek(stories, storyPointsFieldId);

  // Step 6: Generate all weeks in range
  const allWeeks = generateAllWeeks(startDate, endDate);

  // Step 7: Calculate metrics per week
  const weeklyData: WeeklyDataPoint[] = [];

  for (const weekStart of allWeeks) {
    const bugData = bugsByWeek.get(weekStart) || { points: 0, count: 0 };
    const storyData = storiesByWeek.get(weekStart) || { points: 0, count: 0 };

    let reworkRatio = 0;
    if (storyData.points > 0) {
      reworkRatio =
        Math.round((bugData.points / storyData.points) * 1000) / 10;
    }

    weeklyData.push({
      week_start_date: weekStart,
      rework_ratio: reworkRatio,
      rework_points: bugData.points,
      delivered_points: storyData.points,
      bugs_count: bugData.count,
      stories_count: storyData.count,
    });
  }

  // Step 8: Count items without story points
  let bugsWithoutPoints = 0;
  let storiesWithoutPoints = 0;

  if (storyPointsFieldId) {
    for (const bug of bugs) {
      if (!bug.fields[storyPointsFieldId]) {
        bugsWithoutPoints++;
      }
    }
    for (const story of stories) {
      if (!story.fields[storyPointsFieldId]) {
        storiesWithoutPoints++;
      }
    }
  }

  const totalItemsExcluded = bugsWithoutPoints + storiesWithoutPoints;

  // Warning message
  let warning: string | null = null;
  if (!storyPointsFieldId) {
    warning = 'Story points field not found in Jira';
  } else if (totalItemsExcluded > 0) {
    warning = `${totalItemsExcluded} items excluded (no story points)`;
  }

  return {
    weeks: weeklyData,
    total_weeks: weeklyData.length,
    items_excluded: totalItemsExcluded,
    warning,
  };
}
