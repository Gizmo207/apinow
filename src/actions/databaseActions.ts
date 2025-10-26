'use server';

import { UnifiedDatabaseService } from '../utils/unifiedDatabase';
import { DatabaseConnection } from '../utils/database';

/**
 * Server action to connect to a database and introspect its schema
 */
export async function introspectDatabaseAction(connection: DatabaseConnection) {
  try {
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
