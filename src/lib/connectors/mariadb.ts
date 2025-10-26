import { DatabaseAdapter } from './types';

// Dynamic import to avoid bundling for client
let mysql: any;

export class MariaDBAdapter implements DatabaseAdapter {
  type = 'mariadb';
  private pool: any = null;
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // MariaDB uses mysql2 (fully compatible)
    if (typeof window === 'undefined' && !mysql) {
      mysql = await import('mysql2/promise');
    }

    if (!mysql) {
      throw new Error('MariaDB can only be used on the server side');
    }

    try {
      this.pool = mysql.createPool({
        host: this.config.host,
        port: parseInt(this.config.port || '3306'),
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });

      // Test connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      
      console.log(`✅ Connected to MariaDB: ${this.config.database}`);
    } catch (error) {
      console.error('❌ MariaDB connection failed:', error);
      throw new Error(`MariaDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('✅ Disconnected from MariaDB');
    }
  }

  async listCollections(): Promise<string[]> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const [rows] = await this.pool.query('SHOW TABLES');
      
      const dbName = this.config.database;
      const tableKey = `Tables_in_${dbName}`;
      
      return rows.map((row: any) => row[tableKey] || Object.values(row)[0]);
    } catch (error) {
      console.error('Failed to list tables:', error);
      throw error;
    }
  }

  async listDocuments(collection: string, limit: number = 100): Promise<any[]> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const [rows] = await this.pool.query(
        `SELECT * FROM ?? LIMIT ?`,
        [collection, limit]
      );
      
      return rows as any[];
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
      const placeholders = columns.map(() => '?').join(', ');

      const [result] = await this.pool.query(
        `INSERT INTO ?? (${columns.map(() => '??').join(', ')}) VALUES (${placeholders})`,
        [collection, ...columns, ...values]
      );

      const insertId = (result as any).insertId;
      
      if (insertId) {
        const [rows] = await this.pool.query(
          `SELECT * FROM ?? WHERE id = ?`,
          [collection, insertId]
        );
        return rows[0];
      }

      return { id: id || insertId, ...data };
    } catch (error) {
      console.error(`Failed to create document in ${collection}:`, error);
      throw error;
    }
  }

  async read(collection: string, id: string): Promise<any> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const [rows] = await this.pool.query(
        `SELECT * FROM ?? WHERE id = ?`,
        [collection, id]
      );

      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error(`Document not found: ${id}`);
      }

      return rows[0];
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
      const setClause = columns.map(col => '?? = ?').join(', ');

      const params: any[] = [collection];
      columns.forEach((col, i) => {
        params.push(col, values[i]);
      });
      params.push(id);

      await this.pool.query(
        `UPDATE ?? SET ${setClause} WHERE id = ?`,
        params
      );

      const [rows] = await this.pool.query(
        `SELECT * FROM ?? WHERE id = ?`,
        [collection, id]
      );

      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error(`Document not found: ${id}`);
      }

      return rows[0];
    } catch (error) {
      console.error(`Failed to update document ${id} in ${collection}:`, error);
      throw error;
    }
  }

  async delete(collection: string, id: string): Promise<{ success: boolean }> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const [result] = await this.pool.query(
        `DELETE FROM ?? WHERE id = ?`,
        [collection, id]
      );

      if ((result as any).affectedRows === 0) {
        throw new Error(`Document not found: ${id}`);
      }

      return { success: true };
    } catch (error) {
      console.error(`Failed to delete document ${id} from ${collection}:`, error);
      throw error;
    }
  }
}
