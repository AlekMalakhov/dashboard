/**
 * Jira API client for server-side API routes.
 * Uses Basic Auth with email + API token.
 */

// Types for Jira API responses
export interface JiraIssue {
  key: string;
  fields: Record<string, unknown>;
}

export interface JiraSearchResponse {
  issues: JiraIssue[];
  nextPageToken?: string | null;
  isLast: boolean;
}

export interface JiraBoardProject {
  key: string;
  name: string;
}

export interface JiraBoardProjectResponse {
  values: JiraBoardProject[];
}

export interface JiraBoard {
  id: number;
  name: string;
  location?: {
    projectName?: string;
  };
}

export interface JiraBoardsResponse {
  values: JiraBoard[];
  isLast: boolean;
}

export interface JiraField {
  id: string;
  name: string;
}

class JiraClient {
  private baseUrl: string;
  private authHeader: string;

  constructor() {
    const siteUrl = process.env.JIRA_SITE_URL;
    const email = process.env.JIRA_USER_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;

    if (!siteUrl) {
      throw new Error('JIRA_SITE_URL environment variable is required');
    }
    if (!email) {
      throw new Error('JIRA_USER_EMAIL environment variable is required');
    }
    if (!apiToken) {
      throw new Error('JIRA_API_TOKEN environment variable is required');
    }

    this.baseUrl = siteUrl.replace(/\/$/, '');
    const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  private getHeaders(): HeadersInit {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | undefined>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new JiraApiError(
        `Jira API error: ${response.status} ${response.statusText}`,
        response.status,
        errorText
      );
    }

    return response.json();
  }
}

export class JiraApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: string
  ) {
    super(message);
    this.name = 'JiraApiError';
  }
}

// Singleton instance
let jiraClient: JiraClient | null = null;

export function getJiraClient(): JiraClient {
  if (!jiraClient) {
    jiraClient = new JiraClient();
  }
  return jiraClient;
}

// Helper to reset client (useful for testing)
export function resetJiraClient(): void {
  jiraClient = null;
}
