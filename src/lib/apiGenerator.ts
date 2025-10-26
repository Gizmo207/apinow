// Generic API router for any database adapter
import { DatabaseAdapter } from './connectors';

export interface APIEndpoint {
  id: string;
  collection: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  enabled: boolean;
}

export class DatabaseAPIGenerator {
  private adapter: DatabaseAdapter;
  private endpoints: Map<string, APIEndpoint> = new Map();

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
  }

  async generateEndpoints(): Promise<APIEndpoint[]> {
    const collections = await this.adapter.listCollections();
    const endpoints: APIEndpoint[] = [];

    console.log('[APIGenerator] Collections from adapter:', collections);

    for (const collection of collections) {
      console.log('[APIGenerator] Generating endpoints for collection:', collection);
      // List all documents in collection
      endpoints.push({
        id: `${collection}-list`,
        collection,
        method: 'GET',
        path: `/${collection}`,
        description: `List all documents in ${collection}`,
        enabled: true
      });

      // Create new document
      endpoints.push({
        id: `${collection}-create`,
        collection,
        method: 'POST',
        path: `/${collection}`,
        description: `Create a new document in ${collection}`,
        enabled: true
      });

      // Get single document
      endpoints.push({
        id: `${collection}-read`,
        collection,
        method: 'GET',
        path: `/${collection}/:id`,
        description: `Get a single document from ${collection}`,
        enabled: true
      });

      // Update document
      endpoints.push({
        id: `${collection}-update`,
        collection,
        method: 'PUT',
        path: `/${collection}/:id`,
        description: `Update a document in ${collection}`,
        enabled: true
      });

      // Delete document
      endpoints.push({
        id: `${collection}-delete`,
        collection,
        method: 'DELETE',
        path: `/${collection}/:id`,
        description: `Delete a document from ${collection}`,
        enabled: true
      });
    }

    // Store endpoints
    endpoints.forEach(endpoint => {
      this.endpoints.set(endpoint.id, endpoint);
    });

    return endpoints;
  }

  async executeEndpoint(endpointId: string, params: any = {}, body: any = {}): Promise<any> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${endpointId}`);
    }

    const { collection, method } = endpoint;
    const { id } = params;

    try {
      switch (method) {
        case 'GET':
          if (id) {
            // Get single document
            return await this.adapter.read(collection, id);
          } else {
            // List documents
            const limit = params.limit ? parseInt(params.limit) : 100;
            return await this.adapter.listDocuments(collection, limit);
          }

        case 'POST':
          // Create document
          return await this.adapter.create(collection, body.id, body);

        case 'PUT':
          // Update document
          if (!id) throw new Error('ID required for update');
          return await this.adapter.update(collection, id, body);

        case 'DELETE':
          // Delete document
          if (!id) throw new Error('ID required for delete');
          return await this.adapter.delete(collection, id);

        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    } catch (error) {
      console.error(`Error executing endpoint ${endpointId}:`, error);
      throw error;
    }
  }

  getEndpoints(): APIEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  getEndpoint(id: string): APIEndpoint | undefined {
    return this.endpoints.get(id);
  }

  async disconnect(): Promise<void> {
    if (this.adapter.disconnect) {
      await this.adapter.disconnect();
    }
  }
}
