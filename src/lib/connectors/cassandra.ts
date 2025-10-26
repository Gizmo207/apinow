import { DatabaseAdapter } from './types';

// Dynamic import to avoid bundling for client
let cassandra: any;

export class CassandraAdapter implements DatabaseAdapter {
  type = 'cassandra';
  private client: any = null;
  private config: any;
  private keyspace: string = '';

  constructor(config: any) {
    this.config = config;
    this.keyspace = config.keyspace || config.database || 'system';
  }

  async connect(): Promise<void> {
    // Only import cassandra-driver on server side
    if (typeof window === 'undefined' && !cassandra) {
      cassandra = await import('cassandra-driver');
    }

    if (!cassandra) {
      throw new Error('Cassandra can only be used on the server side');
    }

    try {
      const contactPoints = this.config.contactPoints || [this.config.host || 'localhost'];
      const localDataCenter = this.config.localDataCenter || 'datacenter1';
      
      this.client = new cassandra.Client({
        contactPoints,
        localDataCenter,
        keyspace: this.keyspace,
        credentials: this.config.username && this.config.password ? {
          username: this.config.username,
          password: this.config.password,
        } : undefined,
      });

      await this.client.connect();
      
      console.log(`✅ Connected to Cassandra keyspace: ${this.keyspace}`);
    } catch (error) {
      console.error('❌ Cassandra connection failed:', error);
      throw new Error(`Cassandra connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.shutdown();
      this.client = null;
      console.log('✅ Disconnected from Cassandra');
    }
  }

  async listCollections(): Promise<string[]> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      const query = `
        SELECT table_name 
        FROM system_schema.tables 
        WHERE keyspace_name = ?
      `;
      
      const result = await this.client.execute(query, [this.keyspace]);
      
      return result.rows.map((row: any) => row.table_name);
    } catch (error) {
      console.error('Failed to list tables:', error);
      throw error;
    }
  }

  async listDocuments(collection: string, limit: number = 100): Promise<any[]> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      const query = `SELECT * FROM ${this.keyspace}.${collection} LIMIT ?`;
      const result = await this.client.execute(query, [limit], { prepare: true });
      
      return result.rows.map((row: any) => this.rowToObject(row));
    } catch (error) {
      console.error(`Failed to list documents from ${collection}:`, error);
      throw error;
    }
  }

  async create(collection: string, id: string | undefined, data: any): Promise<any> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      const docId = id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const item = { id: docId, ...data };
      
      const columns = Object.keys(item);
      const placeholders = columns.map(() => '?').join(', ');
      const values = Object.values(item);
      
      const query = `
        INSERT INTO ${this.keyspace}.${collection} (${columns.join(', ')})
        VALUES (${placeholders})
      `;
      
      await this.client.execute(query, values, { prepare: true });
      
      return item;
    } catch (error) {
      console.error(`Failed to create document in ${collection}:`, error);
      throw error;
    }
  }

  async read(collection: string, id: string): Promise<any> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      const query = `SELECT * FROM ${this.keyspace}.${collection} WHERE id = ?`;
      const result = await this.client.execute(query, [id], { prepare: true });
      
      if (result.rows.length === 0) {
        throw new Error(`Document not found: ${id}`);
      }
      
      return this.rowToObject(result.rows[0]);
    } catch (error) {
      console.error(`Failed to read document ${id} from ${collection}:`, error);
      throw error;
    }
  }

  async update(collection: string, id: string, data: any): Promise<any> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      // Remove id from update data
      const { id: _, ...updateData } = data;
      
      const columns = Object.keys(updateData);
      const setClause = columns.map(col => `${col} = ?`).join(', ');
      const values = [...Object.values(updateData), id];
      
      const query = `
        UPDATE ${this.keyspace}.${collection}
        SET ${setClause}
        WHERE id = ?
      `;
      
      await this.client.execute(query, values, { prepare: true });
      
      // Read back the updated record
      return await this.read(collection, id);
    } catch (error) {
      console.error(`Failed to update document ${id} in ${collection}:`, error);
      throw error;
    }
  }

  async delete(collection: string, id: string): Promise<{ success: boolean }> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      const query = `DELETE FROM ${this.keyspace}.${collection} WHERE id = ?`;
      await this.client.execute(query, [id], { prepare: true });
      
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete document ${id} from ${collection}:`, error);
      throw error;
    }
  }

  private rowToObject(row: any): any {
    // Convert Cassandra row to plain object
    const obj: any = {};
    if (row && typeof row === 'object') {
      for (const key in row) {
        obj[key] = row[key];
      }
    }
    return obj;
  }
}
