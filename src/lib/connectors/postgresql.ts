import { Pool } from 'pg';
import {
  DatabaseAdapter,
  DatabaseConnection,
  DatabaseTable,
  CrudResult,
} from './types';

export class PostgreSQLAdapter implements DatabaseAdapter {
  type = 'postgresql';
  private connection: DatabaseConnection;
  private pool: Pool | null = null;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  async connect(): Promise<void> {
    if (this.pool) return;
    this.pool = new Pool({
      host: this.connection.host,
      port: parseInt(this.connection.port || '5432'),
      database: this.connection.database,
      user: this.connection.username,
      password: this.connection.password,
      ssl: this.connection.ssl ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    await this.pool.query('SELECT 1');
    console.log(`✅ Connected to PostgreSQL database: ${this.connection.name}`);
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('🔌 PostgreSQL connection closed');
    }
  }

  // ✅ REQUIRED by DatabaseAdapter
  async listCollections(): Promise<string[]> {
    if (!this.pool) await this.connect();
    const result = await (this.pool as Pool).query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    return result.rows.map((r) => r.table_name);
  }

  // ✅ REQUIRED by DatabaseAdapter
  async listDocuments(tableName: string): Promise<any[]> {
    if (!this.pool) await this.connect();
    const result = await (this.pool as Pool).query(
      `SELECT * FROM "${tableName}" LIMIT 100;` 
    );
    return result.rows;
  }

  async create(tableName: string, id: string | undefined, data: any): Promise<any> {
    if (!this.pool) await this.connect();
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO "${tableName}" (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *;
    `;
    const result = await (this.pool as Pool).query(query, values);
    return result.rows[0];
  }

  async read(tableName: string, id: string): Promise<any> {
    if (!this.pool) await this.connect();
    const result = await (this.pool as Pool).query(
      `SELECT * FROM "${tableName}" WHERE id = $1;`,
      [id]
    );
    return result.rows[0];
  }

  async update(tableName: string, id: string, data: any): Promise<any> {
    if (!this.pool) await this.connect();
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

    const query = `
      UPDATE "${tableName}"
      SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING *;
    `;
    const result = await (this.pool as Pool).query(query, [...values, id]);
    return result.rows[0];
  }

  async delete(tableName: string, id: string): Promise<{ success: boolean }> {
    if (!this.pool) await this.connect();
    await (this.pool as Pool).query(`DELETE FROM "${tableName}" WHERE id = $1;`, [id]);
    return { success: true };
  }

  getConnectionInfo(): DatabaseConnection {
    return this.connection;
  }
}
