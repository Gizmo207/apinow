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

        case 'supabase':
          config = {
            type: 'supabase',
            supabaseUrl: connection.supabaseUrl!,
            supabaseKey: connection.supabaseKey!
          };
          break;

        case 'mongodb':
          config = {
            type: 'mongo',
            connectionString: connection.connectionString,
            host: connection.host,
            port: parseInt(connection.port || '27017'),
            database: connection.database,
            user: connection.username,
            password: connection.password
          };
          break;

        case 'redis':
          config = {
            type: 'redis',
            host: connection.host,
            port: parseInt(connection.port || '6379'),
            password: connection.password
          };
          break;

        case 'sqlserver':
          config = {
            type: 'sqlserver',
            host: connection.host,
            port: parseInt(connection.port || '1433'),
            database: connection.database,
            user: connection.username,
            password: connection.password
          };
          break;

        case 'mariadb':
          config = {
            type: 'mariadb',
            host: connection.host,
            port: parseInt(connection.port || '3306'),
            database: connection.database,
            user: connection.username,
            password: connection.password
          };
          break;

        case 'dynamodb':
          config = {
            type: 'dynamodb',
            region: connection.region!,
            accessKeyId: connection.accessKeyId,
            secretAccessKey: connection.secretAccessKey
          };
          break;

        case 'oracle':
          config = {
            type: 'oracle',
            host: connection.host,
            port: parseInt(connection.port || '1521'),
            database: connection.database,
            user: connection.username,
            password: connection.password
          };
          break;

        case 'cassandra':
          config = {
            type: 'cassandra',
            contactPoints: connection.host ? [connection.host] : ['127.0.0.1'],
            localDataCenter: connection.database || 'datacenter1',
            keyspace: connection.database
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

  async introspectDatabase(connectionId: string, connection?: DatabaseConnection): Promise<DatabaseTable[]> {
    const adapter = this.adapters.get(connectionId);
    if (!adapter) {
      throw new Error(`No adapter found for connection: ${connectionId}`);
    }

    // For Firebase, use server-side API route
    if (adapter.type === 'firestore' && connection) {
      try {
        const response = await fetch('/api/database/introspect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connection })
        });

        if (!response.ok) {
          throw new Error(`API introspection failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.tables || [];
      } catch (error) {
        console.error('Failed to introspect Firebase via API:', error);
        throw error;
      }
    }

    // For other database types, use client-side adapter
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
              } else if (typeof fieldValue === 'object' && fieldValue !== null) {
                fieldType = typeof fieldValue.toDate === 'function' ? 'timestamp' : 
                           Array.isArray(fieldValue) ? 'array' : 'object';
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
              rowCount: sampleDocs.length,
              columns
            });
          }
        } catch (error) {
          console.warn(`Could not introspect collection ${collectionName}:`, error);
        }
      }

      return tables;
    } catch (error) {
      console.error(`Database introspection failed for ${connectionId}:`, error);
      throw error;
    }
  }

  async generateAPIEndpoints(connectionId: string, connection?: DatabaseConnection): Promise<APIEndpoint[]> {
    const adapter = this.adapters.get(connectionId);
    const apiGenerator = this.apiGenerators.get(connectionId);
    
    if (!apiGenerator || !adapter) {
      throw new Error(`No API generator found for connection: ${connectionId}`);
    }

    // For Firebase, get collections via server-side API
    if (adapter.type === 'firestore' && connection) {
      try {
        const response = await fetch('/api/database/introspect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connection })
        });

        if (!response.ok) {
          throw new Error(`API introspection failed: ${response.statusText}`);
        }

        const data = await response.json();
        const collections = data.collections || [];
        
        // Generate endpoints manually
        const endpoints: APIEndpoint[] = [];
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
              id: `${collection}-create`,
              collection,
              method: 'POST',
              path: `/${collection}`,
              description: `Create a new document in ${collection}`,
              enabled: true
            },
            {
              id: `${collection}-read`,
              collection,
              method: 'GET',
              path: `/${collection}/:id`,
              description: `Get a single document from ${collection}`,
              enabled: true
            },
            {
              id: `${collection}-update`,
              collection,
              method: 'PUT',
              path: `/${collection}/:id`,
              description: `Update a document in ${collection}`,
              enabled: true
            },
            {
              id: `${collection}-delete`,
              collection,
              method: 'DELETE',
              path: `/${collection}/:id`,
              description: `Delete a document from ${collection}`,
              enabled: true
            }
          );
        }
        
        return endpoints;
      } catch (error) {
        console.error('Failed to generate Firebase endpoints via API:', error);
        throw error;
      }
    }

    // For other database types, use the generator
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
