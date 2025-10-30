import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    // Get user ID from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract UID from token (format: "dev-{uid}" or Firebase token)
    const token = authHeader.substring(7);
    const uid = token.startsWith('dev-') ? token.substring(4) : token;

    // Get user document from Firestore
    const userDoc = await getDoc(doc(db, 'users', uid));

    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();

    return NextResponse.json({
      plan: userData.plan || 'free',
      usageCount: userData.usageCount || 0,
      usageLimit: userData.usageLimit || 10000,
      percentageUsed: ((userData.usageCount || 0) / (userData.usageLimit || 10000)) * 100,
    });
  } catch (error: any) {
    console.error('Get user plan error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get user plan' },
      { status: 500 }
    );
  }
}
