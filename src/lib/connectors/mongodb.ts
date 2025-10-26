import { DatabaseAdapter } from './types';

// Dynamic import to avoid bundling for client
let MongoClient: any;
let ObjectId: any;

export class MongoDBAdapter implements DatabaseAdapter {
  type = 'mongodb';
  private client: any = null;
  private db: any = null;
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // Only import mongodb on server side
    if (typeof window === 'undefined' && !MongoClient) {
      const mongodb = await import('mongodb');
      MongoClient = mongodb.MongoClient;
      ObjectId = mongodb.ObjectId;
    }

    if (!MongoClient) {
      throw new Error('MongoDB can only be used on the server side');
    }

    try {
      // Build connection string
      let connectionString = this.config.connectionString;
      
      if (!connectionString) {
        // Build from individual components
        const protocol = this.config.ssl ? 'mongodb+srv' : 'mongodb';
        const auth = this.config.username && this.config.password 
          ? `${encodeURIComponent(this.config.username)}:${encodeURIComponent(this.config.password)}@`
          : '';
        const host = this.config.host || 'localhost';
        const port = this.config.port ? `:${this.config.port}` : '';
        const database = this.config.database || 'test';
        
        connectionString = `${protocol}://${auth}${host}${port}/${database}`;
      }

      this.client = new MongoClient(connectionString, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
      });

      await this.client.connect();
      
      // Get database name from connection string or config
      const dbName = this.config.database || 
                     this.config.connectionString?.split('/').pop()?.split('?')[0] || 
                     'test';
      
      this.db = this.client.db(dbName);
      
      // Test connection
      await this.db.admin().ping();
      
      console.log(`✅ Connected to MongoDB: ${dbName}`);
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw new Error(`MongoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('✅ Disconnected from MongoDB');
    }
  }

  async listCollections(): Promise<string[]> {
    if (!this.db) throw new Error('Not connected to database');

    try {
      const collections = await this.db.listCollections().toArray();
      return collections.map((col: any) => col.name);
    } catch (error) {
      console.error('Failed to list collections:', error);
      throw error;
    }
  }

  async listDocuments(collection: string, limit: number = 100): Promise<any[]> {
    if (!this.db) throw new Error('Not connected to database');

    try {
      const col = this.db.collection(collection);
      const documents = await col.find({}).limit(limit).toArray();
      
      // Convert MongoDB _id to id for consistency
      return documents.map((doc: any) => ({
        ...doc,
        id: doc._id.toString(),
      }));
    } catch (error) {
      console.error(`Failed to list documents from ${collection}:`, error);
      throw error;
    }
  }

  async create(collection: string, id: string | undefined, data: any): Promise<any> {
    if (!this.db) throw new Error('Not connected to database');

    try {
      const col = this.db.collection(collection);
      
      // Remove id from data if it exists (MongoDB uses _id)
      const { id: _, ...docData } = data;
      
      // If ID provided, use it as _id
      const insertDoc = id ? { _id: new ObjectId(id), ...docData } : docData;
      
      const result = await col.insertOne(insertDoc);
      
      // Return the inserted document
      const insertedDoc = await col.findOne({ _id: result.insertedId });
      
      return {
        ...insertedDoc,
        id: insertedDoc._id.toString(),
      };
    } catch (error) {
      console.error(`Failed to create document in ${collection}:`, error);
      throw error;
    }
  }

  async read(collection: string, id: string): Promise<any> {
    if (!this.db) throw new Error('Not connected to database');

    try {
      const col = this.db.collection(collection);
      
      // Try to convert to ObjectId, fallback to string if invalid
      let query: any;
      try {
        query = { _id: new ObjectId(id) };
      } catch {
        query = { _id: id };
      }
      
      const document = await col.findOne(query);

      if (!document) {
        throw new Error(`Document not found: ${id}`);
      }

      return {
        ...document,
        id: document._id.toString(),
      };
    } catch (error) {
      console.error(`Failed to read document ${id} from ${collection}:`, error);
      throw error;
    }
  }

  async update(collection: string, id: string, data: any): Promise<any> {
    if (!this.db) throw new Error('Not connected to database');

    try {
      const col = this.db.collection(collection);
      
      // Remove id from data (can't update _id)
      const { id: _, ...updateData } = data;
      
      // Try to convert to ObjectId
      let query: any;
      try {
        query = { _id: new ObjectId(id) };
      } catch {
        query = { _id: id };
      }
      
      const result = await col.findOneAndUpdate(
        query,
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        throw new Error(`Document not found: ${id}`);
      }

      return {
        ...result,
        id: result._id.toString(),
      };
    } catch (error) {
      console.error(`Failed to update document ${id} in ${collection}:`, error);
      throw error;
    }
  }

  async delete(collection: string, id: string): Promise<{ success: boolean }> {
    if (!this.db) throw new Error('Not connected to database');

    try {
      const col = this.db.collection(collection);
      
      // Try to convert to ObjectId
      let query: any;
      try {
        query = { _id: new ObjectId(id) };
      } catch {
        query = { _id: id };
      }
      
      const result = await col.deleteOne(query);

      if (result.deletedCount === 0) {
        throw new Error(`Document not found: ${id}`);
      }

      return { success: true };
    } catch (error) {
      console.error(`Failed to delete document ${id} from ${collection}:`, error);
      throw error;
    }
  }
}
