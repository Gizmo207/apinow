import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(request: NextRequest) {
  try {
    const { connectionString } = await request.json();

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Connection string is required' },
        { status: 400 }
      );
    }

    // Parse connection string and handle SSL
    let connectionConfig: any;
    
    if (connectionString.includes('ssl-mode=REQUIRED')) {
      // Aiven format - parse and configure SSL properly
      const cleanUrl = connectionString.replace('?ssl-mode=REQUIRED', '');
      
      // Parse the connection string manually
      const urlMatch = cleanUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
      
      if (urlMatch) {
        connectionConfig = {
          host: urlMatch[3],
          port: parseInt(urlMatch[4]),
          user: urlMatch[1],
          password: urlMatch[2],
          database: urlMatch[5],
          ssl: {
            rejectUnauthorized: false // Aiven uses self-signed certs
          }
        };
      } else {
        connectionConfig = cleanUrl;
      }
    } else {
      connectionConfig = connectionString;
    }

    // Create connection
    const connection = await mysql.createConnection(connectionConfig);

    try {
      // Test connection
      await connection.ping();

      // Get database name from connection config
      const database = typeof connectionConfig === 'object' ? connectionConfig.database : '';
      
      console.log('Database name:', database);
      
      // First, let's see ALL databases
      const [allDbs] = await connection.query('SHOW DATABASES');
      console.log('All databases:', allDbs);
      
      // Check what database we're currently using
      const [currentDb] = await connection.query('SELECT DATABASE() as db');
      console.log('Current database:', currentDb);

      // Get all tables from current database
      const [tables] = await connection.query('SHOW TABLES');
      
      console.log('Found tables:', tables);
      console.log('Tables count:', (tables as any[]).length);

      // SHOW TABLES returns format like: { 'Tables_in_defaultdb': 'users' }
      const tableNames = (tables as any[]).map((row: any) => {
        const key = Object.keys(row)[0];
        return row[key];
      });
      
      console.log('Table names:', tableNames);

      // Get schema for each table
      const schema: any = {};
      for (const tableName of tableNames) {
        const [columns] = await connection.query(
          'SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
          [database, tableName]
        );

        schema[tableName] = (columns as any[]).map((col: any) => ({
          name: col.COLUMN_NAME,
          type: col.DATA_TYPE,
          nullable: col.IS_NULLABLE === 'YES',
          primaryKey: col.COLUMN_KEY === 'PRI',
        }));
      }

      await connection.end();

      console.log('Returning response:', { tableCount: tableNames.length, tables: tableNames });

      return NextResponse.json({
        success: true,
        message: 'Connected successfully',
        tables: tableNames,
        schema,
      });
    } catch (error: any) {
      await connection.end();
      throw error;
    }
  } catch (error: any) {
    console.error('MySQL connection error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect to MySQL database' },
      { status: 500 }
    );
  }
}
