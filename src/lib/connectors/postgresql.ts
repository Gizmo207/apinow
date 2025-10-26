import { Pool, PoolClient } from 'pg';
import { DatabaseAdapter, DatabaseConnection, DatabaseTable, CrudResult } from './types';

export class PostgreSQLAdapter implements DatabaseAdapter {
  private connection: DatabaseConnection;
  private pool: Pool | null = null;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  async connect(): Promise<void> {
    try {
      this.pool = new Pool({
        host: this.connection.host,
        port: parseInt(this.connection.port || '5432'),
        database: this.connection.database,
        user: this.connection.username,
        password: this.connection.password,
        ssl: this.connection.ssl ? { rejectUnauthorized: false } : undefined,
        max: 10, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      console.log(`✅ Connected to PostgreSQL database: ${this.connection.name}`);
    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL:', error);
      throw new Error(`PostgreSQL connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      // await this.client.end();
      this.client = null;
    }
  }

  async getTables(): Promise<DatabaseTable[]> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    try {
      // In a real implementation:
      // const result = await this.client.query(`
      //   SELECT 
      //     table_name,
      //     table_schema,
      //     table_type
      //   FROM information_schema.tables 
      //   WHERE table_schema = 'public'
      //   ORDER BY table_name
      // `);

      // For now, return example tables
      return [
        {
          id: 'users',
          name: 'users',
          type: 'table',
          columns: [
            { name: 'id', type: 'SERIAL', nullable: false, primaryKey: true },
            { name: 'email', type: 'VARCHAR(255)', nullable: false },
            { name: 'name', type: 'VARCHAR(100)', nullable: true },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false },
            { name: 'updated_at', type: 'TIMESTAMP', nullable: true }
          ],
          recordCount: 0
        },
        {
          id: 'posts',
          name: 'posts',
          type: 'table',
          columns: [
            { name: 'id', type: 'SERIAL', nullable: false, primaryKey: true },
            { name: 'user_id', type: 'INTEGER', nullable: false },
            { name: 'title', type: 'VARCHAR(255)', nullable: false },
            { name: 'content', type: 'TEXT', nullable: true },
            { name: 'published', type: 'BOOLEAN', nullable: false },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false }
          ],
          recordCount: 0
        }
      ];
    } catch (error) {
      console.error('Failed to get PostgreSQL tables:', error);
      throw error;
    }
  }

  async getTableData(tableName: string, params?: any): Promise<any[]> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    try {
      const limit = params?.limit || 100;
      const offset = params?.offset || 0;
      const orderBy = params?.orderBy || 'id';
      const order = params?.order || 'ASC';

      // In a real implementation:
      // const query = `
      //   SELECT * FROM ${tableName} 
      //   ORDER BY ${orderBy} ${order}
      //   LIMIT $1 OFFSET $2
      // `;
      // const result = await this.client.query(query, [limit, offset]);
      // return result.rows;

      // For now, return example data
      if (tableName === 'users') {
        return [
          {
            id: 1,
            email: 'john@example.com',
            name: 'John Doe',
            created_at: '2024-01-15T10:30:00Z',
            updated_at: '2024-01-15T10:30:00Z'
          },
          {
            id: 2,
            email: 'jane@example.com',
            name: 'Jane Smith',
            created_at: '2024-01-16T14:20:00Z',
            updated_at: '2024-01-16T14:20:00Z'
          }
        ];
      } else if (tableName === 'posts') {
        return [
          {
            id: 1,
            user_id: 1,
            title: 'Getting Started with PostgreSQL',
            content: 'PostgreSQL is a powerful, open source object-relational database system...',
            published: true,
            created_at: '2024-01-17T09:00:00Z'
          },
          {
            id: 2,
            user_id: 2,
            title: 'Advanced SQL Queries',
            content: 'Learn how to write complex SQL queries for data analysis...',
            published: false,
            created_at: '2024-01-18T11:30:00Z'
          }
        ];
      }

      return [];
    } catch (error) {
      console.error(`Failed to get data from ${tableName}:`, error);
      throw error;
    }
  }

  async create(tableName: string, data: any): Promise<CrudResult> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

      // In a real implementation:
      // const query = `
      //   INSERT INTO ${tableName} (${columns.join(', ')})
      //   VALUES (${placeholders})
      //   RETURNING *
      // `;
      // const result = await this.client.query(query, values);
      // return {
      //   success: true,
      //   data: result.rows[0],
      //   id: result.rows[0].id
      // };

      // For now, return mock success
      return {
        success: true,
        data: { id: Date.now(), ...data },
        id: Date.now().toString()
      };
    } catch (error) {
      console.error(`Failed to create record in ${tableName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async read(tableName: string, id: string): Promise<CrudResult> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    try {
      // In a real implementation:
      // const query = `SELECT * FROM ${tableName} WHERE id = $1`;
      // const result = await this.client.query(query, [id]);
      // 
      // if (result.rows.length === 0) {
      //   return {
      //     success: false,
      //     error: 'Record not found'
      //   };
      // }
      // 
      // return {
      //   success: true,
      //   data: result.rows[0]
      // };

      // For now, return mock data
      const mockData = await this.getTableData(tableName);
      const record = mockData.find(r => r.id.toString() === id);
      
      if (!record) {
        return {
          success: false,
          error: 'Record not found'
        };
      }

      return {
        success: true,
        data: record
      };
    } catch (error) {
      console.error(`Failed to read record ${id} from ${tableName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async update(tableName: string, id: string, data: any): Promise<CrudResult> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');

      // In a real implementation:
      // const query = `
      //   UPDATE ${tableName} 
      //   SET ${setClause}
      //   WHERE id = $${values.length + 1}
      //   RETURNING *
      // `;
      // const result = await this.client.query(query, [...values, id]);
      // 
      // if (result.rows.length === 0) {
      //   return {
      //     success: false,
      //     error: 'Record not found'
      //   };
      // }
      // 
      // return {
      //   success: true,
      //   data: result.rows[0]
      // };

      // For now, return mock success
      return {
        success: true,
        data: { id, ...data, updated_at: new Date().toISOString() }
      };
    } catch (error) {
      console.error(`Failed to update record ${id} in ${tableName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async delete(tableName: string, id: string): Promise<CrudResult> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    try {
      // In a real implementation:
      // const query = `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`;
      // const result = await this.client.query(query, [id]);
      // 
      // if (result.rows.length === 0) {
      //   return {
      //     success: false,
      //     error: 'Record not found'
      //   };
      // }
      // 
      // return {
      //   success: true,
      //   data: result.rows[0]
      // };

      // For now, return mock success
      return {
        success: true,
        data: { id, deleted: true }
      };
    } catch (error) {
      console.error(`Failed to delete record ${id} from ${tableName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getConnectionInfo(): DatabaseConnection {
    return this.connection;
  }
}
