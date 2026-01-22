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
 * Valid time range options in months for trend data
 */
export type TrendTimeRange = 1 | 2 | 3 | 6;

/**
 * Fetches rework trend data for a specific board and time range
 *
 * @param boardId - The ID of the board to fetch trend data for
 * @param months - The time range in months (1, 3, or 6)
 * @returns Promise<ReworkTrendResponse> The rework trend data
 * @throws Error if the request fails
 */
export async function getReworkTrend(
  boardId: number,
  months: TrendTimeRange = 3
): Promise<ReworkTrendResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/rework/trend?board_id=${boardId}&months=${months}`,
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
