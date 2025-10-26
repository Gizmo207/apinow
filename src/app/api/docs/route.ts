import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/serverAuth';
import { getOurFirestore } from '@/services/firebaseServiceServer';
import { generateOpenAPI, generateOpenAPIYAML } from '@/lib/openapiGenerator';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authContext = await verifyAuthToken(request);
    const userId = authContext.userId;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // json or yaml

    const firestore = getOurFirestore();
    
    // Get all endpoints for this user
    const endpointsSnapshot = await firestore
      .collection('api_endpoints')
      .where('userId', '==', userId)
      .get();

    const endpoints = endpointsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        path: data.path,
        method: data.method,
        collection: data.tableName || data.collection,
        description: data.description,
        isPublic: data.isPublic || false,
        connectionId: data.connectionId,
      };
    });

    // Generate OpenAPI spec
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
    const spec = generateOpenAPI(endpoints, 'APIFlow Project', baseUrl);

    // Return as JSON or YAML
    if (format === 'yaml') {
      const yaml = generateOpenAPIYAML(spec);
      return new NextResponse(yaml, {
        headers: {
          'Content-Type': 'text/yaml',
          'Content-Disposition': 'attachment; filename="openapi.yaml"',
        },
      });
    }

    return NextResponse.json(spec, {
      headers: {
        'Content-Disposition': 'attachment; filename="openapi.json"',
      },
    });
  } catch (error) {
    console.error('[Docs API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    );
  }
}
