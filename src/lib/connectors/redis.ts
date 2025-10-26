import { DatabaseAdapter } from './types';

// Dynamic import to avoid bundling for client
let Redis: any;

export class RedisAdapter implements DatabaseAdapter {
  type = 'redis';
  private client: any = null;
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // Only import ioredis on server side
    if (typeof window === 'undefined' && !Redis) {
      const ioredis = await import('ioredis');
      Redis = ioredis.default;
    }

    if (!Redis) {
      throw new Error('Redis can only be used on the server side');
    }

    try {
      this.client = new Redis({
        host: this.config.host || 'localhost',
        port: parseInt(this.config.port || '6379'),
        password: this.config.password || this.config.redisPassword,
        db: parseInt(this.config.database || '0'),
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      // Test connection
      await this.client.ping();
      
      console.log(`✅ Connected to Redis: ${this.config.host}:${this.config.port || 6379}`);
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw new Error(`Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      console.log('✅ Disconnected from Redis');
    }
  }

  async listCollections(): Promise<string[]> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      // In Redis, we use key patterns as "collections"
      // Get all unique prefixes (collections)
      const keys = await this.client.keys('*');
      
      // Extract unique prefixes (collection names)
      const collections = new Set<string>();
      keys.forEach((key: string) => {
        // If key contains ':', use prefix as collection
        const colonIndex = key.indexOf(':');
        if (colonIndex > 0) {
          collections.add(key.substring(0, colonIndex));
        } else {
          collections.add('default'); // Keys without prefix go to 'default' collection
        }
      });
      
      return Array.from(collections);
    } catch (error) {
      console.error('Failed to list collections:', error);
      throw error;
    }
  }

  async listDocuments(collection: string, limit: number = 100): Promise<any[]> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      // Get keys matching the collection pattern
      const pattern = collection === 'default' ? '*' : `${collection}:*`;
      const keys = await this.client.keys(pattern);
      
      // Limit results
      const limitedKeys = keys.slice(0, limit);
      
      // Get values for each key
      const documents = await Promise.all(
        limitedKeys.map(async (key: string) => {
          const value = await this.client.get(key);
          const id = collection === 'default' ? key : key.substring(collection.length + 1);
          
          try {
            // Try to parse as JSON
            const parsed = JSON.parse(value);
            return { id, ...parsed };
          } catch {
            // If not JSON, return as string value
            return { id, value };
          }
        })
      );
      
      return documents;
    } catch (error) {
      console.error(`Failed to list documents from ${collection}:`, error);
      throw error;
    }
  }

  async create(collection: string, id: string | undefined, data: any): Promise<any> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      // Generate ID if not provided
      const docId = id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Build Redis key
      const key = collection === 'default' ? docId : `${collection}:${docId}`;
      
      // Store data as JSON
      const value = JSON.stringify(data);
      await this.client.set(key, value);
      
      return { id: docId, ...data };
    } catch (error) {
      console.error(`Failed to create document in ${collection}:`, error);
      throw error;
    }
  }

  async read(collection: string, id: string): Promise<any> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      // Build Redis key
      const key = collection === 'default' ? id : `${collection}:${id}`;
      
      const value = await this.client.get(key);
      
      if (!value) {
        throw new Error(`Document not found: ${id}`);
      }
      
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(value);
        return { id, ...parsed };
      } catch {
        // If not JSON, return as string value
        return { id, value };
      }
    } catch (error) {
      console.error(`Failed to read document ${id} from ${collection}:`, error);
      throw error;
    }
  }

  async update(collection: string, id: string, data: any): Promise<any> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      // Build Redis key
      const key = collection === 'default' ? id : `${collection}:${id}`;
      
      // Check if key exists
      const exists = await this.client.exists(key);
      if (!exists) {
        throw new Error(`Document not found: ${id}`);
      }
      
      // Remove id from data
      const { id: _, ...updateData } = data;
      
      // Update by setting new value
      const value = JSON.stringify(updateData);
      await this.client.set(key, value);
      
      return { id, ...updateData };
    } catch (error) {
      console.error(`Failed to update document ${id} in ${collection}:`, error);
      throw error;
    }
  }

  async delete(collection: string, id: string): Promise<{ success: boolean }> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      // Build Redis key
      const key = collection === 'default' ? id : `${collection}:${id}`;
      
      const deleted = await this.client.del(key);
      
      if (deleted === 0) {
        throw new Error(`Document not found: ${id}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete document ${id} from ${collection}:`, error);
      throw error;
    }
  }
}
