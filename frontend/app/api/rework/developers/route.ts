import { NextRequest, NextResponse } from 'next/server';
import { getDeveloperLeaderboard } from '@/lib/rework-service';
import { JiraApiError } from '@/lib/jira-client';

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const boardIdParam = searchParams.get('board_id');
    const daysParam = searchParams.get('days');

    console.log(`[/api/rework/developers] Received request: board_id=${boardIdParam}, days=${daysParam}`);

    // Validate board_id
    if (!boardIdParam) {
      return NextResponse.json(
        { error: 'board_id parameter is required' },
        { status: 400 }
      );
    }

    const boardId = parseInt(boardIdParam, 10);
    if (isNaN(boardId) || boardId <= 0) {
      return NextResponse.json(
        { error: 'board_id must be a positive integer' },
        { status: 400 }
      );
    }

    // Validate days (default to 90, allow 7-180)
    const days = daysParam ? parseInt(daysParam, 10) : 90;
    if (isNaN(days) || days < 7 || days > 180) {
      return NextResponse.json(
        { error: 'days parameter must be between 7 and 180' },
        { status: 400 }
      );
    }

    console.log(`[/api/rework/developers] Fetching developer leaderboard for board ${boardId} with ${days} days`);

    const leaderboard = await getDeveloperLeaderboard(boardId, days);

    console.log(`[/api/rework/developers] Found ${leaderboard.total_developers} developers, ${leaderboard.developers_excluded} excluded`);

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error fetching developer leaderboard:', error);

    if (error instanceof JiraApiError) {
      if (error.statusCode === 401) {
        return NextResponse.json(
          { error: 'Invalid Jira credentials' },
          { status: 401 }
        );
      }
      if (error.statusCode === 403) {
        return NextResponse.json(
          { error: 'Access to Jira is forbidden' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to communicate with Jira API' },
        { status: 502 }
      );
    }

    if (error instanceof Error && error.message.includes('Could not find project')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch developer leaderboard' },
      { status: 500 }
    );
  }
}
