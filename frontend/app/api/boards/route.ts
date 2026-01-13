import { NextResponse } from 'next/server';
import {
  getJiraClient,
  JiraApiError,
  type JiraBoardsResponse,
} from '@/lib/jira-client';

export interface BoardResponse {
  id: number;
  name: string;
}

export interface BoardsListResponse {
  boards: BoardResponse[];
}

export async function GET() {
  try {
    const jira = getJiraClient();

    // Fetch all pages of boards
    const boardsData: Array<{
      id: number;
      name: string;
      location?: { projectName?: string };
    }> = [];
    let startAt = 0;
    const maxResults = 50;

    while (true) {
      const data = await jira.get<JiraBoardsResponse>('/rest/agile/1.0/board', {
        startAt,
        maxResults,
      });

      boardsData.push(...data.values);

      if (data.isLast) {
        break;
      }

      startAt += maxResults;
    }

    // Transform to response format
    const boards: BoardResponse[] = boardsData
      .filter((board) => board.id && board.name)
      .map((board) => ({
        id: board.id,
        name: board.location?.projectName || board.name,
      }));

    const response: BoardsListResponse = { boards };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching boards:', error);

    if (error instanceof JiraApiError) {
      if (error.statusCode === 401) {
        return NextResponse.json(
          { error: 'Invalid Jira credentials' },
          { status: 401 }
        );
      }
      if (error.statusCode === 403) {
        return NextResponse.json(
          { error: 'Access to Jira boards is forbidden' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to communicate with Jira API' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to retrieve boards' },
      { status: 500 }
    );
  }
}
