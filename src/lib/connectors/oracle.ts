import { DatabaseAdapter } from './types';

// Dynamic import to avoid bundling for client
let oracledb: any;

export class OracleAdapter implements DatabaseAdapter {
  type = 'oracle';
  private pool: any = null;
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // Only import oracledb on server side
    if (typeof window === 'undefined' && !oracledb) {
      oracledb = await import('oracledb');
      // Oracle Instant Client configuration (if needed)
      // oracledb.initOracleClient({ libDir: '/path/to/instantclient' });
    }

    if (!oracledb) {
      throw new Error('Oracle can only be used on the server side');
    }

    try {
      this.pool = await oracledb.createPool({
        user: this.config.username,
        password: this.config.password,
        connectString: this.config.connectString || 
                       `${this.config.host}:${this.config.port || '1521'}/${this.config.database}`,
        poolMin: 2,
        poolMax: 10,
        poolIncrement: 1,
      });
      
      // Test connection
      const connection = await this.pool.getConnection();
      await connection.close();
      
      console.log(`✅ Connected to Oracle Database: ${this.config.database}`);
    } catch (error) {
      console.error('❌ Oracle connection failed:', error);
      throw new Error(`Oracle connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close(0);
      this.pool = null;
      console.log('✅ Disconnected from Oracle');
    }
  }

  async listCollections(): Promise<string[]> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const connection = await this.pool.getConnection();
      
      const result = await connection.execute(
        `SELECT table_name FROM user_tables ORDER BY table_name`
      );
      
      await connection.close();
      
      return result.rows?.map((row: any) => row[0]) || [];
    } catch (error) {
      console.error('Failed to list tables:', error);
      throw error;
    }
  }

  async listDocuments(collection: string, limit: number = 100): Promise<any[]> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const connection = await this.pool.getConnection();
      
      const result = await connection.execute(
        `SELECT * FROM ${collection} WHERE ROWNUM <= :limit`,
        { limit },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      await connection.close();
      
      return result.rows || [];
    } catch (error) {
      console.error(`Failed to list documents from ${collection}:`, error);
      throw error;
    }
  }

  async create(collection: string, id: string | undefined, data: any): Promise<any> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const connection = await this.pool.getConnection();
      
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map((_, i) => `:${i + 1}`).join(', ');
      
      const bindParams: any = {};
      values.forEach((val, i) => {
        bindParams[i + 1] = val;
      });
      
      const sql = `
        INSERT INTO ${collection} (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING id INTO :id
      `;
      
      bindParams.id = { dir: oracledb.BIND_OUT, type: oracledb.STRING };
      
      const result = await connection.execute(sql, bindParams, { autoCommit: true });
      
      await connection.close();
      
      const insertedId = result.outBinds?.id || id;
      return { id: insertedId, ...data };
    } catch (error) {
      console.error(`Failed to create document in ${collection}:`, error);
      throw error;
    }
  }

  async read(collection: string, id: string): Promise<any> {
    if (!this.pool) throw new Error('Not connected to database');

    try {
      const connection = await this.pool.getConnection();
      
      const result = await connection.execute(
        `SELECT * FROM ${collection} WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      await connection.close();
      
      if (!result.rows || result.rows.length === 0) {
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
      const connection = await this.pool.getConnection();
      
      const columns = Object.keys(data);
      const values = Object.values(data);
      const setClause = columns.map((col, i) => `${col} = :${i + 1}`).join(', ');
      
      const bindParams: any = {};
      values.forEach((val, i) => {
        bindParams[i + 1] = val;
      });
      bindParams.id = id;
      
      await connection.execute(
        `UPDATE ${collection} SET ${setClause} WHERE id = :id`,
        bindParams,
        { autoCommit: true }
      );
      
      // Read back the updated record
      const result = await connection.execute(
        `SELECT * FROM ${collection} WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      await connection.close();
      
      if (!result.rows || result.rows.length === 0) {
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
      const connection = await this.pool.getConnection();
      
      const result = await connection.execute(
        `DELETE FROM ${collection} WHERE id = :id`,
        { id },
        { autoCommit: true }
      );
      
      await connection.close();
      
      if (result.rowsAffected === 0) {
        throw new Error(`Document not found: ${id}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete document ${id} from ${collection}:`, error);
      throw error;
    }
  }
}
