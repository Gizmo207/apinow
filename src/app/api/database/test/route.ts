import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Universal database health check and test connection route
 * Tests connection to any database engine and returns detailed diagnostics
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { engine, connectionString, providerKey } = await request.json();

    if (!engine) {
      return NextResponse.json(
        { status: 'error', error: 'Database engine is required' },
        { status: 400 }
      );
    }

    if (!connectionString && engine !== 'sqlite') {
      return NextResponse.json(
        { status: 'error', error: 'Connection string is required' },
        { status: 400 }
      );
    }

    console.log(`[DB Test] Testing ${engine} connection...`);

    let testResult: any = { status: 'unknown', details: {} };

    // Route to appropriate engine test
    switch (engine) {
      case 'sqlite':
        testResult = await testSQLite();
        break;
      
      case 'mysql':
      case 'mariadb':
        testResult = await testMySQL(connectionString);
        break;
      
      case 'postgresql':
        testResult = await testPostgreSQL(connectionString);
        break;
      
      case 'mongodb':
        testResult = await testMongoDB(connectionString);
        break;
      
      case 'mssql':
        testResult = await testMSSQL(connectionString);
        break;
      
      default:
        return NextResponse.json(
          { status: 'error', error: `Unsupported engine: ${engine}` },
          { status: 400 }
        );
    }

    const latency = Date.now() - startTime;

    return NextResponse.json({
      status: testResult.status,
      engine,
      providerKey,
      latency: `${latency}ms`,
      timestamp: new Date().toISOString(),
      ...testResult,
    });
  } catch (error: any) {
    const latency = Date.now() - startTime;
    
    console.error('[DB Test] Error:', error.message);
    
    return NextResponse.json({
      status: 'error',
      error: error.message,
      errorType: classifyError(error),
      latency: `${latency}ms`,
      timestamp: new Date().toISOString(),
      suggestions: getSuggestions(error),
    }, { status: 500 });
  }
}

// SQLite test (browser-based)
async function testSQLite() {
  return {
    status: 'ok',
    message: 'SQLite runs in browser - no server-side test needed',
    details: {
      location: 'Browser IndexedDB',
      support: 'File upload and query in browser',
    }
  };
}

// MySQL/MariaDB test
async function testMySQL(connectionString: string) {
  const mysql = require('mysql2/promise');
  
  let connection;
  try {
    const config = connectionString.includes('ssl-mode=REQUIRED') || connectionString.includes('aivencloud.com')
      ? { uri: connectionString, ssl: { rejectUnauthorized: false } }
      : connectionString;
    
    connection = await mysql.createConnection(config);
    const [result] = await connection.execute('SELECT 1 as test');
    await connection.end();
    
    return {
      status: 'ok',
      message: 'Connection successful',
      details: {
        query: 'SELECT 1',
        result: result[0],
      }
    };
  } catch (error: any) {
    if (connection) await connection.end().catch(() => {});
    throw error;
  }
}

// PostgreSQL test
async function testPostgreSQL(connectionString: string) {
  const { Client } = require('pg');
  
  const config = connectionString.includes('sslmode=require') || connectionString.includes('ssl=true')
    ? { connectionString, ssl: { rejectUnauthorized: false } }
    : { connectionString };
  
  const client = new Client(config);
  
  try {
    await client.connect();
    const result = await client.query('SELECT 1 as test');
    await client.end();
    
    return {
      status: 'ok',
      message: 'Connection successful',
      details: {
        query: 'SELECT 1',
        result: result.rows[0],
      }
    };
  } catch (error) {
    await client.end().catch(() => {});
    throw error;
  }
}

// MongoDB test
async function testMongoDB(connectionString: string) {
  const { MongoClient } = require('mongodb');
  
  const client = new MongoClient(connectionString, {
    serverSelectionTimeoutMS: 5000,
  });
  
  try {
    await client.connect();
    await client.db().admin().ping();
    const dbName = client.db().databaseName;
    await client.close();
    
    return {
      status: 'ok',
      message: 'Connection successful',
      details: {
        database: dbName,
        command: 'ping',
      }
    };
  } catch (error) {
    await client.close().catch(() => {});
    throw error;
  }
}

// MSSQL test
async function testMSSQL(connectionString: string) {
  const sql = require('mssql');
  
  const config: any = {};
  const parts = connectionString.split(';');
  
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
      } else if (k === 'database') config.database = v;
      else if (k === 'user id' || k === 'uid') config.user = v;
      else if (k === 'password' || k === 'pwd') config.password = v;
      else if (k === 'encrypt') config.encrypt = v.toLowerCase() === 'true';
      else if (k === 'trustservercertificate') config.trustServerCertificate = v.toLowerCase() === 'true';
    }
  }
  
  const pool = await sql.connect(config);
  const result = await pool.request().query('SELECT 1 as test');
  await pool.close();
  
  return {
    status: 'ok',
    message: 'Connection successful',
    details: {
      query: 'SELECT 1',
      result: result.recordset[0],
    }
  };
}


// Classify error type for better debugging
function classifyError(error: any): string {
  const msg = error.message.toLowerCase();
  
  if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
  if (msg.includes('enotfound') || msg.includes('getaddrinfo')) return 'dns_error';
  if (msg.includes('econnrefused')) return 'connection_refused';
  if (msg.includes('authentication') || msg.includes('auth') || msg.includes('password')) return 'auth_error';
  if (msg.includes('ssl') || msg.includes('tls') || msg.includes('certificate')) return 'ssl_error';
  if (msg.includes('database') && msg.includes('not') && msg.includes('exist')) return 'database_not_found';
  if (msg.includes('access denied')) return 'permission_denied';
  
  return 'unknown_error';
}

// Provide helpful suggestions based on error
function getSuggestions(error: any): string[] {
  const errorType = classifyError(error);
  
  const suggestions: Record<string, string[]> = {
    timeout: [
      'Check if the database server is running',
      'Verify firewall rules allow connections',
      'Confirm the host/port are correct',
      'Try increasing connection timeout',
    ],
    dns_error: [
      'Verify the hostname is correct',
      'Check your internet connection',
      'Ensure DNS is resolving properly',
    ],
    connection_refused: [
      'Database server may be down',
      'Check if the port is correct (MySQL: 3306, PostgreSQL: 5432, MongoDB: 27017, MSSQL: 1433)',
      'Verify firewall allows inbound connections',
    ],
    auth_error: [
      'Double-check username and password',
      'Verify user has correct permissions',
      'Check if password contains special characters that need escaping',
    ],
    ssl_error: [
      'Try adding ?ssl=true or ?sslmode=require to connection string',
      'For development, you may need to disable SSL verification',
      'Verify SSL certificates are valid',
    ],
    database_not_found: [
      'Check database name spelling',
      'Verify the database exists on the server',
      'You may need to create the database first',
    ],
    permission_denied: [
      'User may not have access to this database',
      'Check user permissions on the database server',
      'Verify IP whitelist includes your server',
    ],
    unknown_error: [
      'Check connection string format',
      'Verify all credentials are correct',
      'Review server logs for more details',
    ],
  };
  
  return suggestions[errorType] || suggestions.unknown_error;
}
