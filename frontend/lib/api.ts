/**
 * API client for backend communication
 * Handles all HTTP requests to the backend with proper typing
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Custom error for session expiry
 */
export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'SessionExpiredError';
  }
}

/**
 * Wrapper for fetch that handles 401 responses by throwing SessionExpiredError
 * This allows components to handle session expiry consistently
 *
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Promise<Response> The fetch response
 * @throws SessionExpiredError if response status is 401
 */
async function fetchWithAuth(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const response = await fetch(url, options);

  // If we get a 401, the session has expired
  if (response.status === 401) {
    throw new SessionExpiredError();
  }

  return response;
}

/**
 * Session response from backend
 */
export interface SessionResponse {
  authenticated: boolean;
  user: { id: string } | null;
}

/**
 * Logout response from backend
 */
export interface LogoutResponse {
  success: boolean;
}

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
 * Fetches the current session status from the backend
 *
 * @returns Promise<SessionResponse> The session status
 * @throws Error if the request fails
 */
export async function getSession(): Promise<SessionResponse> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/auth/session`, {
      method: 'GET',
      credentials: 'include', // Include cookies for session management
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.statusText}`);
    }

    const data: SessionResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching session:', error);
    throw error;
  }
}

/**
 * Logs out the current user by clearing the session
 *
 * @returns Promise<LogoutResponse> The logout status
 * @throws Error if the request fails
 */
export async function logout(): Promise<LogoutResponse> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include', // Include cookies for session management
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to logout: ${response.statusText}`);
    }

    const data: LogoutResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
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
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/boards`, {
      method: 'GET',
      credentials: 'include', // Include cookies for session management
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch boards: ${response.statusText}`);
    }

    const data: BoardsResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching boards:', error);
    throw error;
  }
}

/**
 * Fetches rework metrics for a specific board and time range
 *
 * @param boardId - The ID of the board to fetch metrics for
 * @param days - The time range in days (30, 60, or 90)
 * @returns Promise<ReworkMetrics> The rework metrics
 * @throws SessionExpiredError if the session has expired
 * @throws Error if the request fails
 */
export async function getReworkMetrics(
  boardId: number,
  days: 30 | 60 | 90
): Promise<ReworkMetrics> {
  try {
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/rework?board_id=${boardId}&days=${days}`,
      {
        method: 'GET',
        credentials: 'include', // Include cookies for session management
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch rework metrics: ${response.statusText}`);
    }

    const data: ReworkMetrics = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching rework metrics:', error);
    throw error;
  }
}
