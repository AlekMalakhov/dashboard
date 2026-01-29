/**
 * API client for backend communication
 * Handles all HTTP requests to the backend with proper typing
 */

// Use relative paths for API calls (works with Next.js API routes on Vercel)
// Fall back to external backend URL for local development if NEXT_PUBLIC_API_URL is set
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Board object from backend
 */
export interface Board {
  id: number;
  name: string;
}

/**
 * Boards response from backend
 */
export interface BoardsResponse {
  boards: Board[];
}

/**
 * Issue detail for drill-down
 */
export interface IssueDetail {
  key: string;
  summary: string;
  story_points: number | null; // Can be decimal (e.g., 2.5)
}

/**
 * Rework metrics response from backend
 */
export interface ReworkMetrics {
  rework_ratio: number; // Percentage with 1 decimal (e.g., 35.3)
  stories_analyzed: number;
  bugs_linked: number;
  story_points_delivered: number; // Can be decimal
  rework_points: number; // Can be decimal
  items_excluded: number;
  warning: string | null;
  bugs: IssueDetail[];
  stories: IssueDetail[];
}

/**
 * Fetches the list of available boards from the backend
 *
 * @returns Promise<BoardsResponse> The list of boards
 * @throws Error if the request fails
 */
export async function getBoards(): Promise<BoardsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/boards`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch boards: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Time range constants for the slider
 */
export const TIME_RANGE_MIN = 7;
export const TIME_RANGE_MAX = 180;
export const TIME_RANGE_DEFAULT = 90;
export const TIME_RANGE_PRESETS = [30, 60, 90, 180] as const;

/**
 * Valid time range in days (any value from 7 to 180)
 */
export type TimeRange = number;

/**
 * Fetches rework metrics for a specific board and time range
 *
 * @param boardId - The ID of the board to fetch metrics for
 * @param days - The time range in days (30, 60, 84, or 90)
 * @returns Promise<ReworkMetrics> The rework metrics
 * @throws Error if the request fails
 */
export async function getReworkMetrics(
  boardId: number,
  days: TimeRange
): Promise<ReworkMetrics> {
  const response = await fetch(
    `${API_BASE_URL}/api/rework?board_id=${boardId}&days=${days}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch rework metrics: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Weekly data point for rework trend
 */
export interface WeeklyDataPoint {
  week_start_date: string;
  rework_ratio: number;
  rework_points: number;
  delivered_points: number;
  bugs_count: number;
  stories_count: number;
}

/**
 * Rework trend response from backend
 */
export interface ReworkTrendResponse {
  weeks: WeeklyDataPoint[];
  total_weeks: number;
  items_excluded: number;
  warning?: string;
}

/**
 * Fetches rework trend data for a specific board and time range
 *
 * @param boardId - The ID of the board to fetch trend data for
 * @param days - The time range in days (7-180)
 * @returns Promise<ReworkTrendResponse> The rework trend data
 * @throws Error if the request fails
 */
export async function getReworkTrend(
  boardId: number,
  days: number = 90
): Promise<ReworkTrendResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/rework/trend?board_id=${boardId}&days=${days}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch rework trend: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Issue detail for developer drill-down
 */
export interface DeveloperIssueDetail {
  key: string;
  summary: string;
  story_points: number | null;
  parent_key?: string;
}

/**
 * Metrics for a single developer
 */
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

/**
 * Developer leaderboard response from backend
 */
export interface DeveloperLeaderboardResponse {
  developers: DeveloperMetrics[];
  total_developers: number;
  developers_excluded: number;
  warning: string | null;
}

/**
 * Fetches developer leaderboard for a specific board and time range
 *
 * @param boardId - The ID of the board to fetch leaderboard for
 * @param days - The time range in days (7-180)
 * @returns Promise<DeveloperLeaderboardResponse> The developer leaderboard data
 * @throws Error if the request fails
 */
export async function getDeveloperLeaderboard(
  boardId: number,
  days: number
): Promise<DeveloperLeaderboardResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/rework/developers?board_id=${boardId}&days=${days}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch developer leaderboard: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Bug linked to a ticket
 */
export interface LinkedBug {
  key: string;
  summary: string;
  link_type: string;
}

/**
 * A ticket with linked bugs
 */
export interface TopTicketItem {
  key: string;
  summary: string;
  issue_type: string;
  bug_count: number;
  bugs: LinkedBug[];
}

/**
 * Top tickets with bugs response from backend
 */
export interface TopTicketsWithBugsResponse {
  tickets: TopTicketItem[];
  total_tickets_with_bugs: number;
  time_range_days: number;
  link_types_used: string[];
}

/**
 * Fetches top tickets with linked bugs for a specific board and time range
 *
 * @param boardId - The ID of the board to fetch tickets for
 * @param days - The time range in days (7-180)
 * @param limit - Maximum number of tickets to return
 * @returns Promise<TopTicketsWithBugsResponse> The top tickets with bugs data
 * @throws Error if the request fails
 */
export async function getTopTicketsWithBugs(
  boardId: number,
  days: number,
  limit: number
): Promise<TopTicketsWithBugsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/rework/top-tickets-with-bugs?board_id=${boardId}&days=${days}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch top tickets: ${response.statusText}`);
  }

  return response.json();
}
