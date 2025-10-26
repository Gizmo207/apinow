import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyApiKey } from '@/lib/verifyApiKey';
import { UnifiedDatabaseService } from '@/utils/unifiedDatabase';
import { logRequest } from '@/lib/logRequest';
import { getCached, setCached, generateCacheKey, invalidateCache } from '@/lib/cache';
import { trackUsage } from '@/lib/usageTracker';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ endpoint: string[] }> }
) {
  const startTime = Date.now();
  const url = new URL(req.url);
  const apiKey = url.searchParams.get('key') || req.headers.get('authorization')?.replace('Bearer ', '');
  const db = getFirestore();
  const unifiedService = UnifiedDatabaseService.getInstance();

  // Await params (Next.js 15+)
  const { endpoint } = await params;
  
  // Generate cache key
  const endpointPath = '/' + endpoint.join('/');
  const cacheKey = generateCacheKey(endpointPath, url.searchParams);
  
  // Try cache first (before auth to speed up public cached responses)
  const cached = await getCached(cacheKey);
  if (cached) {
    await logRequest({
      endpoint: endpointPath,
      status: 200,
      source: 'public',
      apiKey: apiKey || '',
      method: 'GET',
      responseTime: Date.now() - startTime,
    });
    return NextResponse.json({ success: true, data: cached, cached: true });
  }

  // 1️⃣ Verify API key
  const keyCheck = await verifyApiKey(apiKey);
  if (!keyCheck.valid) {
    await logRequest({
      endpoint: endpoint.join('/'),
      status: 401,
      error: keyCheck.reason,
      source: 'public',
      apiKey: apiKey || '',
      method: 'GET',
      responseTime: Date.now() - startTime,
    });
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // 1.5️⃣ Track usage and enforce plan limits
  try {
    const userId = keyCheck.keyData?.userId;
    if (userId) {
      await trackUsage(userId);
    }
  } catch (error: any) {
    await logRequest({
      endpoint: endpointPath,
      status: 429,
      error: error.message,
      source: 'public',
      apiKey: apiKey || '',
      method: 'GET',
      responseTime: Date.now() - startTime,
    });
    return NextResponse.json({ success: false, error: error.message }, { status: 429 });
  }

  // 2️⃣ Find endpoint in Firestore
  try {
    const snap = await db.collection('api_endpoints').where('path', '==', endpointPath).where('isPublic', '==', true).limit(1).get();
    
    if (snap.empty) {
      await logRequest({
        endpoint: endpointPath,
        status: 404,
        error: 'Endpoint not found or not public',
        source: 'public',
        apiKey: apiKey || '',
        method: 'GET',
        responseTime: Date.now() - startTime,
      });
      return NextResponse.json({ success: false, error: 'Endpoint not found or not public' }, { status: 404 });
    }

    const endpoint = snap.docs[0].data();

    // 3️⃣ Execute query via unified service
    const data = await unifiedService.executeAPIEndpoint(endpoint.connectionId, endpoint.id, {});
    
    // 4️⃣ Cache the result
    await setCached(cacheKey, data, 60); // Cache for 60 seconds
    
    await logRequest({
      endpoint: endpointPath,
      status: 200,
      source: 'public',
      apiKey: apiKey || '',
      method: 'GET',
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, data, cached: false });
  } catch (err: any) {
    await logRequest({
      endpoint: endpointPath,
      status: 500,
      error: err.message,
      source: 'public',
      apiKey: apiKey || undefined,
      method: 'GET',
      responseTime: Date.now() - startTime,
    });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ endpoint: string[] }> }
) {
  const startTime = Date.now();
  const url = new URL(req.url);
  const apiKey = url.searchParams.get('key') || req.headers.get('authorization')?.replace('Bearer ', '');
  const db = getFirestore();
  const unifiedService = UnifiedDatabaseService.getInstance();
  
  // Await params (Next.js 15+)
  const { endpoint } = await params;

  // 1️⃣ Verify API key
  const keyCheck = await verifyApiKey(apiKey);
  if (!keyCheck.valid) {
    await logRequest({
      endpoint: endpoint.join('/'),
      status: 401,
      error: keyCheck.reason,
      source: 'public',
      apiKey: apiKey || undefined,
      method: 'POST',
      responseTime: Date.now() - startTime,
    });
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // 2️⃣ Find endpoint in Firestore
  const endpointPath = '/' + endpoint.join('/');
  try {
    const body = await req.json();
    const snap = await db.collection('api_endpoints').where('path', '==', endpointPath).where('isPublic', '==', true).limit(1).get();
    
    if (snap.empty) {
      await logRequest({
        endpoint: endpointPath,
        status: 404,
        error: 'Endpoint not found or not public',
        source: 'public',
        apiKey: apiKey || '',
        method: 'POST',
        responseTime: Date.now() - startTime,
      });
      return NextResponse.json({ success: false, error: 'Endpoint not found or not public' }, { status: 404 });
    }

    const endpoint = snap.docs[0].data();

    // 3️⃣ Execute query via unified service
    const data = await unifiedService.executeAPIEndpoint(endpoint.connectionId, endpoint.id, {}, body);
    
    // 4️⃣ Invalidate cache for this endpoint (POST creates new data)
    await invalidateCache(`api:${endpointPath}:*`);
    
    await logRequest({
      endpoint: endpointPath,
      status: 200,
      source: 'public',
      apiKey: apiKey || '',
      method: 'POST',
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    await logRequest({
      endpoint: endpointPath,
      status: 500,
      error: err.message,
      source: 'public',
      apiKey: apiKey || undefined,
      method: 'POST',
      responseTime: Date.now() - startTime,
    });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ endpoint: string[] }> }
) {
  const startTime = Date.now();
  const url = new URL(req.url);
  const apiKey = url.searchParams.get('key') || req.headers.get('authorization')?.replace('Bearer ', '');
  const db = getFirestore();
  const unifiedService = UnifiedDatabaseService.getInstance();
  
  // Await params (Next.js 15+)
  const { endpoint } = await params;

  // 1️⃣ Verify API key
  const keyCheck = await verifyApiKey(apiKey);
  if (!keyCheck.valid) {
    await logRequest({
      endpoint: endpoint.join('/'),
      status: 401,
      error: keyCheck.reason,
      source: 'public',
      apiKey: apiKey || undefined,
      method: 'PUT',
      responseTime: Date.now() - startTime,
    });
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // 2️⃣ Find endpoint in Firestore
  const endpointPath = '/' + endpoint.join('/');
  try {
    const body = await req.json();
    const snap = await db.collection('api_endpoints').where('path', '==', endpointPath).where('isPublic', '==', true).limit(1).get();
    
    if (snap.empty) {
      await logRequest({
        endpoint: endpointPath,
        status: 404,
        error: 'Endpoint not found or not public',
        source: 'public',
        apiKey: apiKey || '',
        method: 'PUT',
        responseTime: Date.now() - startTime,
      });
      return NextResponse.json({ success: false, error: 'Endpoint not found or not public' }, { status: 404 });
    }

    const endpoint = snap.docs[0].data();

    // 3️⃣ Execute query via unified service
    const data = await unifiedService.executeAPIEndpoint(endpoint.connectionId, endpoint.id, {}, body);
    
    // 4️⃣ Invalidate cache for this endpoint (PUT updates data)
    await invalidateCache(`api:${endpointPath}:*`);
    
    await logRequest({
      endpoint: endpointPath,
      status: 200,
      source: 'public',
      apiKey: apiKey || '',
      method: 'PUT',
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    await logRequest({
      endpoint: endpointPath,
      status: 500,
      error: err.message,
      source: 'public',
      apiKey: apiKey || undefined,
      method: 'PUT',
      responseTime: Date.now() - startTime,
    });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ endpoint: string[] }> }
) {
  const startTime = Date.now();
  const url = new URL(req.url);
  const apiKey = url.searchParams.get('key') || req.headers.get('authorization')?.replace('Bearer ', '');
  const db = getFirestore();
  const unifiedService = UnifiedDatabaseService.getInstance();
  
  // Await params (Next.js 15+)
  const { endpoint } = await params;

  // 1️⃣ Verify API key
  const keyCheck = await verifyApiKey(apiKey);
  if (!keyCheck.valid) {
    await logRequest({
      endpoint: endpoint.join('/'),
      status: 401,
      error: keyCheck.reason,
      source: 'public',
      apiKey: apiKey || undefined,
      method: 'DELETE',
      responseTime: Date.now() - startTime,
    });
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // 2️⃣ Find endpoint in Firestore
  const endpointPath = '/' + endpoint.join('/');
  try {
    const snap = await db.collection('api_endpoints').where('path', '==', endpointPath).where('isPublic', '==', true).limit(1).get();
    
    if (snap.empty) {
      await logRequest({
        endpoint: endpointPath,
        status: 404,
        error: 'Endpoint not found or not public',
        source: 'public',
        apiKey: apiKey || '',
        method: 'DELETE',
        responseTime: Date.now() - startTime,
      });
      return NextResponse.json({ success: false, error: 'Endpoint not found or not public' }, { status: 404 });
    }

    const endpoint = snap.docs[0].data();

    // 3️⃣ Execute query via unified service
    const data = await unifiedService.executeAPIEndpoint(endpoint.connectionId, endpoint.id, {});
    
    // 4️⃣ Invalidate cache for this endpoint (DELETE removes data)
    await invalidateCache(`api:${endpointPath}:*`);
    
    await logRequest({
      endpoint: endpointPath,
      status: 200,
      source: 'public',
      apiKey: apiKey || '',
      method: 'DELETE',
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    await logRequest({
      endpoint: endpointPath,
      status: 500,
      error: err.message,
      source: 'public',
      apiKey: apiKey || undefined,
      method: 'DELETE',
      responseTime: Date.now() - startTime,
    });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
