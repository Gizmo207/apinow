import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/serverAuth';
import { getOurFirestore } from '@/services/firebaseServiceServer';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authContext = await verifyAuthToken(request);
    const userId = authContext.userId;

    const firestore = getOurFirestore();
    
    // Get all API keys for this user
    const keysSnapshot = await firestore
      .collection('apiKeys')
      .where('userId', '==', userId)
      .get();

    const keys = keysSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        fullKey: data.key, // Show the FULL key for debugging
        keyLength: data.key?.length,
        active: data.active,
        userId: data.userId,
      };
    });

    return NextResponse.json({ 
      keys,
      totalKeys: keys.length,
    });
  } catch (error) {
    console.error('[Debug Keys] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get keys' },
      { status: 500 }
    );
  }
}
