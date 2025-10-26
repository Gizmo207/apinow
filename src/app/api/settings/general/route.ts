import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/serverAuth';
import { getOurFirestore } from '@/services/firebaseServiceServer';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authContext = await verifyAuthToken(request);
    const userId = authContext.userId;

    // Get settings from request body
    const body = await request.json();
    const { orgName, rateLimit, authMode } = body;

    const firestore = getOurFirestore();
    
    // Save/update general settings
    const userRef = firestore.collection('users').doc(userId);
    
    await userRef.set({
      userId,
      email: authContext.email,
      generalSettings: {
        orgName: orgName || '',
        rateLimit: rateLimit || '100',
        authMode: authMode || 'required',
        updatedAt: new Date(),
      },
      updatedAt: new Date(),
    }, { merge: true });

    console.log('[General] Settings saved for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'General settings saved',
    });
  } catch (error) {
    console.error('[General] Failed to save settings:', error);
    return NextResponse.json(
      { error: 'Failed to save general settings' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authContext = await verifyAuthToken(request);
    const userId = authContext.userId;

    const firestore = getOurFirestore();
    const userDoc = await firestore.collection('users').doc(userId).get();

    if (!userDoc.exists || !userDoc.data()?.generalSettings) {
      // Return default settings
      return NextResponse.json({
        generalSettings: {
          orgName: '',
          rateLimit: '100',
          authMode: 'required',
        },
      });
    }

    const userData = userDoc.data();
    return NextResponse.json({
      generalSettings: userData?.generalSettings || {
        orgName: '',
        rateLimit: '100',
        authMode: 'required',
      },
    });
  } catch (error) {
    console.error('[General] Failed to get settings:', error);
    return NextResponse.json(
      { error: 'Failed to get general settings' },
      { status: 500 }
    );
  }
}
