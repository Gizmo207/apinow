import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyApiKey } from '@/lib/verifyApiKey';
import { UnifiedDatabaseService } from '@/utils/unifiedDatabase';
import { logRequest } from '@/lib/logRequest';

export async function GET(
  req: Request,
  { params }: { params: { endpoint: string[] } }
) {
  const startTime = Date.now();
  const url = new URL(req.url);
  const apiKey = url.searchParams.get('key') || req.headers.get('authorization')?.replace('Bearer ', '');
  const db = getFirestore();
  const unifiedService = UnifiedDatabaseService.getInstance();

  // 1️⃣ Verify API key
  const keyCheck = await verifyApiKey(apiKey);
  if (!keyCheck.valid) {
    await logRequest({
      endpoint: params.endpoint.join('/'),
      status: 401,
      error: keyCheck.reason,
      source: 'public',
      apiKey: apiKey || '',
      method: 'GET',
      responseTime: Date.now() - startTime,
    });
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // 2️⃣ Find endpoint in Firestore
  const endpointPath = '/' + params.endpoint.join('/');
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
    
    await logRequest({
      endpoint: endpointPath,
      status: 200,
      source: 'public',
      apiKey: apiKey || undefined,
      method: 'GET',
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
      method: 'GET',
      responseTime: Date.now() - startTime,
    });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { endpoint: string[] } }
) {
  const startTime = Date.now();
  const url = new URL(req.url);
  const apiKey = url.searchParams.get('key') || req.headers.get('authorization')?.replace('Bearer ', '');
  const db = getFirestore();
  const unifiedService = UnifiedDatabaseService.getInstance();

  // 1️⃣ Verify API key
  const keyCheck = await verifyApiKey(apiKey);
  if (!keyCheck.valid) {
    await logRequest({
      endpoint: params.endpoint.join('/'),
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
  const endpointPath = '/' + params.endpoint.join('/');
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
    
    await logRequest({
      endpoint: endpointPath,
      status: 200,
      source: 'public',
      apiKey: apiKey || undefined,
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
  { params }: { params: { endpoint: string[] } }
) {
  const startTime = Date.now();
  const url = new URL(req.url);
  const apiKey = url.searchParams.get('key') || req.headers.get('authorization')?.replace('Bearer ', '');
  const db = getFirestore();
  const unifiedService = UnifiedDatabaseService.getInstance();

  // 1️⃣ Verify API key
  const keyCheck = await verifyApiKey(apiKey);
  if (!keyCheck.valid) {
    await logRequest({
      endpoint: params.endpoint.join('/'),
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
  const endpointPath = '/' + params.endpoint.join('/');
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
    
    await logRequest({
      endpoint: endpointPath,
      status: 200,
      source: 'public',
      apiKey: apiKey || undefined,
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
  { params }: { params: { endpoint: string[] } }
) {
  const startTime = Date.now();
  const url = new URL(req.url);
  const apiKey = url.searchParams.get('key') || req.headers.get('authorization')?.replace('Bearer ', '');
  const db = getFirestore();
  const unifiedService = UnifiedDatabaseService.getInstance();

  // 1️⃣ Verify API key
  const keyCheck = await verifyApiKey(apiKey);
  if (!keyCheck.valid) {
    await logRequest({
      endpoint: params.endpoint.join('/'),
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
  const endpointPath = '/' + params.endpoint.join('/');
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
    
    await logRequest({
      endpoint: endpointPath,
      status: 200,
      source: 'public',
      apiKey: apiKey || undefined,
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
