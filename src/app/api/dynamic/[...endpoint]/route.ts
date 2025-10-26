import { NextRequest, NextResponse } from 'next/server';
import { UnifiedDatabaseService } from '@/utils/unifiedDatabase';
import { getEndpointByPath, getConnectionById } from '@/services/firebaseServiceServer';
import { verifyAuthToken } from '@/lib/serverAuth';
import { logApiRequest } from '@/services/analyticsService';

/**
 * Dynamic API Route Handler
 * Handles all /api/dynamic/* routes based on endpoint configs stored in Firestore
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ endpoint: string[] }> }
) {
  const resolvedParams = await params;
  return handleDynamicRequest(request, resolvedParams, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ endpoint: string[] }> }
) {
  const resolvedParams = await params;
  return handleDynamicRequest(request, resolvedParams, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ endpoint: string[] }> }
) {
  const resolvedParams = await params;
  return handleDynamicRequest(request, resolvedParams, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ endpoint: string[] }> }
) {
  const resolvedParams = await params;
  return handleDynamicRequest(request, resolvedParams, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ endpoint: string[] }> }
) {
  const resolvedParams = await params;
  return handleDynamicRequest(request, resolvedParams, 'PATCH');
}

async function handleDynamicRequest(
  request: NextRequest,
  params: { endpoint: string[] },
  method: string
) {
  const startTime = Date.now();
  let userId: string | null = null;
  let statusCode = 200;
  const requestedPath = `/api/dynamic/${params.endpoint.join('/')}`;
  
  try {
    // Construct the requested path
    console.log(`Dynamic API request: ${method} ${requestedPath}`);

    // Verify authentication
    try {
      const authContext = await verifyAuthToken(request);
      userId = authContext.userId;
    } catch (error) {
      statusCode = 401;
      const responseTime = Date.now() - startTime;
      
      // Log analytics for failed auth
      logApiRequest({
        endpoint: requestedPath,
        method,
        statusCode,
        responseTime,
        userId: null,
        success: false,
        userAgent: request.headers.get('user-agent') || undefined,
      }).catch(console.error);
      
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Authentication required. Please provide a valid Bearer token in the Authorization header.'
        },
        { status: 401 }
      );
    }

    // Get endpoint configuration from Firestore and verify ownership
    const matchedEndpoint = await getEndpointByPath(requestedPath, method, userId);

    if (!matchedEndpoint) {
      return NextResponse.json(
        { 
          error: 'Endpoint not found',
          message: `No endpoint configured for ${method} ${requestedPath} or you don't have access to it`
        },
        { status: 404 }
      );
    }

    console.log('Matched endpoint:', matchedEndpoint);

    // Get the database connection by connectionId (server-safe method)
    const database = await getConnectionById(matchedEndpoint.connectionId);

    if (!database) {
      return NextResponse.json(
        { error: 'Database not found', message: `Database with ID "${matchedEndpoint.connectionId}" not configured` },
        { status: 500 }
      );
    }

    // Verify database ownership for security
    if (database.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this database connection' },
        { status: 403 }
      );
    }

    // For Firestore, use Admin SDK directly instead of the client adapter
    if (database.type === 'firebase') {
      const { getOurFirestore } = await import('@/services/firebaseServiceServer');
      const db = getOurFirestore();
      
      // Execute the appropriate database operation using Admin SDK
      let result;
      const body = method !== 'GET' ? await request.json().catch(() => ({})) : {};
      const searchParams = request.nextUrl.searchParams;

      try {
        switch (method) {
          case 'GET':
            const limit = parseInt(searchParams.get('limit') || '100');
            const snapshot = await db.collection(matchedEndpoint.tableName).limit(limit).get();
            result = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            break;

          case 'POST':
            if (body.id) {
              await db.collection(matchedEndpoint.tableName).doc(body.id).set(body);
              result = { id: body.id, ...body };
            } else {
              const docRef = await db.collection(matchedEndpoint.tableName).add(body);
              result = { id: docRef.id, ...body };
            }
            break;

          case 'PUT':
          case 'PATCH':
            if (!body.id) {
              return NextResponse.json({ error: 'Missing id in request body' }, { status: 400 });
            }
            await db.collection(matchedEndpoint.tableName).doc(body.id).update(body);
            result = body;
            break;

          case 'DELETE':
            const deleteId = searchParams.get('id') || body.id;
            if (!deleteId) {
              return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
            }
            await db.collection(matchedEndpoint.tableName).doc(deleteId).delete();
            result = { success: true, id: deleteId };
            break;

          default:
            return NextResponse.json({ error: 'Method not supported' }, { status: 405 });
        }

        statusCode = 200;
        const responseTime = Date.now() - startTime;
        
        logApiRequest({
          endpoint: requestedPath,
          method,
          statusCode,
          responseTime,
          userId,
          success: true,
          userAgent: request.headers.get('user-agent') || undefined,
        }).catch(console.error);

        return NextResponse.json(result);
      } catch (error) {
        console.error('Firebase Admin operation failed:', error);
        statusCode = 500;
        const responseTime = Date.now() - startTime;
        
        logApiRequest({
          endpoint: requestedPath,
          method,
          statusCode,
          responseTime,
          userId,
          success: false,
          userAgent: request.headers.get('user-agent') || undefined,
        }).catch(console.error);

        return NextResponse.json(
          { error: 'Database operation failed', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }
    
    // For other database types, use the unified service adapter
    const dbConfig: any = {
      ...database,
      database: database.databaseName,
      password: database.encryptedPassword,
      tables: [],
      status: 'connected' as const
    };
    
    const unifiedService = UnifiedDatabaseService.getInstance();
    await unifiedService.connectToDatabase(dbConfig);
    const adapter = unifiedService.getAdapter(database.id);

    if (!adapter) {
      return NextResponse.json(
        { error: 'Database adapter not found' },
        { status: 500 }
      );
    }

    // Execute the appropriate database operation
    let result;
    const body = method !== 'GET' ? await request.json().catch(() => ({})) : {};
    const searchParams = request.nextUrl.searchParams;

    switch (method) {
      case 'GET':
        // Apply filters from query params
        const limit = parseInt(searchParams.get('limit') || '100');
        
        // List all documents from the table
        result = await adapter.listDocuments(matchedEndpoint.tableName, limit);
        
        // Apply filters if specified in endpoint config
        if (matchedEndpoint.filters && matchedEndpoint.filters.length > 0) {
          result = result.filter((doc: any) => {
            return matchedEndpoint.filters.every((filter: any) => {
              const docValue = doc[filter.field];
              const filterValue = filter.value;
              
              switch (filter.operator) {
                case 'equals':
                  return docValue === filterValue;
                case 'not_equals':
                  return docValue !== filterValue;
                case 'greater_than':
                  return docValue > filterValue;
                case 'less_than':
                  return docValue < filterValue;
                case 'contains':
                  return String(docValue).includes(filterValue);
                default:
                  return true;
              }
            });
          });
        }
        break;

      case 'POST':
        // Create new document
        result = await adapter.create(
          matchedEndpoint.tableName,
          body.id || undefined,
          body
        );
        break;

      case 'PUT':
      case 'PATCH':
        // Update existing document
        if (!body.id) {
          return NextResponse.json(
            { error: 'Missing id in request body' },
            { status: 400 }
          );
        }
        result = await adapter.update(matchedEndpoint.tableName, body.id, body);
        break;

      case 'DELETE':
        // Delete document
        const deleteId = searchParams.get('id') || body.id;
        if (!deleteId) {
          return NextResponse.json(
            { error: 'Missing id parameter' },
            { status: 400 }
          );
        }
        result = await adapter.delete(matchedEndpoint.tableName, deleteId);
        break;

      default:
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        );
    }

    // Log successful analytics
    const responseTime = Date.now() - startTime;
    logApiRequest({
      endpoint: requestedPath,
      method,
      statusCode: 200,
      responseTime,
      userId,
      success: true,
      userAgent: request.headers.get('user-agent') || undefined,
    }).catch(console.error);

    // Return successful response
    return NextResponse.json({
      success: true,
      data: result,
      endpoint: matchedEndpoint.name,
      table: matchedEndpoint.tableName
    });

  } catch (error) {
    console.error('Dynamic API handler error:', error);
    
    // Log error analytics
    statusCode = 500;
    const responseTime = Date.now() - startTime;
    logApiRequest({
      endpoint: requestedPath,
      method,
      statusCode,
      responseTime,
      userId,
      success: false,
      userAgent: request.headers.get('user-agent') || undefined,
    }).catch(console.error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
