import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const boardIdParam = searchParams.get('board_id');
    const daysParam = searchParams.get('days');
    const limitParam = searchParams.get('limit');

    console.log(`[/api/rework/top-tickets-with-bugs] Received request: board_id=${boardIdParam}, days=${daysParam}, limit=${limitParam}`);

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

    // Build query string for backend
    const queryParams = new URLSearchParams();
    queryParams.set('board_id', boardIdParam);
    if (daysParam) queryParams.set('days', daysParam);
    if (limitParam) queryParams.set('limit', limitParam);

    const backendUrl = `${BACKEND_URL}/api/rework/top-tickets-with-bugs?${queryParams.toString()}`;
    console.log(`[/api/rework/top-tickets-with-bugs] Proxying to: ${backendUrl}`);

    const response = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[/api/rework/top-tickets-with-bugs] Backend error (${response.status}): ${errorText}`);
      return NextResponse.json(
        { error: `Backend returned ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[/api/rework/top-tickets-with-bugs] Successfully proxied response`);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying top-tickets-with-bugs request:', error);

    return NextResponse.json(
      { error: 'Failed to fetch top tickets with bugs' },
      { status: 500 }
    );
  }
}
