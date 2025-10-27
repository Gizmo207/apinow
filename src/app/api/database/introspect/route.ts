import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already done
function getAdminApp(projectId: string, serviceAccountKey: string) {
  try {
    // Try to get existing app
    return admin.app(projectId);
  } catch {
    // App doesn't exist, create it
    const serviceAccount = JSON.parse(serviceAccountKey);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    }, projectId);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connection } = body;

    if (!connection) {
      return NextResponse.json({ error: 'Connection details required' }, { status: 400 });
    }

    // Handle Supabase
    if (connection.type === 'supabase' && connection.supabaseUrl && connection.supabaseKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(connection.supabaseUrl, connection.supabaseKey);

        // Use PostgREST introspection endpoint to get all tables
        const introspectUrl = `${connection.supabaseUrl}/rest/v1/`;
        const response = await fetch(introspectUrl, {
          headers: {
            'apikey': connection.supabaseKey,
            'Authorization': `Bearer ${connection.supabaseKey}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to introspect Supabase: ${response.statusText}`);
        }

        const openApiSpec = await response.json();
        // Extract table names from OpenAPI paths
        const tableNames: string[] = [];
        if (openApiSpec.paths) {
          for (const path of Object.keys(openApiSpec.paths)) {
            // Paths look like "/{table_name}"
            const match = path.match(/^\/([^/]+)$/);
            if (match && match[1]) {
              tableNames.push(match[1]);
            }
          }
        }
        
        // Get sample data and columns for each table
        const tableResults = await Promise.all(
          tableNames.map(async (tableName: string) => {
            try {
              const { data: rows, error: rowError } = await supabase
                .from(tableName)
                .select('*')
                .limit(5);

              if (rowError) {
                console.error(`Error accessing table ${tableName}:`, rowError);
                return null;
              }

              // Infer columns from sample data
              const columns: any[] = [];
              if (rows && rows.length > 0) {
                const allKeys = new Set<string>();
                rows.forEach((row: any) => {
                  Object.keys(row).forEach(key => allKeys.add(key));
                });

                allKeys.forEach(key => {
                  const sampleValue = rows.find((row: any) => row[key] !== undefined)?.[key];
                  columns.push({
                    name: key,
                    type: typeof sampleValue,
                    nullable: true
                  });
                });
              }

              return {
                id: `table_${tableName}`,
                name: tableName,
                type: 'table',
                columns,
                rowCount: rows?.length || 0
              };
            } catch (error) {
              console.error(`Error accessing table ${tableName}:`, error);
              return null;
            }
          })
        );

        return NextResponse.json({
          tables: tableResults.filter((t: any) => t !== null),
          collections: tableNames
        });

      } catch (error) {
        console.error('Supabase introspection error:', error);
        return NextResponse.json({ 
          error: 'Failed to introspect Supabase database',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Handle Firebase/Firestore
    if (connection.type === 'firebase' && connection.serviceAccountKey) {
      try {
        const app = getAdminApp(connection.projectId, connection.serviceAccountKey);
        const db = admin.firestore(app);

        // List collections
        const collections = await db.listCollections();
        const collectionNames = collections.map((col: any) => col.id);

        // Get sample documents from each collection
        const tables = await Promise.all(
          collectionNames.map(async (collectionName) => {
            try {
              const snapshot = await db.collection(collectionName).limit(5).get();
              const sampleDocs = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
              })) as any[];

              // Infer schema from sample documents
              const columns: any[] = [];
              if (sampleDocs.length > 0) {
                const allKeys = new Set<string>();
                sampleDocs.forEach(doc => {
                  Object.keys(doc).forEach(key => allKeys.add(key));
                });

                allKeys.forEach(key => {
                  const sampleValue = sampleDocs.find(doc => doc[key] !== undefined)?.[key];
                  columns.push({
                    name: key,
                    type: typeof sampleValue,
                    nullable: true
                  });
                });
              }

              return {
                id: `collection_${collectionName}`,
                name: collectionName,
                type: 'collection',
                columns,
                rowCount: snapshot.size
              };
            } catch (error) {
              console.error(`Error accessing collection ${collectionName}:`, error);
              return null;
            }
          })
        );

        return NextResponse.json({
          tables: tables.filter((t: any) => t !== null),
          collections: collectionNames
        });

      } catch (error) {
        console.error('Firebase Admin error:', error);
        return NextResponse.json({ 
          error: 'Failed to introspect Firebase database',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Handle other database types (SQLite, MySQL, PostgreSQL)
    // For now, return empty result for non-Firebase
    return NextResponse.json({
      tables: [],
      collections: []
    });

  } catch (error) {
    console.error('Introspection error:', error);
    return NextResponse.json({ 
      error: 'Failed to introspect database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
