import { DatabaseAdapter } from './types';

// Dynamic import to avoid bundling for client
let Pool: any;

export class PostgresAdapter implements DatabaseAdapter {
  type = 'postgres';
  private pool: any = null;
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // Only import pg on server side
    if (typeof window === 'undefined' && !Pool) {
      const pg = await import('pg');
      Pool = pg.Pool;
    }

    if (!Pool) {
      throw new Error('PostgreSQL can only be used on the server side');
    }

    try {
      this.pool = new Pool({
        host: this.config.host,
        port: parseInt(this.config.port || '5432'),
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      console.log(`✅ Connected to PostgreSQL: ${this.config.database}`);
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error);
      throw new Error(`PostgreSQL connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('✅ Disconnected from PostgreSQL');
    }
  }

  async listCollections(): Promise<string[]> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const result = await this.pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      return result.rows.map((row: any) => row.table_name);
    } catch (error) {
      console.error('Failed to list tables:', error);
      throw error;
    }
  }

  async listDocuments(collection: string, limit: number = 100): Promise<any[]> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const result = await this.pool.query(`
        SELECT * FROM ${this.escapeIdentifier(collection)} 
        LIMIT $1
      `, [limit]);
      
      return result.rows;
    } catch (error) {
      console.error(`Failed to list documents from ${collection}:`, error);
      throw error;
    }
  }

  async create(collection: string, id: string | undefined, data: any): Promise<any> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

      const query = `
        INSERT INTO ${this.escapeIdentifier(collection)} (${columns.map(c => this.escapeIdentifier(c)).join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(`Failed to create document in ${collection}:`, error);
      throw error;
    }
  }

  async read(collection: string, id: string): Promise<any> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const result = await this.pool.query(`
        SELECT * FROM ${this.escapeIdentifier(collection)} 
        WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) {
        throw new Error(`Document not found: ${id}`);
      }

      return result.rows[0];
    } catch (error) {
      console.error(`Failed to read document ${id} from ${collection}:`, error);
      throw error;
    }
  }

  async update(collection: string, id: string, data: any): Promise<any> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const setClause = columns.map((col, i) => `${this.escapeIdentifier(col)} = $${i + 1}`).join(', ');

      const query = `
        UPDATE ${this.escapeIdentifier(collection)} 
        SET ${setClause}
        WHERE id = $${values.length + 1}
        RETURNING *
      `;

      const result = await this.pool.query(query, [...values, id]);

      if (result.rows.length === 0) {
        throw new Error(`Document not found: ${id}`);
      }

      return result.rows[0];
    } catch (error) {
      console.error(`Failed to update document ${id} in ${collection}:`, error);
      throw error;
    }
  }

  async delete(collection: string, id: string): Promise<{ success: boolean }> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const result = await this.pool.query(`
        DELETE FROM ${this.escapeIdentifier(collection)} 
        WHERE id = $1
        RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        throw new Error(`Document not found: ${id}`);
      }

      return { success: true };
    } catch (error) {
      console.error(`Failed to delete document ${id} from ${collection}:`, error);
      throw error;
    }
  }

  private escapeIdentifier(identifier: string): string {
    // Basic SQL identifier escaping (for production, use proper library)
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}
