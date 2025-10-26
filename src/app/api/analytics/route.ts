import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/serverAuth';
import { getAnalytics } from '@/services/analyticsService';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authContext = await verifyAuthToken(request);
    const userId = authContext.userId;

    // Get source filter from query params
    const { searchParams } = new URL(request.url);
    const sourceParam = searchParams.get('source');
    const source = (sourceParam === 'protected' || sourceParam === 'public') ? sourceParam : undefined;

    // Get analytics data with optional source filter
    const analytics = await getAnalytics(userId, source);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
