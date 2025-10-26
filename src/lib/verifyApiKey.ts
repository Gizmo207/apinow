import { getFirestore } from 'firebase-admin/firestore';

export async function verifyApiKey(apiKey: string | null | undefined): Promise<{ valid: boolean; reason?: string; keyData?: any }> {
  if (!apiKey) {
    return { valid: false, reason: 'No API key provided' };
  }

  try {
    const db = getFirestore();
    const keyDoc = await db.collection('api_keys').doc(apiKey).get();

    if (!keyDoc.exists) {
      return { valid: false, reason: 'Invalid API key' };
    }

    const keyData = keyDoc.data();

    // Check if key is active
    if (keyData?.status !== 'active') {
      return { valid: false, reason: 'API key is inactive' };
    }

    // Check if key is expired
    if (keyData?.expiresAt && keyData.expiresAt.toDate() < new Date()) {
      return { valid: false, reason: 'API key expired' };
    }

    // Check usage limit
    const currentUsage = keyData?.usageCount || 0;
    const usageLimit = keyData?.usageLimit || 0;
    
    if (usageLimit > 0 && currentUsage >= usageLimit) {
      // Auto-disable key when limit reached
      await keyDoc.ref.update({ status: 'inactive' });
      return { valid: false, reason: 'Usage limit reached. Please upgrade your plan or contact support.' };
    }

    // Update last used timestamp and increment usage counter
    await keyDoc.ref.update({
      lastUsed: new Date(),
      usageCount: (keyData?.usageCount || 0) + 1,
    });

    return { valid: true, keyData };
  } catch (error) {
    console.error('Error verifying API key:', error);
    return { valid: false, reason: 'Internal error verifying key' };
  }
}
