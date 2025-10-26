import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/serverAuth';
import { getOurFirestore } from '@/services/firebaseServiceServer';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authContext = await verifyAuthToken(request);
    const userId = authContext.userId;

    const firestore = getOurFirestore();
    
    // Get all API keys for this user (removed orderBy to avoid index requirement)
    const keysSnapshot = await firestore
      .collection('apiKeys')
      .where('userId', '==', userId)
      .get();

    const apiKeys = keysSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          key: data.key,
          keyPreview: data.key.substring(0, 20), // Show first 20 chars only
          active: data.active !== false, // Default to true if not set
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          lastUsed: data.lastUsed?.toDate ? data.lastUsed.toDate().toISOString() : null,
        };
      })
      .filter(key => key.active) // Filter active keys in memory
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Sort in memory

    console.log('[API Keys] Loaded keys for user:', userId, 'Count:', apiKeys.length);

    return NextResponse.json({ apiKeys });
  } catch (error) {
    console.error('[API Keys] Failed to get keys:', error);
    return NextResponse.json(
      { error: 'Failed to get API keys' },
      { status: 500 }
    );
  }
}
