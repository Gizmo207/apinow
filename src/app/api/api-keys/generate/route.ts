import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/serverAuth';
import { getOurFirestore } from '@/services/firebaseServiceServer';
import { randomBytes } from 'crypto';

function generateApiKey(): string {
  // Generate a secure random API key
  const randomPart = randomBytes(32).toString('hex');
  return `apinow_${randomPart}`;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authContext = await verifyAuthToken(request);
    const userId = authContext.userId;

    // Get key name from request
    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'API key name is required' },
        { status: 400 }
      );
    }

    // Generate new API key
    const apiKey = generateApiKey();

    const firestore = getOurFirestore();
    
    // Store API key in Firestore
    const keyRef = firestore.collection('apiKeys').doc();
    await keyRef.set({
      userId,
      name: name.trim(),
      key: apiKey,
      active: true,
      createdAt: new Date(),
      lastUsed: null,
    });

    console.log('[API Keys] Generated new key for user:', userId);
    console.log('[API Keys] Key name:', name);

    return NextResponse.json({
      success: true,
      apiKey: {
        id: keyRef.id,
        key: apiKey,
        name: name.trim(),
      },
    });
  } catch (error) {
    console.error('[API Keys] Failed to generate key:', error);
    return NextResponse.json(
      { error: 'Failed to generate API key' },
      { status: 500 }
    );
  }
}
