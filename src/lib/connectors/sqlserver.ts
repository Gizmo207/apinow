import { DatabaseAdapter } from './types';

// Dynamic import to avoid bundling for client
let sql: any;

export class SQLServerAdapter implements DatabaseAdapter {
  type = 'sqlserver';
  private pool: any = null;
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // Only import mssql on server side
    if (typeof window === 'undefined' && !sql) {
      sql = await import('mssql');
    }

    if (!sql) {
      throw new Error('SQL Server can only be used on the server side');
    }

    try {
      const config = {
        server: this.config.host,
        port: parseInt(this.config.port || '1433'),
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        options: {
          encrypt: this.config.ssl !== false, // Use encryption by default
          trustServerCertificate: true, // For development
          enableArithAbort: true,
        },
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000,
        },
      };

      this.pool = await sql.connect(config);
      
      console.log(`✅ Connected to SQL Server: ${this.config.database}`);
    } catch (error) {
      console.error('❌ SQL Server connection failed:', error);
      throw new Error(`SQL Server connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      console.log('✅ Disconnected from SQL Server');
    }
  }

  async listCollections(): Promise<string[]> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const result = await this.pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE' 
        AND TABLE_SCHEMA = 'dbo'
        ORDER BY TABLE_NAME
      `);
      
      return result.recordset.map((row: any) => row.TABLE_NAME);
    } catch (error) {
      console.error('Failed to list tables:', error);
      throw error;
    }
  }

  async listDocuments(collection: string, limit: number = 100): Promise<any[]> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const result = await this.pool.request()
        .input('limit', sql.Int, limit)
        .query(`SELECT TOP (@limit) * FROM [${collection}]`);
      
      return result.recordset;
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
      
      // Build parameterized query
      const request = this.pool.request();
      columns.forEach((col, i) => {
        request.input(`param${i}`, values[i]);
      });

      const placeholders = columns.map((_, i) => `@param${i}`).join(', ');
      const columnNames = columns.map(c => `[${c}]`).join(', ');

      const query = `
        INSERT INTO [${collection}] (${columnNames})
        OUTPUT INSERTED.*
        VALUES (${placeholders})
      `;

      const result = await request.query(query);
      return result.recordset[0];
    } catch (error) {
      console.error(`Failed to create document in ${collection}:`, error);
      throw error;
    }
  }

  async read(collection: string, id: string): Promise<any> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const result = await this.pool.request()
        .input('id', sql.VarChar, id)
        .query(`SELECT * FROM [${collection}] WHERE id = @id`);

      if (result.recordset.length === 0) {
        throw new Error(`Document not found: ${id}`);
      }

      return result.recordset[0];
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
      
      // Build parameterized query
      const request = this.pool.request();
      columns.forEach((col, i) => {
        request.input(`param${i}`, values[i]);
      });
      request.input('id', sql.VarChar, id);

      const setClause = columns.map((col, i) => `[${col}] = @param${i}`).join(', ');

      const query = `
        UPDATE [${collection}]
        SET ${setClause}
        OUTPUT INSERTED.*
        WHERE id = @id
      `;

      const result = await request.query(query);

      if (result.recordset.length === 0) {
        throw new Error(`Document not found: ${id}`);
      }

      return result.recordset[0];
    } catch (error) {
      console.error(`Failed to update document ${id} in ${collection}:`, error);
      throw error;
    }
  }

  async delete(collection: string, id: string): Promise<{ success: boolean }> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const result = await this.pool.request()
        .input('id', sql.VarChar, id)
        .query(`
          DELETE FROM [${collection}]
          OUTPUT DELETED.*
          WHERE id = @id
        `);

      if (result.recordset.length === 0) {
        throw new Error(`Document not found: ${id}`);
      }

      return { success: true };
    } catch (error) {
      console.error(`Failed to delete document ${id} from ${collection}:`, error);
      throw error;
    }
  }
}
