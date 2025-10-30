import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export async function GET(request: NextRequest) {
  try {
    // Get user ID from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify Firebase ID token
    let uid: string;
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      uid = decodedToken.uid;
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user document from Firestore using Admin SDK
    const userDoc = await adminDb.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data() || {};

    return NextResponse.json({
      plan: userData?.plan || 'free',
      usageCount: userData?.usageCount || 0,
      usageLimit: userData?.usageLimit || 10000,
      percentageUsed: ((userData?.usageCount || 0) / (userData?.usageLimit || 10000)) * 100,
    });
  } catch (error: any) {
    console.error('Get user plan error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get user plan' },
      { status: 500 }
    );
  }
}
