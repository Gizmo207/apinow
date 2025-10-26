import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/serverAuth';
import { getOurFirestore } from '@/services/firebaseServiceServer';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authContext = await verifyAuthToken(request);
    const userId = authContext.userId;

    // Get security settings from request body
    const body = await request.json();
    const { ipWhitelistEnabled, allowedOrigins } = body;

    // Get client IP address
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                    request.headers.get('x-real-ip') ||
                    'unknown';

    const firestore = getOurFirestore();
    
    // Save/update security settings
    const securityRef = firestore.collection('users').doc(userId);
    
    await securityRef.set({
      userId,
      email: authContext.email,
      securitySettings: {
        ipWhitelistEnabled,
        whitelistedIPs: ipWhitelistEnabled ? [clientIP] : [],
        allowedOrigins: allowedOrigins || ['*'],
        forceHTTPS: true, // Always enabled
        updatedAt: new Date(),
      },
      updatedAt: new Date(),
    }, { merge: true });

    console.log('[Security] Settings saved for user:', userId);
    console.log('[Security] IP Whitelist:', ipWhitelistEnabled ? 'Enabled' : 'Disabled');
    console.log('[Security] Client IP:', clientIP);

    return NextResponse.json({
      success: true,
      message: 'Security settings saved',
      clientIP: clientIP,
    });
  } catch (error) {
    console.error('[Security] Failed to save settings:', error);
    return NextResponse.json(
      { error: 'Failed to save security settings' },
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

    if (!userDoc.exists || !userDoc.data()?.securitySettings) {
      // Return default settings
      return NextResponse.json({
        securitySettings: {
          ipWhitelistEnabled: false,
          whitelistedIPs: [],
          allowedOrigins: ['*'],
          forceHTTPS: true,
        },
      });
    }

    const userData = userDoc.data();
    return NextResponse.json({
      securitySettings: userData?.securitySettings || {
        ipWhitelistEnabled: false,
        whitelistedIPs: [],
        allowedOrigins: ['*'],
        forceHTTPS: true,
      },
    });
  } catch (error) {
    console.error('[Security] Failed to get settings:', error);
    return NextResponse.json(
      { error: 'Failed to get security settings' },
      { status: 500 }
    );
  }
}
