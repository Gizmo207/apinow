import { NextRequest, NextResponse } from 'next/server';
import { getOurFirestore } from '@/services/firebaseServiceServer';
import { getAnalytics } from '@/services/analyticsService';
import { sendWeeklyReport } from '@/services/emailService';

/**
 * Cron job endpoint to send weekly reports every Monday at 9 AM
 * 
 * Set up in Vercel or your hosting provider:
 * - Schedule: 0 9 * * 1 (Every Monday at 9 AM UTC)
 * - Or use Vercel Cron: https://vercel.com/docs/cron-jobs
 * 
 * For local testing: GET http://localhost:3000/api/cron/weekly-reports?key=YOUR_CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const cronSecret = request.nextUrl.searchParams.get('key');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting weekly report job...');

    const firestore = getOurFirestore();
    
    // Get all users with weekly reports enabled
    const usersSnapshot = await firestore
      .collection('users')
      .where('notificationPrefs.weeklyReports', '==', true)
      .get();

    console.log(`[Cron] Found ${usersSnapshot.size} users with weekly reports enabled`);

    const results = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      try {
        // Get analytics for this user
        const analytics = await getAnalytics(userId);

        // Calculate top endpoints
        const endpointCounts: { [key: string]: number } = {};
        analytics.recentActivity.forEach(activity => {
          endpointCounts[activity.endpoint] = (endpointCounts[activity.endpoint] || 0) + 1;
        });

        const topEndpoints = Object.entries(endpointCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([endpoint, count]) => ({ endpoint, count }));

        // Send email
        const emailResult = await sendWeeklyReport({
          userName: userData.displayName || userData.email || 'User',
          userEmail: userData.email,
          totalRequests: analytics.totalRequests,
          successRate: analytics.successRate,
          avgResponseTime: analytics.avgResponseTime,
          topEndpoints,
          period: getLastWeekPeriod(),
        });

        results.push({
          userId,
          email: userData.email,
          success: emailResult.success,
        });

        console.log(`[Cron] Sent weekly report to ${userData.email}`);
      } catch (error) {
        console.error(`[Cron] Failed to send report to user ${userId}:`, error);
        results.push({
          userId,
          email: userData.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} users`,
      results,
    });
  } catch (error) {
    console.error('[Cron] Weekly reports job failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process weekly reports',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getLastWeekPeriod(): string {
  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const format = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  return `${format(lastWeek)} - ${format(now)}`;
}
