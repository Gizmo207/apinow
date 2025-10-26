import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/serverAuth';
import { getUserUsage } from '@/lib/usageTracker';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authContext = await verifyAuthToken(request);
    const userId = authContext.userId;

    // Get user's plan and usage
    const usageData = await getUserUsage(userId);

    return NextResponse.json(usageData);
  } catch (error: any) {
    console.error('[User Plan API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get user plan' },
      { status: 500 }
    );
  }
}
