import { NextRequest, NextResponse } from 'next/server';
import { resetMonthlyUsage } from '@/lib/usageTracker';

/**
 * Cron job to reset monthly usage
 * 
 * Setup in Vercel:
 * 1. Go to your project settings
 * 2. Add Cron Job: 0 0 1 * * (runs at midnight on 1st of each month)
 * 3. Path: /api/cron/reset-usage
 * 
 * Or use external cron service (cron-job.org, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting monthly usage reset...');
    
    const resetCount = await resetMonthlyUsage();

    console.log(`[Cron] ✅ Reset complete. ${resetCount} users updated.`);

    return NextResponse.json({
      success: true,
      message: `Reset ${resetCount} users`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Reset failed:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
