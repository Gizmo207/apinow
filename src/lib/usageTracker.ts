import { getOurFirestore } from '@/services/firebaseServiceServer';
import { PLAN_LIMITS } from '@/config/plans';

/**
 * Track API usage and enforce limits
 */
export async function trackUsage(userId: string): Promise<void> {
  try {
    const firestore = getOurFirestore();
    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.warn('[Usage Tracker] User not found:', userId);
      return;
    }

    const userData = userDoc.data();
    const plan = userData?.plan || 'free';
    const currentUsage = userData?.usageCount || 0;
    const limit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS].monthlyRequests;

    // Check if user has exceeded their limit
    if (currentUsage >= limit) {
      throw new Error(`Usage limit exceeded. You've reached your ${plan} plan limit of ${limit.toLocaleString()} requests/month. Please upgrade to continue.`);
    }

    // Increment usage count
    await userRef.update({
      usageCount: (currentUsage + 1),
      lastRequestAt: new Date().toISOString(),
    });

    console.log(`[Usage Tracker] ${userId} - ${currentUsage + 1}/${limit} (${plan})`);
  } catch (error) {
    console.error('[Usage Tracker] Error:', error);
    throw error;
  }
}

/**
 * Get user's current usage stats
 */
export async function getUserUsage(userId: string): Promise<{
  plan: string;
  usageCount: number;
  usageLimit: number;
  percentageUsed: number;
}> {
  const firestore = getOurFirestore();
  const userDoc = await firestore.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    return {
      plan: 'free',
      usageCount: 0,
      usageLimit: PLAN_LIMITS.free.monthlyRequests,
      percentageUsed: 0,
    };
  }

  const userData = userDoc.data();
  const plan = userData?.plan || 'free';
  const usageCount = userData?.usageCount || 0;
  const usageLimit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS].monthlyRequests;
  const percentageUsed = Math.round((usageCount / usageLimit) * 100);

  return {
    plan,
    usageCount,
    usageLimit,
    percentageUsed,
  };
}

/**
 * Reset monthly usage (to be called by cron job)
 */
export async function resetMonthlyUsage(): Promise<number> {
  try {
    const firestore = getOurFirestore();
    const usersSnapshot = await firestore.collection('users').get();

    let resetCount = 0;
    const batch = firestore.batch();

    usersSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        usageCount: 0,
        lastResetAt: new Date().toISOString(),
      });
      resetCount++;
    });

    await batch.commit();
    console.log(`[Usage Tracker] ✅ Reset ${resetCount} users' monthly usage`);
    
    return resetCount;
  } catch (error) {
    console.error('[Usage Tracker] Failed to reset usage:', error);
    throw error;
  }
}
