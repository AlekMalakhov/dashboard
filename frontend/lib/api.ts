/**
 * API client for backend communication
 * Handles all HTTP requests to the backend with proper typing
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
 * Rework metrics response from backend
 */
export interface ReworkMetrics {
  rework_ratio: number;
  stories_analyzed: number;
  bugs_linked: number;
  story_points_delivered: number;
  rework_points: number;
  items_excluded: number;
  warning: string | null;
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
 * Fetches rework metrics for a specific board and time range
 *
 * @param boardId - The ID of the board to fetch metrics for
 * @param days - The time range in days (30, 60, or 90)
 * @returns Promise<ReworkMetrics> The rework metrics
 * @throws Error if the request fails
 */
export async function getReworkMetrics(
  boardId: number,
  days: 30 | 60 | 90
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
