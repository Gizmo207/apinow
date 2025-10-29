import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { connectionString } = await request.json();

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Connection string is required' },
        { status: 400 }
      );
    }

    console.log('[MSSQL Connect] Attempting connection...');

    // Parse connection string into config object
    const config: any = {};
    const parts = connectionString.split(';');
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key && value) {
        const k = key.trim().toLowerCase();
        const v = value.trim();
        
        if (k === 'server') {
          // Handle Server=tcp:hostname,port or Server=hostname,port
          const serverPart = v.replace('tcp:', '');
          const [host, port] = serverPart.split(',');
          config.server = host;
          config.port = port ? parseInt(port) : 1433;
        } else if (k === 'database') {
          config.database = v;
        } else if (k === 'user id' || k === 'uid') {
          config.user = v;
        } else if (k === 'password' || k === 'pwd') {
          config.password = v;
        } else if (k === 'encrypt') {
          config.encrypt = v.toLowerCase() === 'true';
        } else if (k === 'trustservercertificate') {
          config.trustServerCertificate = v.toLowerCase() === 'true';
        }
      }
    }

    console.log('[MSSQL Connect] Config:', { ...config, password: '***' });

    // Create connection pool
    const pool = await sql.connect(config);

    console.log('[MSSQL Connect] Connected successfully');

    // Get list of tables
    const result = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    const tables = result.recordset.map((row: any) => row.TABLE_NAME);

    console.log('[MSSQL Connect] Found tables:', tables);

    // Get schema for each table
    const schema: Record<string, any[]> = {};

    for (const tableName of tables) {
      const columnsResult = await pool.request().query(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT,
          CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tableName}'
        ORDER BY ORDINAL_POSITION
      `);

      schema[tableName] = columnsResult.recordset.map((col: any) => ({
        name: col.COLUMN_NAME,
        type: col.DATA_TYPE,
        nullable: col.IS_NULLABLE === 'YES',
        maxLength: col.CHARACTER_MAXIMUM_LENGTH,
        default: col.COLUMN_DEFAULT
      }));
    }

    // Close connection
    await pool.close();

    console.log('[MSSQL Connect] Connection closed successfully');

    return NextResponse.json({
      success: true,
      tables,
      schema,
    });
  } catch (error: any) {
    console.error('[MSSQL Connect] Error:', error.message);
    return NextResponse.json(
      {
        error: 'Failed to connect to SQL Server',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
