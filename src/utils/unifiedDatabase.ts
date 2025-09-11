// Unified database service for APIFlow
import { connectDatabase, DatabaseAdapter, DatabaseConfig } from '../lib/connectors';
import { DatabaseAPIGenerator, APIEndpoint } from '../lib/apiGenerator';
import { DatabaseConnection, DatabaseTable, DatabaseColumn } from './database';

export class UnifiedDatabaseService {
  private adapters: Map<string, DatabaseAdapter> = new Map();
  private apiGenerators: Map<string, DatabaseAPIGenerator> = new Map();
  private static instance: UnifiedDatabaseService;

  static getInstance(): UnifiedDatabaseService {
    if (!UnifiedDatabaseService.instance) {
      UnifiedDatabaseService.instance = new UnifiedDatabaseService();
    }
    return UnifiedDatabaseService.instance;
  }

  async connectToDatabase(connection: DatabaseConnection): Promise<DatabaseAdapter> {
    try {
      let config: DatabaseConfig;

      switch (connection.type) {
        case 'firebase':
          config = {
            type: 'firestore',
            projectId: connection.projectId!,
            apiKey: connection.apiKey!,
            authDomain: connection.authDomain,
            // Include Firebase Admin SDK credentials
            serviceAccountKey: connection.serviceAccountKey,
            databaseURL: connection.databaseURL,
            storageBucket: connection.storageBucket
          };
          break;

        case 'sqlite':
          config = {
            type: 'sqlite',
            path: connection.database || ':memory:'
          };
          break;

        case 'postgresql':
          config = {
            type: 'postgres',
            host: connection.host,
            port: parseInt(connection.port || '5432'),
            database: connection.database,
            user: connection.username,
            password: connection.password
          };
          break;

        case 'mysql':
          config = {
            type: 'mysql',
            host: connection.host,
            port: parseInt(connection.port || '3306'),
            database: connection.database,
            user: connection.username,
            password: connection.password
          };
          break;

        default:
          throw new Error(`Unsupported database type: ${connection.type}`);
      }

      const adapter = await connectDatabase(config);
      this.adapters.set(connection.id, adapter);

      // Create API generator for this database
      const apiGenerator = new DatabaseAPIGenerator(adapter);
      this.apiGenerators.set(connection.id, apiGenerator);

      console.log(`Connected to ${adapter.type} database: ${connection.name}`);
      return adapter;

    } catch (error) {
      console.error(`Failed to connect to database ${connection.name}:`, error);
      throw error;
    }
  }

  async introspectDatabase(connectionId: string): Promise<DatabaseTable[]> {
    const adapter = this.adapters.get(connectionId);
    if (!adapter) {
      throw new Error(`No adapter found for connection: ${connectionId}`);
    }

    try {
      const collections = await adapter.listCollections();
      const tables: DatabaseTable[] = [];

      for (const collectionName of collections) {
        try {
          // Get sample documents to infer schema
          const sampleDocs = await adapter.listDocuments(collectionName, 5);
          
          if (sampleDocs.length > 0) {
            // Analyze document structure from first document
            const firstDoc = sampleDocs[0];
            const columns: DatabaseColumn[] = Object.keys(firstDoc).map(fieldName => {
              const fieldValue = firstDoc[fieldName];
              let fieldType = 'string'; // default type
              
              if (typeof fieldValue === 'number') {
                fieldType = 'number';
              } else if (typeof fieldValue === 'boolean') {
                fieldType = 'boolean';
              } else if (fieldValue instanceof Date || (fieldValue && typeof fieldValue === 'object' && fieldValue.toDate)) {
                fieldType = 'timestamp';
              } else if (Array.isArray(fieldValue)) {
                fieldType = 'array';
              } else if (typeof fieldValue === 'object' && fieldValue !== null) {
                fieldType = 'object';
              }
              
              return {
                name: fieldName,
                type: fieldType,
                nullable: true,
                primaryKey: fieldName === 'id' || fieldName === '_id',
                foreignKey: fieldName.endsWith('Id') && fieldName !== 'id' ? `${fieldName.replace('Id', '')}.id` : undefined
              };
            });

            tables.push({
              id: `collection_${collectionName}`,
              name: collectionName,
              rowCount: sampleDocs.length, // Approximate count
              columns
            });
          }
        } catch (error) {
          console.warn(`Could not introspect collection ${collectionName}:`, error);
          // Add as denied collection
          tables.push({
            id: `collection_${collectionName}`,
            name: collectionName,
            rowCount: 0,
            columns: [],
            meta: { 
              permissionDenied: true, 
              source: 'unified-connector' 
            }
          });
        }
      }

      return tables;
    } catch (error) {
      console.error(`Database introspection failed for ${connectionId}:`, error);
      throw error;
    }
  }

  async generateAPIEndpoints(connectionId: string): Promise<APIEndpoint[]> {
    const apiGenerator = this.apiGenerators.get(connectionId);
    if (!apiGenerator) {
      throw new Error(`No API generator found for connection: ${connectionId}`);
    }

    return await apiGenerator.generateEndpoints();
  }

  async executeAPIEndpoint(connectionId: string, endpointId: string, params: any = {}, body: any = {}): Promise<any> {
    const apiGenerator = this.apiGenerators.get(connectionId);
    if (!apiGenerator) {
      throw new Error(`No API generator found for connection: ${connectionId}`);
    }

    return await apiGenerator.executeEndpoint(endpointId, params, body);
  }

  async getTableData(connectionId: string, tableName: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    const adapter = this.adapters.get(connectionId);
    if (!adapter) {
      throw new Error(`No adapter found for connection: ${connectionId}`);
    }

    try {
      const allDocs = await adapter.listDocuments(tableName, limit + offset);
      return allDocs.slice(offset, offset + limit);
    } catch (error) {
      console.error(`Failed to get table data for ${tableName}:`, error);
      return [];
    }
  }

  async disconnect(connectionId: string): Promise<void> {
    const adapter = this.adapters.get(connectionId);
    if (adapter && adapter.disconnect) {
      await adapter.disconnect();
    }
    
    this.adapters.delete(connectionId);
    this.apiGenerators.delete(connectionId);
  }

  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.adapters.keys()).map(id => this.disconnect(id));
    await Promise.all(promises);
  }

  getAdapter(connectionId: string): DatabaseAdapter | undefined {
    return this.adapters.get(connectionId);
  }

  getAPIGenerator(connectionId: string): DatabaseAPIGenerator | undefined {
    return this.apiGenerators.get(connectionId);
  }

  getConnectedDatabases(): string[] {
    return Array.from(this.adapters.keys());
  }
}
