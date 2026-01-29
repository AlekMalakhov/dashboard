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

  console.log(`[fetchBugs] JQL: ${jql}`);

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

  console.log(`[fetchCompletedStories] JQL: ${jql}`);

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
  days: number
): Promise<ReworkTrendResponse> {
  // Step 1: Get project key for the board
  const projectKey = await getBoardProjectKey(boardId);
  if (!projectKey) {
    throw new Error(`Could not find project for board ${boardId}`);
  }

  // Step 2: Detect story points field
  const storyPointsFieldId = await detectStoryPointsField();

  // Step 3: Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Align startDate to Monday of that week for complete week data
  // This ensures displayed weeks have all their data fetched
  const dayOfWeek = startDate.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startDate.setUTCDate(startDate.getUTCDate() - daysSinceMonday);
  // Recalculate days to include the full start week
  // Add 1 day to account for time-of-day precision in Jira's relative date queries
  const fetchDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Step 4: Fetch all bugs and stories in parallel
  const [bugs, stories] = await Promise.all([
    fetchBugs(projectKey, fetchDays, storyPointsFieldId),
    fetchCompletedStories(projectKey, fetchDays, storyPointsFieldId),
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

// Types for top tickets with bugs
export interface LinkedBug {
  key: string;
  summary: string;
  link_type: string;
}

export interface TopTicketItem {
  key: string;
  summary: string;
  issue_type: string;
  bug_count: number;
  bugs: LinkedBug[];
}

export interface TopTicketsWithBugsResponse {
  tickets: TopTicketItem[];
  total_tickets_with_bugs: number;
  time_range_days: number;
  link_types_used: string[];
}

// Types for developer leaderboard
export interface DeveloperIssueDetail {
  key: string;
  summary: string;
  story_points: number | null;
  parent_key?: string;
}

export interface DeveloperMetrics {
  account_id: string;
  display_name: string;
  avatar_url: string | null;
  rework_ratio: number;
  stories_count: number;
  story_points_delivered: number;
  bugs_count: number;
  bug_points: number;
  stories: DeveloperIssueDetail[];
  bugs: DeveloperIssueDetail[];
}

export interface DeveloperLeaderboardResponse {
  developers: DeveloperMetrics[];
  total_developers: number;
  developers_excluded: number;
  warning: string | null;
}

interface JiraAssignee {
  accountId: string;
  displayName: string;
  avatarUrls?: {
    '48x48'?: string;
  };
}

interface JiraIssueLink {
  type: {
    name: string;
    inward: string;
    outward: string;
  };
  inwardIssue?: {
    key: string;
  };
  outwardIssue?: {
    key: string;
  };
}

/**
 * Fetch completed stories with assignee information.
 */
async function fetchStoriesWithAssignee(
  projectKey: string,
  days: number,
  storyPointsFieldId: string | null
): Promise<JiraIssue[]> {
  const jira = getJiraClient();

  const jql = `project = ${projectKey} AND type IN (Story, Task) AND statusCategory = Done AND "Story Points" IS NOT EMPTY AND resolved >= "-${days}d"`;

  let fields = 'key,summary,assignee,resolutiondate';
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
 * Fetch bugs with assignee and issue links for attribution.
 */
async function fetchBugsWithLinks(
  projectKey: string,
  days: number,
  storyPointsFieldId: string | null
): Promise<JiraIssue[]> {
  const jira = getJiraClient();

  const jql = `project = ${projectKey} AND type = Bug AND statusCategory = Done AND "Story Points" IS NOT EMPTY AND resolved >= "-${days}d"`;

  let fields = 'key,summary,assignee,resolutiondate,issuelinks';
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
 * Get developer leaderboard with rework metrics per developer.
 */
export async function getDeveloperLeaderboard(
  boardId: number,
  days: number
): Promise<DeveloperLeaderboardResponse> {
  // Step 1: Get project key for the board
  const projectKey = await getBoardProjectKey(boardId);
  if (!projectKey) {
    throw new Error(`Could not find project for board ${boardId}`);
  }

  // Step 2: Detect story points field
  const storyPointsFieldId = await detectStoryPointsField();

  // Step 3: Fetch stories and bugs in parallel
  const [stories, bugs] = await Promise.all([
    fetchStoriesWithAssignee(projectKey, days, storyPointsFieldId),
    fetchBugsWithLinks(projectKey, days, storyPointsFieldId),
  ]);

  console.log(`[getDeveloperLeaderboard] Fetched ${stories.length} stories and ${bugs.length} bugs`);

  // Step 4: Build developer data from stories
  const developerData = new Map<string, {
    displayName: string;
    avatarUrl: string | null;
    stories: DeveloperIssueDetail[];
    bugs: DeveloperIssueDetail[];
    storyPoints: number;
    bugPoints: number;
  }>();

  // Build a map of story key -> assignee for bug attribution
  const storyAssigneeMap = new Map<string, string>();

  for (const story of stories) {
    const assignee = story.fields.assignee as JiraAssignee | null;
    if (!assignee || !assignee.accountId) continue;

    const accountId = assignee.accountId;
    const storyKey = story.key;

    storyAssigneeMap.set(storyKey, accountId);

    let points = 0;
    if (storyPointsFieldId) {
      const pointsValue = story.fields[storyPointsFieldId];
      if (typeof pointsValue === 'number') {
        points = pointsValue;
      }
    }

    if (!developerData.has(accountId)) {
      developerData.set(accountId, {
        displayName: assignee.displayName || 'Unknown',
        avatarUrl: assignee.avatarUrls?.['48x48'] || null,
        stories: [],
        bugs: [],
        storyPoints: 0,
        bugPoints: 0,
      });
    }

    const dev = developerData.get(accountId)!;
    dev.stories.push({
      key: storyKey,
      summary: (story.fields.summary as string) || '',
      story_points: points || null,
    });
    dev.storyPoints += points;
  }

  // Step 5: Attribute bugs to parent story's assignee
  let bugsAttributed = 0;
  let bugsSkippedNoLink = 0;
  let bugsSkippedNoParent = 0;

  for (const bug of bugs) {
    const issueLinks = bug.fields.issuelinks as JiraIssueLink[] | undefined;
    if (!issueLinks || issueLinks.length === 0) {
      bugsSkippedNoLink++;
      continue;
    }

    // Find "is caused by" link
    let parentStoryKey: string | null = null;
    for (const link of issueLinks) {
      const inwardText = link.type?.inward?.toLowerCase() || '';
      if (inwardText.includes('caused by') && link.inwardIssue?.key) {
        parentStoryKey = link.inwardIssue.key;
        break;
      }
    }

    if (!parentStoryKey) {
      bugsSkippedNoLink++;
      console.log(`[getDeveloperLeaderboard] Bug ${bug.key} has no "is caused by" link. Links:`,
        issueLinks.map(l => ({ type: l.type?.inward, inward: l.inwardIssue?.key, outward: l.outwardIssue?.key })));
      continue;
    }

    // Get the parent story's assignee
    const parentAssigneeId = storyAssigneeMap.get(parentStoryKey);
    if (!parentAssigneeId) {
      bugsSkippedNoParent++;
      console.log(`[getDeveloperLeaderboard] Bug ${bug.key} parent ${parentStoryKey} not found in stories (maybe outside time range or unassigned)`);
      continue;
    }

    // Only attribute if we have this developer in our data
    const dev = developerData.get(parentAssigneeId);
    if (!dev) continue;

    let bugPoints = 0;
    if (storyPointsFieldId) {
      const pointsValue = bug.fields[storyPointsFieldId];
      if (typeof pointsValue === 'number') {
        bugPoints = pointsValue;
      }
    }

    console.log(`[getDeveloperLeaderboard] Bug ${bug.key} (${bugPoints} pts) -> parent ${parentStoryKey} -> developer ${dev.displayName}`);

    dev.bugs.push({
      key: bug.key,
      summary: (bug.fields.summary as string) || '',
      story_points: bugPoints || null,
      parent_key: parentStoryKey,
    });
    dev.bugPoints += bugPoints;
    bugsAttributed++;
  }

  console.log(`[getDeveloperLeaderboard] Bug attribution: ${bugsAttributed} attributed, ${bugsSkippedNoLink} skipped (no link), ${bugsSkippedNoParent} skipped (parent not in range)`);

  // Step 6: Calculate metrics (no minimum threshold)
  const developers: DeveloperMetrics[] = [];

  for (const [accountId, data] of developerData.entries()) {
    // Include all developers with at least 1 story
    if (data.stories.length === 0) {
      continue;
    }

    const reworkRatio = data.storyPoints > 0
      ? Math.round((data.bugPoints / data.storyPoints) * 1000) / 10
      : 0;

    developers.push({
      account_id: accountId,
      display_name: data.displayName,
      avatar_url: data.avatarUrl,
      rework_ratio: reworkRatio,
      stories_count: data.stories.length,
      story_points_delivered: data.storyPoints,
      bugs_count: data.bugs.length,
      bug_points: data.bugPoints,
      stories: data.stories,
      bugs: data.bugs,
    });
  }

  // Sort by rework ratio descending
  developers.sort((a, b) => b.rework_ratio - a.rework_ratio);

  return {
    developers,
    total_developers: developers.length,
    developers_excluded: 0,
    warning: null,
  };
}

/**
 * Fetch bugs created within time range with issue links.
 */
async function fetchBugsCreatedWithLinks(
  projectKey: string,
  days: number
): Promise<JiraIssue[]> {
  const jira = getJiraClient();

  // Filter by creation date (not resolution date) for bugs
  const jql = `project = ${projectKey} AND type = Bug AND created >= "-${days}d"`;

  console.log(`[fetchBugsCreatedWithLinks] JQL: ${jql}`);

  const fields = 'key,summary,issuelinks,issuetype';

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
 * Fetch tickets by their keys.
 */
async function fetchTicketsByKeys(keys: string[]): Promise<JiraIssue[]> {
  if (keys.length === 0) return [];

  const jira = getJiraClient();

  // Batch fetch in chunks of 50 to avoid JQL length limits
  const allTickets: JiraIssue[] = [];
  const chunkSize = 50;

  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    const jql = `key IN (${chunk.map(k => `"${k}"`).join(',')})`;

    const params: Record<string, string | number | undefined> = {
      jql,
      fields: 'key,summary,issuetype',
      maxResults: 100,
    };

    const data = await jira.get<JiraSearchResponse>(
      '/rest/api/3/search/jql',
      params
    );
    allTickets.push(...data.issues);
  }

  return allTickets;
}

/**
 * Extract linked parent tickets from a bug's issue links.
 * Returns array of [ticket_key, link_type] tuples.
 */
function extractLinkedTickets(
  bug: JiraIssue,
  linkTypes: string[]
): [string, string][] {
  const links: [string, string][] = [];
  const issueLinks = bug.fields.issuelinks as JiraIssueLink[] | undefined;

  if (!issueLinks) return links;

  for (const link of issueLinks) {
    const linkTypeName = link.type?.name?.toLowerCase() || '';
    const inwardText = link.type?.inward?.toLowerCase() || '';

    // Check "is caused by" - bug points to story via inwardIssue
    if (inwardText.includes('caused by') && link.inwardIssue?.key) {
      if (linkTypes.some(lt => lt.toLowerCase().includes('caused by'))) {
        links.push([link.inwardIssue.key, 'is caused by']);
      }
    }

    // Check "relates to" - bidirectional, check both directions
    if (linkTypeName.includes('relates') || inwardText.includes('relates')) {
      if (linkTypes.some(lt => lt.toLowerCase().includes('relates'))) {
        if (link.inwardIssue?.key) {
          links.push([link.inwardIssue.key, 'relates to']);
        }
        if (link.outwardIssue?.key) {
          links.push([link.outwardIssue.key, 'relates to']);
        }
      }
    }
  }

  return links;
}

/**
 * Get top tickets ranked by number of linked bugs.
 */
export async function getTopTicketsWithBugs(
  boardId: number,
  days: number,
  limit: number
): Promise<TopTicketsWithBugsResponse> {
  // Step 1: Get project key for the board
  const projectKey = await getBoardProjectKey(boardId);
  if (!projectKey) {
    throw new Error(`Could not find project for board ${boardId}`);
  }

  // Step 2: Define link types to process
  const linkTypes = ['is caused by', 'relates to'];

  // Step 3: Fetch bugs created within time range
  const bugs = await fetchBugsCreatedWithLinks(projectKey, days);

  console.log(`[getTopTicketsWithBugs] Found ${bugs.length} bugs created in last ${days} days`);

  // Step 4: Group bugs by linked parent ticket
  const ticketBugsMap = new Map<string, LinkedBug[]>();

  for (const bug of bugs) {
    const linkedTickets = extractLinkedTickets(bug, linkTypes);

    for (const [ticketKey, linkType] of linkedTickets) {
      if (!ticketBugsMap.has(ticketKey)) {
        ticketBugsMap.set(ticketKey, []);
      }

      const existingBugs = ticketBugsMap.get(ticketKey)!;
      // Deduplicate: only add if not already linked
      if (!existingBugs.some(b => b.key === bug.key)) {
        existingBugs.push({
          key: bug.key,
          summary: (bug.fields.summary as string) || '',
          link_type: linkType,
        });
      }
    }
  }

  console.log(`[getTopTicketsWithBugs] Found ${ticketBugsMap.size} unique parent tickets`);

  // Step 5: Fetch parent ticket details
  const parentKeys = Array.from(ticketBugsMap.keys());
  const parentTickets = await fetchTicketsByKeys(parentKeys);

  // Step 6: Build ranked list
  const rankedItems: TopTicketItem[] = [];

  for (const ticket of parentTickets) {
    const key = ticket.key;
    const linkedBugs = ticketBugsMap.get(key);

    if (linkedBugs && linkedBugs.length > 0) {
      const issueType = ticket.fields.issuetype as { name: string } | undefined;
      rankedItems.push({
        key,
        summary: (ticket.fields.summary as string) || '',
        issue_type: issueType?.name || 'Unknown',
        bug_count: linkedBugs.length,
        bugs: linkedBugs,
      });
    }
  }

  // Step 7: Sort by bug count (descending) and apply limit
  rankedItems.sort((a, b) => b.bug_count - a.bug_count);

  return {
    tickets: rankedItems.slice(0, limit),
    total_tickets_with_bugs: rankedItems.length,
    time_range_days: days,
    link_types_used: linkTypes,
  };
}
