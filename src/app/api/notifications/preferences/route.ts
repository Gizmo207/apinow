import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/serverAuth';
import { getOurFirestore } from '@/services/firebaseServiceServer';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authContext = await verifyAuthToken(request);
    const userId = authContext.userId;

    // Get preferences from request body
    const body = await request.json();
    const { notificationPrefs } = body;

    if (!notificationPrefs) {
      return NextResponse.json(
        { error: 'Missing notification preferences' },
        { status: 400 }
      );
    }

    const firestore = getOurFirestore();
    
    // Save/update user document with notification preferences
    const userRef = firestore.collection('users').doc(userId);
    
    await userRef.set({
      userId,
      email: authContext.email,
      notificationPrefs,
      updatedAt: new Date(),
    }, { merge: true });

    console.log('[Notifications] Preferences saved for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'Notification preferences saved',
    });
  } catch (error) {
    console.error('[Notifications] Failed to save preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save notification preferences' },
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

    if (!userDoc.exists) {
      // Return default preferences
      return NextResponse.json({
        notificationPrefs: {
          apiUsageAlerts: true,
          downtimeAlerts: true,
          securityAlerts: true,
          weeklyReports: false,
        },
      });
    }

    const userData = userDoc.data();
    return NextResponse.json({
      notificationPrefs: userData?.notificationPrefs || {
        apiUsageAlerts: true,
        downtimeAlerts: true,
        securityAlerts: true,
        weeklyReports: false,
      },
    });
  } catch (error) {
    console.error('[Notifications] Failed to get preferences:', error);
    return NextResponse.json(
      { error: 'Failed to get notification preferences' },
      { status: 500 }
    );
  }
}
