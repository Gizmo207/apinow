import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import { Client } from 'pg';
import { readdirSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export const runtime = 'nodejs';

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
    
    // Get database info from headers
    const dbType = request.headers.get('x-db-type');
    const connectionString = request.headers.get('x-db-connection');
    const dbFile = request.headers.get('x-db-file');
    
    console.log('[API /data GET] Table:', table, 'Type:', dbType);
    
    if (!dbType) {
      return NextResponse.json({ 
        error: 'Database type not specified',
        details: 'Please specify x-db-type header'
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
      rows = db.prepare(`SELECT * FROM ${table}`).all();
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
      
      // Parse connection string and add SSL if needed
      // MariaDB uses MySQL protocol
      let connectionConfig: any;
      if (connectionString.includes('ssl-mode=REQUIRED') || connectionString.includes('aivencloud.com')) {
        connectionConfig = {
          uri: connectionString,
          ssl: {
            rejectUnauthorized: false
          }
        };
      } else {
        connectionConfig = connectionString;
      }
      
      const connection = await mysql.createConnection(connectionConfig);
      const [results] = await connection.execute(`SELECT * FROM ${table}`);
      rows = results as any[];
      await connection.end();
    }
    else if (dbType === 'postgresql') {
      if (!connectionString) {
        return NextResponse.json({ error: 'Connection string required' }, { status: 400 });
      }
      
      // Configure SSL if needed
      let clientConfig: any;
      if (connectionString.includes('sslmode=require') || connectionString.includes('ssl=true') || connectionString.includes('pooler.supabase.com')) {
        clientConfig = {
          connectionString,
          ssl: {
            rejectUnauthorized: false
          }
        };
      } else {
        clientConfig = { connectionString };
      }
      
      const client = new Client(clientConfig);
      await client.connect();
      const result = await client.query(`SELECT * FROM ${table}`);
      rows = result.rows;
      await client.end();
    }
    else {
      return NextResponse.json({ 
        error: 'Unsupported database type',
        details: `Database type '${dbType}' is not supported`
      }, { status: 400 });
    }
    
    return NextResponse.json({ data: rows, count: rows.length });
  } catch (error: any) {
    console.error('[API /data] Error:', error.message);
    
    // Clean up temp file on error
    if (tempFilePath) {
      try { unlinkSync(tempFilePath); } catch {}
    }
    
    return NextResponse.json({ 
      error: 'Database error', 
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    const body = await request.json();
    
    const dbPath = getLatestDbFile();
    if (!dbPath) {
      return NextResponse.json({ 
        error: 'No database found',
        details: 'Please upload a SQLite database first'
      }, { status: 400 });
    }
    
    const db = new Database(dbPath, { readonly: false });
    
    const columns = Object.keys(body);
    const values = Object.values(body);
    const placeholders = columns.map(() => '?').join(', ');
    
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = db.prepare(query).run(...values);
    
    db.close();
    
    return NextResponse.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: 'Record created successfully' 
    });
  } catch (error: any) {
    console.error('[API /data] Error:', error.message);
    return NextResponse.json({ 
      error: 'Database error', 
      details: error.message 
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
