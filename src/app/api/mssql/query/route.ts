import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getConnectionConfig } from '@/lib/getConnectionConfig';
import { getCurrentUserId } from '@/lib/auth-server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const connectionId = body?.connectionId as string | undefined;
    const connectionString = body?.connectionString as string | undefined;
    const query = body?.query as string;

    if (!connectionId && !connectionString) {
      return NextResponse.json(
        { error: 'Missing connectionId or connectionString' },
        { status: 400 }
      );
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    console.log('[MSSQL Query] Executing query...');

    let finalConnectionString = connectionString;

    // If connectionId provided, fetch connection string securely
    if (connectionId) {
      const cfg = await getConnectionConfig(connectionId);
      if (!cfg) return NextResponse.json({ error: 'Invalid connectionId' }, { status: 404 });
      const requesterId = getCurrentUserId(request);
      if (cfg.ownerId && requesterId && cfg.ownerId !== requesterId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      finalConnectionString = cfg.connectionString;
    }

    if (!finalConnectionString) {
      return NextResponse.json(
        { error: 'Connection string is required' },
        { status: 400 }
      );
    }

    // Parse connection string into config object
    const config: any = {};
    const parts = finalConnectionString.split(';');
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key && value) {
        const k = key.trim().toLowerCase();
        const v = value.trim();
        
        if (k === 'server') {
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

    // Add connection timeout and retry settings
    config.options = {
      encrypt: config.encrypt !== false,
      trustServerCertificate: config.trustServerCertificate || false,
      enableArithAbort: true,
    };
    config.connectionTimeout = 30000;
    config.requestTimeout = 30000;

    // Create connection pool
    const pool = await sql.connect(config);

    // Execute query
    const result = await pool.request().query(query);

    // Close connection
    await pool.close();

    console.log('[MSSQL Query] Query executed successfully, returned', result.recordset.length, 'rows');

    return NextResponse.json({
      success: true,
      rows: result.recordset,
      rowCount: result.rowsAffected[0] || result.recordset.length,
    });
  } catch (error: any) {
    console.error('[MSSQL Query] Error:', error.message);
    return NextResponse.json(
      {
        error: 'Failed to execute SQL Server query',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
