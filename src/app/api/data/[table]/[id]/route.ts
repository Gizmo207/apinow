import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import { Client } from 'pg';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  try {
    const { table, id } = await params;

    // Basic table validation to avoid SQL injection via identifier
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    // Resolve database from headers
    const dbType = (request.headers.get('x-db-type') || '').toLowerCase();
    const connectionId = request.headers.get('x-connection-id');
    const requesterId = request.headers.get('x-user-id') || request.headers.get('x-user') || undefined;

    console.log('[API /data/[table]/[id] GET] Table:', table, 'ID:', id, 'Type:', dbType || '(none)');

    // Secure model for Postgres/MySQL/MariaDB using connectionId
    if (connectionId && (dbType === 'postgresql' || dbType === 'mysql' || dbType === 'mariadb')) {
      const { getConnectionConfig } = await import('@/lib/getConnectionConfig');
      const cfg = await getConnectionConfig(connectionId);
      if (!cfg) return NextResponse.json({ error: 'Invalid connectionId' }, { status: 404 });
      
      if (cfg.ownerId && requesterId && cfg.ownerId !== requesterId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (dbType === 'postgresql') {
        const client = new Client({
          host: cfg.host,
          port: cfg.port,
          user: cfg.user,
          password: cfg.password,
          database: cfg.database,
          ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
        } as any);
        
        try {
          await client.connect();
          const result = await client.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
          await client.end();
          
          if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
          }
          
          return NextResponse.json({ data: result.rows[0] });
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
          console.error('[API /data/[table]/[id] GET][pg] error:', err?.message || err);
          return NextResponse.json({ error: 'Query error', details: err?.message }, { status: 500 });
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
        const [results] = await connection.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
        await connection.end();
        const rows = results as any[];
        
        if (rows.length === 0) {
          return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }
        
        return NextResponse.json({ data: rows[0] });
      } catch (err: any) {
        await connection.end();
        
        if (err?.code === 'ER_ACCESS_DENIED_ERROR') {
          return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
        }
        console.error('[API /data/[table]/[id] GET][mysql] error:', err?.message || err);
        return NextResponse.json({ error: 'Query error', details: err?.message }, { status: 500 });
      }
    }

    // SQLite with connection ID
    if (dbType === 'sqlite' && connectionId) {
      const dbPath = join(process.cwd(), 'uploads', connectionId);
      console.log('[GET][SQLite] Looking for:', dbPath, '| Exists?', existsSync(dbPath));
      
      if (!existsSync(dbPath)) {
        return NextResponse.json({
          error: 'Database file not found',
          details: `SQLite file ${connectionId} does not exist at ${dbPath}`
        }, { status: 404 });
      }

      const db = new Database(dbPath, { readonly: true });
      const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
      db.close();

      if (!row) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }

      return NextResponse.json({ data: row });
    }
    
    // SQLite fallback (legacy - no connection ID)
    if (dbType === 'sqlite' || !dbType) {
      const dbPath = getLatestDbFile();
      if (!dbPath) {
        return NextResponse.json({
          error: 'No database found',
          details: 'Please provide database via x-connection-id header'
        }, { status: 400 });
      }

      const db = new Database(dbPath, { readonly: true });
      const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
      db.close();

      if (!row) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }

      return NextResponse.json({ data: row });
    }

    return NextResponse.json({
      error: 'Database type not specified',
      details: 'Please specify x-db-type and x-connection-id headers'
    }, { status: 400 });
  } catch (error: any) {
    console.error('[API /data/[table]/[id] GET] Error:', error?.message || error);
    return NextResponse.json({
      error: 'Database error',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  try {
    const { table, id } = await params;

    // Basic table validation
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    // Parse JSON body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Malformed JSON body' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Expected a JSON object body' }, { status: 400 });
    }

    const columns = Object.keys(body);
    if (columns.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 422 });
    }

    // Headers for secure model
    const dbType = (request.headers.get('x-db-type') || '').toLowerCase();
    const connectionId = request.headers.get('x-connection-id');
    const requesterId = request.headers.get('x-user-id') || request.headers.get('x-user') || undefined;

    console.log('[API /data/[table]/[id] PUT] Table:', table, 'ID:', id, 'Type:', dbType || '(none)');

    // Secure model for Postgres/MySQL/MariaDB
    if (connectionId && (dbType === 'postgresql' || dbType === 'mysql' || dbType === 'mariadb')) {
      const { getConnectionConfig } = await import('@/lib/getConnectionConfig');
      const cfg = await getConnectionConfig(connectionId);
      if (!cfg) return NextResponse.json({ error: 'Invalid connectionId' }, { status: 404 });
      
      if (cfg.ownerId && requesterId && cfg.ownerId !== requesterId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (dbType === 'postgresql') {
        const values = Object.values(body);
        const setClauses = columns.map((col, i) => `"${col}" = $${i + 1}`).join(', ');
        const sql = `UPDATE ${table} SET ${setClauses} WHERE id = $${values.length + 1} RETURNING *`;
        
        const client = new Client({
          host: cfg.host,
          port: cfg.port,
          user: cfg.user,
          password: cfg.password,
          database: cfg.database,
          ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
        } as any);
        
        try {
          await client.connect();
          const result = await client.query(sql, [...values, id]);
          await client.end();
          
          if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
          }
          
          return NextResponse.json({ 
            success: true, 
            row: result.rows?.[0] ?? null,
            changes: result.rowCount 
          });
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
          console.error('[API /data/[table]/[id] PUT][pg] error:', err?.message || err);
          return NextResponse.json({ error: 'Update error', details: err?.message }, { status: 500 });
        }
      }

      // MySQL/MariaDB
      const values = Object.values(body);
      const setClauses = columns.map(col => `\`${col}\` = ?`).join(', ');
      const sql = `UPDATE \`${table}\` SET ${setClauses} WHERE id = ?`;
      
      const connection = await mysql.createConnection({
        host: cfg.host,
        port: (cfg as any).port || 3306,
        user: cfg.user,
        password: cfg.password,
        database: (cfg as any).database,
        ssl: (cfg as any).ssl ? { rejectUnauthorized: false } : undefined,
      } as any);
      
      try {
        const [result]: any = await connection.execute(sql, [...values, id]);
        await connection.end();
        
        if (result.affectedRows === 0) {
          return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }
        
        return NextResponse.json({ 
          success: true, 
          changes: result.affectedRows,
          message: 'Record updated successfully' 
        });
      } catch (err: any) {
        await connection.end();
        
        if (err?.code === 'ER_ACCESS_DENIED_ERROR') {
          return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
        }
        console.error('[API /data/[table]/[id] PUT][mysql] error:', err?.message || err);
        return NextResponse.json({ error: 'Update error', details: err?.message }, { status: 500 });
      }
    }

    // SQLite with connection ID
    if (dbType === 'sqlite' && connectionId) {
      const dbPath = join(process.cwd(), 'uploads', connectionId);
      
      if (!existsSync(dbPath)) {
        return NextResponse.json({
          error: 'Database file not found',
          details: `SQLite file ${connectionId} does not exist`
        }, { status: 404 });
      }

      const db = new Database(dbPath, { readonly: false });
      
      try {
        const updates = columns.map(col => `${col} = ?`).join(', ');
        const values = [...Object.values(body), id];
        const query = `UPDATE ${table} SET ${updates} WHERE id = ?`;
        const result = db.prepare(query).run(...values);
        db.close();
        
        if (result.changes === 0) {
          return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }
        
        return NextResponse.json({ 
          success: true, 
          changes: result.changes,
          message: 'Record updated successfully' 
        });
      } catch (err: any) {
        try { db.close(); } catch {}
        console.error('[API /data/[table]/[id] PUT][sqlite] error:', err?.message || err);
        return NextResponse.json({ error: 'Update error', details: err?.message }, { status: 500 });
      }
    }
    
    // SQLite fallback (legacy)
    if (dbType === 'sqlite' || !dbType) {
      const dbPath = getLatestDbFile();
      if (!dbPath) {
        return NextResponse.json({
          error: 'No database found',
          details: 'Please provide database via x-connection-id header'
        }, { status: 400 });
      }

      const db = new Database(dbPath, { readonly: false });
      
      try {
        const updates = columns.map(col => `${col} = ?`).join(', ');
        const values = [...Object.values(body), id];
        const query = `UPDATE ${table} SET ${updates} WHERE id = ?`;
        const result = db.prepare(query).run(...values);
        db.close();
        
        if (result.changes === 0) {
          return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }
        
        return NextResponse.json({ 
          success: true, 
          changes: result.changes,
          message: 'Record updated successfully' 
        });
      } catch (err: any) {
        try { db.close(); } catch {}
        console.error('[API /data/[table]/[id] PUT][sqlite] error:', err?.message || err);
        return NextResponse.json({ error: 'Update error', details: err?.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      error: 'Database type not specified',
      details: 'Provide x-connection-id and x-db-type headers'
    }, { status: 400 });
  } catch (error: any) {
    console.error('[API /data/[table]/[id] PUT] Error:', error?.message || error);
    return NextResponse.json({
      error: 'Database error',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  try {
    const { table, id } = await params;

    // Basic table validation
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    // Headers for secure model
    const dbType = (request.headers.get('x-db-type') || '').toLowerCase();
    const connectionId = request.headers.get('x-connection-id');
    const requesterId = request.headers.get('x-user-id') || request.headers.get('x-user') || undefined;

    console.log('[API /data/[table]/[id] DELETE] Table:', table, 'ID:', id, 'Type:', dbType || '(none)');

    // Secure model for Postgres/MySQL/MariaDB
    if (connectionId && (dbType === 'postgresql' || dbType === 'mysql' || dbType === 'mariadb')) {
      const { getConnectionConfig } = await import('@/lib/getConnectionConfig');
      const cfg = await getConnectionConfig(connectionId);
      if (!cfg) return NextResponse.json({ error: 'Invalid connectionId' }, { status: 404 });
      
      if (cfg.ownerId && requesterId && cfg.ownerId !== requesterId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (dbType === 'postgresql') {
        const sql = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;
        
        const client = new Client({
          host: cfg.host,
          port: cfg.port,
          user: cfg.user,
          password: cfg.password,
          database: cfg.database,
          ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
        } as any);
        
        try {
          await client.connect();
          const result = await client.query(sql, [id]);
          await client.end();
          
          if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
          }
          
          return NextResponse.json({ 
            success: true, 
            row: result.rows?.[0] ?? null,
            changes: result.rowCount,
            message: 'Record deleted successfully' 
          });
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
          console.error('[API /data/[table]/[id] DELETE][pg] error:', err?.message || err);
          return NextResponse.json({ error: 'Delete error', details: err?.message }, { status: 500 });
        }
      }

      // MySQL/MariaDB
      const sql = `DELETE FROM \`${table}\` WHERE id = ?`;
      
      const connection = await mysql.createConnection({
        host: cfg.host,
        port: (cfg as any).port || 3306,
        user: cfg.user,
        password: cfg.password,
        database: (cfg as any).database,
        ssl: (cfg as any).ssl ? { rejectUnauthorized: false } : undefined,
      } as any);
      
      try {
        const [result]: any = await connection.execute(sql, [id]);
        await connection.end();
        
        if (result.affectedRows === 0) {
          return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }
        
        return NextResponse.json({ 
          success: true, 
          changes: result.affectedRows,
          message: 'Record deleted successfully' 
        });
      } catch (err: any) {
        await connection.end();
        
        if (err?.code === 'ER_ACCESS_DENIED_ERROR') {
          return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
        }
        console.error('[API /data/[table]/[id] DELETE][mysql] error:', err?.message || err);
        return NextResponse.json({ error: 'Delete error', details: err?.message }, { status: 500 });
      }
    }

    // SQLite with connection ID
    if (dbType === 'sqlite' && connectionId) {
      const dbPath = join(process.cwd(), 'uploads', connectionId);
      
      if (!existsSync(dbPath)) {
        return NextResponse.json({
          error: 'Database file not found',
          details: `SQLite file ${connectionId} does not exist`
        }, { status: 404 });
      }

      const db = new Database(dbPath, { readonly: false });
      
      try {
        const query = `DELETE FROM ${table} WHERE id = ?`;
        const result = db.prepare(query).run(id);
        db.close();
        
        if (result.changes === 0) {
          return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }
        
        return NextResponse.json({ 
          success: true, 
          changes: result.changes,
          message: 'Record deleted successfully' 
        });
      } catch (err: any) {
        try { db.close(); } catch {}
        console.error('[API /data/[table]/[id] DELETE][sqlite] error:', err?.message || err);
        return NextResponse.json({ error: 'Delete error', details: err?.message }, { status: 500 });
      }
    }
    
    // SQLite fallback (legacy)
    if (dbType === 'sqlite' || !dbType) {
      const dbPath = getLatestDbFile();
      if (!dbPath) {
        return NextResponse.json({
          error: 'No database found',
          details: 'Please provide database via x-connection-id header'
        }, { status: 400 });
      }

      const db = new Database(dbPath, { readonly: false });
      
      try {
        const query = `DELETE FROM ${table} WHERE id = ?`;
        const result = db.prepare(query).run(id);
        db.close();
        
        if (result.changes === 0) {
          return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }
        
        return NextResponse.json({ 
          success: true, 
          changes: result.changes,
          message: 'Record deleted successfully' 
        });
      } catch (err: any) {
        try { db.close(); } catch {}
        console.error('[API /data/[table]/[id] DELETE][sqlite] error:', err?.message || err);
        return NextResponse.json({ error: 'Delete error', details: err?.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      error: 'Database type not specified',
      details: 'Provide x-connection-id and x-db-type headers'
    }, { status: 400 });
  } catch (error: any) {
    console.error('[API /data/[table]/[id] DELETE] Error:', error?.message || error);
    return NextResponse.json({
      error: 'Database error',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
