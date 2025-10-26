import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/serverAuth';
import { getOurFirestore } from '@/services/firebaseServiceServer';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authContext = await verifyAuthToken(request);
    const userId = authContext.userId;

    // Get key ID from request
    const body = await request.json();
    const { keyId } = body;

    if (!keyId) {
      return NextResponse.json(
        { error: 'Key ID is required' },
        { status: 400 }
      );
    }

    const firestore = getOurFirestore();
    const keyRef = firestore.collection('apiKeys').doc(keyId);
    const keyDoc = await keyRef.get();

    if (!keyDoc.exists) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    const keyData = keyDoc.data();

    // Verify this key belongs to the user
    if (keyData?.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Revoke the key (set active to false)
    await keyRef.update({
      active: false,
      revokedAt: new Date(),
    });

    console.log('[API Keys] Revoked key:', keyId);
    console.log('[API Keys] User:', userId);

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    console.error('[API Keys] Failed to revoke key:', error);
    return NextResponse.json(
      { error: 'Failed to revoke API key' },
      { status: 500 }
    );
  }
}
