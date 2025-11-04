import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import { Client } from 'pg';
import { readdirSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper to find the most recent database file
function getLatestDbFile(): string | null {
  const uploadsDir = join(process.cwd(), 'uploads');
  
  if (!existsSync(uploadsDir)) {
    return null;
  }
  
  const files = readdirSync(uploadsDir)
    .filter(f => f.endsWith('.db') || f.endsWith('.sqlite') || f.endsWith('.sqlite3'))
    .sort();
  
  if (files.length === 0) {
    return null;
  }
  
  return join(uploadsDir, files[files.length - 1]);
}

// Helper to get database info for a table
function getDatabaseForTable(table: string): any | null {
  if (typeof window === 'undefined') {
    // Server-side - can't access localStorage
    // We'll need to pass database info via headers
    return null;
  }
  
  const saved = localStorage.getItem('saved_endpoints');
  if (!saved) return null;
  
  const endpoints = JSON.parse(saved);
  const endpoint = endpoints.find((ep: any) => ep.table === table);
  return endpoint ? endpoint.database : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  let tempFilePath: string | null = null;

  try {
    const { table } = await params;

    // Basic table validation to avoid SQL injection via identifier
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    // Resolve database from headers
    const dbType = (request.headers.get('x-db-type') || '').toLowerCase();
    const connectionString = request.headers.get('x-db-connection'); // legacy fallback
    const dbFile = request.headers.get('x-db-file'); // legacy sqlite fallback
    const connectionId = request.headers.get('x-connection-id'); // secure model
    const requesterId = request.headers.get('x-user-id') || request.headers.get('x-user') || undefined;

    // Optional limit on GET
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '100', 10) || 100, 1), 1000);

    console.log('[API /data GET] Table:', table, 'Type:', dbType || '(none)');

    // New secure model for Postgres/MySQL/MariaDB/MongoDB/MSSQL/GoogleSheets using connectionId
    if (connectionId && (dbType === 'postgresql' || dbType === 'mysql' || dbType === 'mariadb' || dbType === 'mongodb' || dbType === 'mssql' || dbType === 'googlesheets')) {
      // Resolve credentials server-side
      const { getConnectionConfig } = await import('@/lib/getConnectionConfig');
      const cfg = await getConnectionConfig(connectionId);
      if (!cfg) return NextResponse.json({ error: 'Invalid connectionId' }, { status: 404 });
      // Enforce ownership when present
      if (cfg.ownerId && requesterId && cfg.ownerId !== requesterId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (dbType === 'mssql') {
        // MSSQL using connection string from config
        const sql = require('mssql');
        if (!cfg.connectionString) {
          return NextResponse.json({ error: 'MSSQL connection string not found' }, { status: 500 });
        }
        const config: any = {};
        const parts = cfg.connectionString.split(';');
        
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
        
        try {
          const pool = await sql.connect(config);
          const result = await pool.request().query(`SELECT TOP ${limit} * FROM ${table}`);
          await pool.close();
          return NextResponse.json({ data: result.recordset, count: result.recordset.length });
        } catch (err: any) {
          console.error('[API /data GET][mssql] error:', err?.message || err);
          return NextResponse.json({ error: 'Query error', details: err.message }, { status: 500 });
        }
      }

      if (dbType === 'googlesheets') {
        // Google Sheets: Call the googlesheets query API
        try {
          const { getSheetData, sheetDataToJSON } = await import('@/lib/googleSheets');
          const sheetId = cfg.connectionString; // connectionString holds the sheet ID
          if (!sheetId) {
            return NextResponse.json({ error: 'Sheet ID not found' }, { status: 500 });
          }
          
          const rawData = await getSheetData(sheetId, table);
          if (!rawData || rawData.length === 0) {
            return NextResponse.json({ data: [], count: 0 });
          }
          
          const jsonData = sheetDataToJSON(rawData);
          const limitedData = jsonData.slice(0, limit);
          return NextResponse.json({ data: limitedData, count: limitedData.length });
        } catch (err: any) {
          console.error('[API /data GET][googlesheets] error:', err?.message || err);
          return NextResponse.json({ error: 'Query error', details: err.message }, { status: 500 });
        }
      }

      if (dbType === 'mongodb') {
        // MongoDB using connectionString from config
        const { MongoClient } = require('mongodb');
        const client = new MongoClient(cfg.connectionString);
        try {
          await client.connect();
          const db = client.db();
          const collection = db.collection(table);
          const data = await collection.find({}).limit(limit).toArray();
          await client.close();
          return NextResponse.json({ data, count: data.length });
        } catch (err: any) {
          try { await client.close(); } catch {}
          console.error('[API /data GET][mongodb] error:', err?.message || err);
          return NextResponse.json({ error: 'Query error', details: err.message }, { status: 500 });
        }
      }

      if (dbType === 'postgresql') {
        // Use pg Client with SSL support
        const client = new Client({
          host: cfg.host,
          port: cfg.port,
          user: cfg.user,
          password: cfg.password,
          database: cfg.database,
          ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
        } as any);
        
        // Add error handler to prevent uncaught exceptions
        client.on('error', (err) => {
          console.error('[pg client error event]:', err?.message || err);
        });
        
        try {
          await client.connect();
          const result = await client.query(`SELECT * FROM ${table} LIMIT $1`, [limit]);
          await client.end();
          return NextResponse.json({ data: result.rows, count: result.rowCount ?? result.rows.length });
        } catch (err: any) {
          try { await client.end(); } catch {}
          if (err?.code === '28P01') {
            return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
          }
          if (err?.code === 'XX000') {
            const res = NextResponse.json({ error: 'Database temporarily unavailable' }, { status: 503 });
            res.headers.set('Retry-After', '2');
            return res;
          }
          console.error('[API /data GET][pg] error:', err?.message || err);
          return NextResponse.json({ error: 'Query error' }, { status: 500 });
        }
      }

      // MySQL/MariaDB
      const connection = await mysql.createConnection({
        host: cfg.host,
        port: (cfg as any).port || 3306,
        user: cfg.user,
        password: cfg.password,
        database: (cfg as any).database,
        ssl: (cfg as any).ssl ? { rejectUnauthorized: false } : undefined,
      } as any);
      try {
        const [results] = await connection.query(`SELECT * FROM \`${table}\` LIMIT ?`, [limit]);
        await connection.end();
        const rows = results as any[];
        return NextResponse.json({ data: rows, count: rows.length });
      } catch (err: any) {
        await connection.end();
        if (err?.code === 'ER_ACCESS_DENIED_ERROR') {
          return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
        }
        console.error('[API /data GET][mysql] error:', err?.message || err);
        return NextResponse.json({ error: 'Query error' }, { status: 500 });
      }
    }

    // Legacy modes below (kept for compatibility)
    if (!dbType) {
      return NextResponse.json({
        error: 'Database type not specified',
        details: 'Please specify x-db-type header (and prefer x-connection-id + x-user-id for secure access)'
      }, { status: 400 });
    }

    let rows: any[] = [];

    if (dbType === 'sqlite') {
      let dbPath: string;

      if (dbFile) {
        // Browser-stored database: decode base64 and write to temp file
        const buffer = Buffer.from(dbFile, 'base64');
        tempFilePath = join(tmpdir(), `temp_${Date.now()}.db`);
        writeFileSync(tempFilePath, buffer);
        dbPath = tempFilePath;
      } else {
        // Fallback: try to find uploaded file (localhost only)
        const latestFile = getLatestDbFile();
        if (!latestFile) {
          return NextResponse.json({
            error: 'No database found',
            details: 'Please provide database file in x-db-file header'
          }, { status: 400 });
        }
        dbPath = latestFile;
      }

      const db = new Database(dbPath, { readonly: true });
      rows = db.prepare(`SELECT * FROM ${table} LIMIT ${limit}`).all();
      db.close();

      // Clean up temp file
      if (tempFilePath) {
        try { unlinkSync(tempFilePath); } catch {}
        tempFilePath = null;
      }
    }
    else if (dbType === 'mysql' || dbType === 'mariadb') {
      if (!connectionString) {
        return NextResponse.json({ error: 'Connection string required' }, { status: 400 });
      }
      // MariaDB uses MySQL protocol; try connection string directly
      const connection = await mysql.createConnection(connectionString);
      const [results] = await connection.query(`SELECT * FROM \`${table}\` LIMIT ?`, [limit]);
      rows = results as any[];
      await connection.end();
    }
    else if (dbType === 'postgresql') {
      if (!connectionString) {
        return NextResponse.json({ error: 'Connection string required' }, { status: 400 });
      }

      const needsSsl = connectionString.includes('sslmode=require') || connectionString.includes('ssl=true') || connectionString.includes('pooler.supabase.com');
      const client = new Client(needsSsl ? { connectionString, ssl: { rejectUnauthorized: false } } : { connectionString });
      await client.connect();
      const result = await client.query(`SELECT * FROM ${table} LIMIT $1`, [limit]);
      rows = result.rows;
      await client.end();
    }
    else if (dbType === 'mongodb') {
      if (!connectionString) {
        return NextResponse.json({ error: 'Connection string required' }, { status: 400 });
      }

      const { MongoClient } = require('mongodb');
      const client = new MongoClient(connectionString);
      await client.connect();
      const db = client.db();
      const collection = db.collection(table);
      rows = await collection.find({}).limit(limit).toArray();
      await client.close();
    }
    else {
      return NextResponse.json({
        error: 'Unsupported database type',
        details: `Database type '${dbType}' is not supported`
      }, { status: 400 });
    }

    return NextResponse.json({ data: rows, count: rows.length });
  } catch (error: any) {
    console.error('[API /data GET] Error:', error?.message || error);

    // Clean up temp file on error
    if (tempFilePath) {
      try { unlinkSync(tempFilePath); } catch {}
    }

    return NextResponse.json({
      error: 'Database error',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;

    // Basic table validation
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    // Parse JSON body safely
    let body: any = undefined;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.toLowerCase().includes('application/json')) {
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Malformed JSON body' }, { status: 400 });
      }
    } else {
      // If no JSON provided, treat as empty object
      try {
        body = await request.json();
      } catch {
        body = undefined;
      }
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Expected a JSON object body' }, { status: 400 });
    }

    // Headers for secure model
    const dbType = (request.headers.get('x-db-type') || '').toLowerCase();
    const connectionId = request.headers.get('x-connection-id');
    const requesterId = request.headers.get('x-user-id') || request.headers.get('x-user') || undefined;

    // If connectionId + supported engine are present, use server-side credentials
    if (connectionId && (dbType === 'postgresql' || dbType === 'mysql' || dbType === 'mariadb' || dbType === 'mongodb' || dbType === 'mssql' || dbType === 'googlesheets')) {
      const { getConnectionConfig } = await import('@/lib/getConnectionConfig');
      const cfg = await getConnectionConfig(connectionId);
      if (!cfg) return NextResponse.json({ error: 'Invalid connectionId' }, { status: 404 });
      
      if (cfg.ownerId && requesterId && cfg.ownerId !== requesterId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (dbType === 'mssql') {
        const sql = require('mssql');
        if (!cfg.connectionString) {
          return NextResponse.json({ error: 'MSSQL connection string not found' }, { status: 500 });
        }
        const config: any = {};
        const parts = cfg.connectionString.split(';');
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
        
        try {
          const pool = await sql.connect(config);
          // Filter out 'id' and other identity columns for MSSQL
          const bodyWithoutId = { ...body };
          delete bodyWithoutId.id; // Remove id to avoid IDENTITY_INSERT error
          
          const columns = Object.keys(bodyWithoutId);
          const values = Object.values(bodyWithoutId);
          const placeholders = values.map((_, i) => `@param${i}`).join(', ');
          const columnsList = columns.join(', ');
          const query = `INSERT INTO ${table} (${columnsList}) OUTPUT INSERTED.* VALUES (${placeholders})`;
          const preparedRequest = pool.request();
          values.forEach((val, i) => {
            preparedRequest.input(`param${i}`, val);
          });
          const result = await preparedRequest.query(query);
          await pool.close();
          return NextResponse.json({ success: true, id: result.recordset[0]?.id, data: result.recordset[0] });
        } catch (err: any) {
          console.error('[API /data POST][mssql] error:', err?.message || err);
          return NextResponse.json({ error: 'Insert error', details: err.message }, { status: 500 });
        }
      }

      if (dbType === 'googlesheets') {
        // Google Sheets: Append row
        try {
          const { getSheetData, appendRows, jsonToSheetRow } = await import('@/lib/googleSheets');
          const sheetId = cfg.connectionString;
          if (!sheetId) {
            return NextResponse.json({ error: 'Sheet ID not found' }, { status: 500 });
          }
          
          // Get header row to determine column order
          const rawData = await getSheetData(sheetId, table);
          if (!rawData || rawData.length === 0) {
            return NextResponse.json({ error: 'Sheet is empty, cannot determine columns' }, { status: 400 });
          }
          
          const headers = rawData[0];
          const row = jsonToSheetRow(body, headers);
          await appendRows(sheetId, table, [row]);
          return NextResponse.json({ success: true, data: body });
        } catch (err: any) {
          console.error('[API /data POST][googlesheets] error:', err?.message || err);
          return NextResponse.json({ error: 'Insert error', details: err.message }, { status: 500 });
        }
      }

      const columns = Object.keys(body);
      if (columns.length === 0) return NextResponse.json({ error: 'No fields to insert' }, { status: 422 });

      // MongoDB insert
      if (dbType === 'mongodb') {
        const { MongoClient } = require('mongodb');
        const client = new MongoClient(cfg.connectionString);
        try {
          await client.connect();
          const db = client.db();
          const collection = db.collection(table);
          const result = await collection.insertOne(body);
          await client.close();
          return NextResponse.json({ success: true, id: result.insertedId });
        } catch (err: any) {
          try { await client.close(); } catch {}
          console.error('[API /data POST][mongodb] error:', err?.message || err);
          return NextResponse.json({ error: 'Insert error', details: err.message }, { status: 500 });
        }
      }

      // Parameterized insert
      if (dbType === 'postgresql') {
        const values = Object.values(body);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const sql = `INSERT INTO ${table} (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const client = new Client({
          host: cfg.host,
          port: cfg.port,
          user: cfg.user,
          password: cfg.password,
          database: cfg.database,
          ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
        } as any);
        
        // Add error handler to prevent uncaught exceptions
        client.on('error', (err) => {
          console.error('[pg client error event]:', err?.message || err);
        });
        
        try {
          await client.connect();
          const result = await client.query(sql, values);
          await client.end();
          return NextResponse.json({ success: true, row: result.rows?.[0] ?? null });
        } catch (err: any) {
          try { await client.end(); } catch {}
          if (err?.code === '28P01') {
            return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
          }
          if (err?.code === 'XX000') {
            const res = NextResponse.json({ error: 'Database temporarily unavailable' }, { status: 503 });
            res.headers.set('Retry-After', '2');
            return res;
          }
          console.error('[API /data POST][pg] error:', err?.message || err);
          return NextResponse.json({ error: 'Insert error' }, { status: 500 });
        }
      }

      // MySQL/MariaDB
      const values = Object.values(body);
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO \`${table}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`;
      const connection = await mysql.createConnection({
        host: cfg.host,
        port: (cfg as any).port || 3306,
        user: cfg.user,
        password: cfg.password,
        database: (cfg as any).database,
        ssl: (cfg as any).ssl ? { rejectUnauthorized: false } : undefined,
      } as any);
      try {
        const [result]: any = await connection.execute(sql, values);
        await connection.end();
        return NextResponse.json({ success: true, id: result?.insertId ?? null });
      } catch (err: any) {
        await connection.end();
        if (err?.code === 'ER_ACCESS_DENIED_ERROR') {
          return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
        }
        console.error('[API /data POST][mysql] error:', err?.message || err);
        return NextResponse.json({ error: 'Insert error' }, { status: 500 });
      }
    }

    // Legacy SQLite fallback (dev/local)
    if (dbType === 'sqlite' || (!dbType && !connectionId)) {
      // SQLite write operations don't work on serverless (Vercel) - filesystem is read-only
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        return NextResponse.json({
          error: 'SQLite is read-only in production',
          details: 'SQLite databases cannot be modified on serverless platforms. Please use PostgreSQL, MySQL, MongoDB, or Google Sheets for write operations.',
          suggestion: 'Switch to a cloud database for production use'
        }, { status: 400 });
      }

      const dbPath = getLatestDbFile();
      if (!dbPath) {
        return NextResponse.json({
          error: 'No database found',
          details: 'Please upload a SQLite database first or provide x-connection-id and x-db-type headers'
        }, { status: 400 });
      }

      const db = new Database(dbPath, { readonly: false });
      try {
        const columns = Object.keys(body);
        if (columns.length === 0) return NextResponse.json({ error: 'No fields to insert' }, { status: 422 });
        const values = Object.values(body);
        const placeholders = columns.map(() => '?').join(', ');
        const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
        const result = db.prepare(query).run(...values);
        db.close();
        return NextResponse.json({ success: true, id: (result as any).lastInsertRowid });
      } catch (err: any) {
        try { db.close(); } catch {}
        console.error('[API /data POST][sqlite] error:', err?.message || err);
        return NextResponse.json({ error: 'Insert error' }, { status: 500 });
      }
    }

    // If we reached here, required headers were missing
    return NextResponse.json({
      error: 'Database type not specified',
      details: 'Provide x-connection-id and x-db-type headers (or use sqlite dev mode)'
    }, { status: 400 });
  } catch (error: any) {
    console.error('[API /data POST] Error:', error?.message || error);
    return NextResponse.json({
      error: 'Database error',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID parameter required' }, { status: 400 });
    }
    
    const dbPath = getLatestDbFile();
    if (!dbPath) {
      return NextResponse.json({ 
        error: 'No database found',
        details: 'Please upload a SQLite database first'
      }, { status: 400 });
    }
    
    const db = new Database(dbPath, { readonly: false });
    
    const updates = Object.keys(body).map(col => `${col} = ?`).join(', ');
    const values = [...Object.values(body), id];
    
    const query = `UPDATE ${table} SET ${updates} WHERE id = ?`;
    const result = db.prepare(query).run(...values);
    
    db.close();
    
    return NextResponse.json({ 
      success: true, 
      changes: result.changes,
      message: 'Record updated successfully' 
    });
  } catch (error: any) {
    console.error('[API /data] Error:', error.message);
    return NextResponse.json({ 
      error: 'Database error', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID parameter required' }, { status: 400 });
    }
    
    const dbPath = getLatestDbFile();
    if (!dbPath) {
      return NextResponse.json({ 
        error: 'No database found',
        details: 'Please upload a SQLite database first'
      }, { status: 400 });
    }
    
    const db = new Database(dbPath, { readonly: false });
    
    const query = `DELETE FROM ${table} WHERE id = ?`;
    const result = db.prepare(query).run(id);
    
    db.close();
    
    return NextResponse.json({ 
      success: true, 
      changes: result.changes,
      message: 'Record deleted successfully' 
    });
  } catch (error: any) {
    console.error('[API /data] Error:', error.message);
    return NextResponse.json({ 
      error: 'Database error', 
      details: error.message 
    }, { status: 500 });
  }
}
