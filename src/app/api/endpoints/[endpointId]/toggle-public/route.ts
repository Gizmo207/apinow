import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/serverAuth';
import { getOurFirestore } from '@/services/firebaseServiceServer';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  try {
    console.log('[Toggle Public] Starting request');
    
    // Verify authentication
    const authContext = await verifyAuthToken(request);
    const userId = authContext.userId;
    console.log('[Toggle Public] User ID:', userId);

    const { isPublic } = await request.json();
    const { endpointId } = await params; // await params in Next.js 15+
    console.log('[Toggle Public] Endpoint ID:', endpointId, 'Setting isPublic to:', isPublic);

    const firestore = getOurFirestore();
    
    // Get the endpoint to verify ownership
    const endpointDoc = await firestore.collection('api_endpoints').doc(endpointId).get();
    console.log('[Toggle Public] Endpoint exists:', endpointDoc.exists);
    
    if (!endpointDoc.exists) {
      console.error('[Toggle Public] Endpoint not found:', endpointId);
      return NextResponse.json(
        { error: 'Endpoint not found' },
        { status: 404 }
      );
    }

    const endpointData = endpointDoc.data();
    console.log('[Toggle Public] Endpoint userId:', endpointData?.userId, 'Current userId:', userId);
    
    // Verify the endpoint belongs to this user
    if (endpointData?.userId !== userId) {
      console.error('[Toggle Public] User mismatch. Endpoint userId:', endpointData?.userId, 'Current userId:', userId);
      return NextResponse.json(
        { error: 'Unauthorized - This endpoint belongs to another user' },
        { status: 403 }
      );
    }

    // Update the isPublic status
    await firestore.collection('api_endpoints').doc(endpointId).update({
      isPublic: isPublic,
      updatedAt: new Date(),
    });

    console.log(`[Toggle Public] ✅ SUCCESS - Endpoint ${endpointId} is now ${isPublic ? 'PUBLIC' : 'PROTECTED'}`);

    return NextResponse.json({ 
      success: true,
      isPublic,
    });
  } catch (error: any) {
    console.error('[Toggle Public] ❌ ERROR:', error);
    console.error('[Toggle Public] Error message:', error?.message);
    console.error('[Toggle Public] Error stack:', error?.stack);
    return NextResponse.json(
      { error: error?.message || 'Failed to toggle endpoint visibility' },
      { status: 500 }
    );
  }
}
