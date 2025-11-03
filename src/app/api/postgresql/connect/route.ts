import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getConnectionConfig } from '@/lib/getConnectionConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getCurrentUserId } from '@/lib/auth-server';

export async function POST(req: Request) {
  try {
    const { connectionId } = await req.json();

    if (!connectionId) {
      return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 });
    }

    const cfg = await getConnectionConfig(connectionId);
    if (!cfg) {
      return NextResponse.json({ error: 'Invalid connectionId' }, { status: 404 });
    }

    // Enforce ownership if present
    const requesterId = getCurrentUserId(req);
    if (cfg.ownerId && requesterId && cfg.ownerId !== requesterId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const pool = new Pool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Add error handler to prevent uncaught exceptions
    pool.on('error', (err) => {
      console.error('[pg pool error event]:', err?.message || err);
    });

    try {
      // List public tables
      const tablesResult = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);

      const tableNames = tablesResult.rows.map((r: any) => r.table_name || r.tablename);

      // Build schema map
      const schema: Record<string, { name: string; type: string; nullable: boolean; primaryKey: boolean }[]> = {};
      for (const tableName of tableNames) {
        const columnsResult = await pool.query(
          `SELECT column_name, data_type, is_nullable, column_default
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = $1
           ORDER BY ordinal_position`,
          [tableName]
        );

        const pkResult = await pool.query(
          `SELECT a.attname
           FROM pg_index i
           JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
           WHERE i.indrelid = $1::regclass AND i.indisprimary`,
          [`public.${tableName}`]
        );
        const primaryKeys = pkResult.rows.map((row: any) => row.attname);

        schema[tableName] = columnsResult.rows.map((col: any) => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          primaryKey: primaryKeys.includes(col.column_name),
        }));
      }

      await pool.end();
      return NextResponse.json({ success: true, tables: tableNames, schema });
    } catch (err: any) {
      try { await pool.end(); } catch {}
      // Map common auth error to 401
      if (typeof err?.code === 'string') {
        if (err.code === '28P01') {
          return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
        }
        if (err.code === 'XX000') {
          const res = NextResponse.json({ error: 'Database temporarily unavailable' }, { status: 503 });
          res.headers.set('Retry-After', '2');
          return res;
        }
      }
      console.error('PostgreSQL connect error:', err?.message || err);
      return NextResponse.json({ error: 'Connection error' }, { status: 500 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Invalid request' }, { status: 400 });
  }
}
