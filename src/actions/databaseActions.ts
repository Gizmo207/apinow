'use server';

import { UnifiedDatabaseService } from '../utils/unifiedDatabase';
import { DatabaseConnection } from '../utils/database';

/**
 * Server action to connect to a database and introspect its schema
 */
export async function introspectDatabaseAction(connection: DatabaseConnection) {
  try {
    // For Supabase, use direct introspection
    if (connection.type === 'supabase' && connection.supabaseUrl && connection.supabaseKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(connection.supabaseUrl, connection.supabaseKey);

      // Use PostgREST introspection endpoint
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
      const tableNames: string[] = [];
      if (openApiSpec.paths) {
        for (const path of Object.keys(openApiSpec.paths)) {
          const match = path.match(/^\/([^/]+)$/);
          if (match && match[1]) {
            tableNames.push(match[1]);
          }
        }
      }

      // Get sample data for each table
      const tables = await Promise.all(
        tableNames.map(async (tableName: string) => {
          try {
            const { data: rows } = await supabase
              .from(tableName)
              .select('*')
              .limit(5);

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
            return null;
          }
        })
      );

      return { success: true, tables: tables.filter((t: any) => t !== null) };
    }

    // For other database types, use unified service
    const unifiedService = UnifiedDatabaseService.getInstance();
    await unifiedService.connectToDatabase(connection);
    const tables = await unifiedService.introspectDatabase(connection.id, connection);
    return { success: true, tables };
  } catch (error) {
    console.error('Database introspection failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to introspect database'
    };
  }
}

/**
 * Server action to get table data
 */
export async function getTableDataAction(connectionId: string, tableName: string, limit = 100, offset = 0) {
  try {
    const unifiedService = UnifiedDatabaseService.getInstance();
    const data = await unifiedService.getTableData(connectionId, tableName, limit, offset);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to get table data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get table data'
    };
  }
}

/**
 * Server action to generate API endpoints
 */
export async function generateEndpointsAction(connectionId: string, connection?: DatabaseConnection) {
  try {
    // For Supabase/Firebase, we need to introspect directly since we're on the server
    if (connection && (connection.type === 'supabase' || connection.type === 'firebase')) {
      // Get tables first via introspection
      const introspectResult = await introspectDatabaseAction(connection);
      if (!introspectResult.success || !introspectResult.tables) {
        throw new Error(introspectResult.error || 'Failed to introspect database');
      }
      
      const collections = introspectResult.tables.map(t => t.name);
      
      // Generate endpoints manually
      const endpoints: any[] = [];
      for (const collection of collections) {
        endpoints.push(
          {
            id: `${collection}-list`,
            collection,
            method: 'GET',
            path: `/${collection}`,
            description: `List all documents in ${collection}`,
            enabled: true
          },
          {
            id: `${collection}-get`,
            collection,
            method: 'GET',
            path: `/${collection}/{id}`,
            description: `Get a single document from ${collection}`,
            enabled: true
          },
          {
            id: `${collection}-create`,
            collection,
            method: 'POST',
            path: `/${collection}`,
            description: `Create a new document in ${collection}`,
            enabled: true
          },
          {
            id: `${collection}-update`,
            collection,
            method: 'PUT',
            path: `/${collection}/{id}`,
            description: `Update a document in ${collection}`,
            enabled: true
          },
          {
            id: `${collection}-delete`,
            collection,
            method: 'DELETE',
            path: `/${collection}/{id}`,
            description: `Delete a document from ${collection}`,
            enabled: true
          }
        );
      }
      
      return { success: true, endpoints };
    }
    
    // For other database types, use the unified service
    const unifiedService = UnifiedDatabaseService.getInstance();
    const endpoints = await unifiedService.generateAPIEndpoints(connectionId, connection);
    return { success: true, endpoints };
  } catch (error) {
    console.error('Failed to generate endpoints:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate endpoints'
    };
  }
}

/**
 * Server action to test an API endpoint
 */
export async function testEndpointAction(connectionId: string, endpointId: string, params: any = {}, body: any = {}) {
  try {
    const unifiedService = UnifiedDatabaseService.getInstance();
    const result = await unifiedService.executeAPIEndpoint(connectionId, endpointId, params, body);
    return { success: true, result };
  } catch (error) {
    console.error('Failed to test endpoint:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test endpoint'
    };
  }
}

/**
 * Server action to connect to database
 */
export async function connectToDatabaseAction(connection: DatabaseConnection) {
  try {
    const unifiedService = UnifiedDatabaseService.getInstance();
    await unifiedService.connectToDatabase(connection);
    return { success: true };
  } catch (error) {
    console.error('Failed to connect to database:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to database'
    };
  }
}
