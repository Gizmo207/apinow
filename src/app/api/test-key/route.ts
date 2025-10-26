import { NextRequest, NextResponse } from 'next/server';
import { getOurFirestore } from '@/services/firebaseServiceServer';

export async function GET(request: NextRequest) {
  try {
    // Get API key from header or query parameter
    const apiKeyFromHeader = request.headers.get('x-api-key');
    const apiKeyFromQuery = request.nextUrl.searchParams.get('apiKey');
    const apiKey = apiKeyFromHeader || apiKeyFromQuery;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required. Provide via X-API-Key header or ?apiKey= query param' },
        { status: 401 }
      );
    }

    // Verify API key in Firestore
    const firestore = getOurFirestore();
    
    console.log('[Test Key] Looking for key:', apiKey.substring(0, 20) + '...');
    
    const keysSnapshot = await firestore
      .collection('apiKeys')
      .where('key', '==', apiKey)
      .limit(1)
      .get();

    console.log('[Test Key] Found keys:', keysSnapshot.size);

    if (keysSnapshot.empty) {
      // Try to debug - get all keys for debugging
      const allKeys = await firestore.collection('apiKeys').limit(5).get();
      console.log('[Test Key] Total keys in DB:', allKeys.size);
      allKeys.docs.forEach(doc => {
        console.log('[Test Key] Sample key:', doc.data().key?.substring(0, 20));
      });
      
      return NextResponse.json(
        { 
          error: 'Invalid or revoked API key',
          debug: {
            receivedKey: apiKey.substring(0, 30) + '...',
            keysInDB: allKeys.size,
          }
        },
        { status: 401 }
      );
    }

    const keyDoc = keysSnapshot.docs[0];
    const keyData = keyDoc.data();

    // Check if key is active
    if (keyData.active === false) {
      return NextResponse.json(
        { error: 'API key has been revoked' },
        { status: 401 }
      );
    }

    // Update last used timestamp
    await keyDoc.ref.update({
      lastUsed: new Date(),
    });

    // Return success with user info
    return NextResponse.json({
      success: true,
      message: '✅ API Key is valid!',
      keyInfo: {
        name: keyData.name,
        userId: keyData.userId,
        createdAt: keyData.createdAt?.toDate().toISOString(),
        lastUsed: new Date().toISOString(),
      },
      testData: {
        timestamp: new Date().toISOString(),
        endpoint: '/api/test-key',
        method: 'GET',
      },
    });
  } catch (error) {
    console.error('[Test Key] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
