import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST(request: NextRequest) {
  try {
    const { connectionString } = await request.json();

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Connection string is required' },
        { status: 400 }
      );
    }

    // Parse connection string and configure SSL
    let connectionConfig: any;
    
    // PostgreSQL providers often use sslmode parameter
    if (connectionString.includes('sslmode=require') || connectionString.includes('ssl=true')) {
      connectionConfig = {
        connectionString: connectionString,
        ssl: {
          rejectUnauthorized: false
        }
      };
    } else {
      connectionConfig = {
        connectionString: connectionString
      };
    }

    const client = new Client(connectionConfig);

    try {
      // Connect to database
      await client.connect();
      
      console.log('PostgreSQL connected successfully');

      // Get current database name
      const dbResult = await client.query('SELECT current_database()');
      const database = dbResult.rows[0].current_database;
      
      console.log('Database name:', database);

      // Get all tables from public schema
      const tablesResult = await client.query(`
        SELECT tablename 
        FROM pg_catalog.pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);

      console.log('Found tables:', tablesResult.rows);

      const tableNames = tablesResult.rows.map((row: any) => row.tablename);

      // Get schema for each table
      const schema: any = {};
      for (const tableName of tableNames) {
        const columnsResult = await client.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);

        // Get primary key info
        const pkResult = await client.query(`
          SELECT a.attname
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = $1::regclass AND i.indisprimary
        `, [`public.${tableName}`]);

        const primaryKeys = pkResult.rows.map((row: any) => row.attname);

        schema[tableName] = columnsResult.rows.map((col: any) => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          primaryKey: primaryKeys.includes(col.column_name),
        }));
      }

      await client.end();

      console.log('Returning response:', { tableCount: tableNames.length, tables: tableNames });

      return NextResponse.json({
        success: true,
        message: 'Connected successfully',
        tables: tableNames,
        schema,
      });
    } catch (error: any) {
      await client.end();
      throw error;
    }
  } catch (error: any) {
    console.error('PostgreSQL connection error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        error: error.message || 'Failed to connect to PostgreSQL database',
        details: error.code || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
