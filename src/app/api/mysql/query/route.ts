import { NextResponse } from 'next/server';
import * as mysql from 'mysql2/promise';
import { getConnectionConfig } from '@/lib/getConnectionConfig';
import { getCurrentUserId } from '@/lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Force recompile

function isSafeSelect(sql: string): boolean {
  const s = sql.trim().replace(/;+$\s*/g, '');
  if (!/^select\s/i.test(s)) return false;
  const forbidden = /(insert\s|update\s|delete\s|drop\s|truncate\s|alter\s|create\s|grant\s|revoke\s|comment\s|merge\s|call\s|execute\s)/i;
  return !forbidden.test(s);
}

function isAllowedQuery(sql: string): boolean {
  const s = sql.trim();
  // Allow SELECT, CREATE TABLE, INSERT, UPDATE, DELETE, ALTER TABLE
  const allowed = /^(select\s|create\s+table\s|insert\s+into\s|update\s|delete\s+from\s|alter\s+table\s)/i;
  // Block dangerous operations
  const forbidden = /\b(drop\s+database|drop\s+schema|truncate\s+database|grant\s|revoke\s|create\s+user|drop\s+user)\b/i;
  return allowed.test(s) && !forbidden.test(s);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const connectionId = body?.connectionId as string | undefined;
    const query = body?.query as string | undefined;

    if (!connectionId) {
      return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 });
    }
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }
    if (!isAllowedQuery(query)) {
      return NextResponse.json({ error: 'Query not allowed. Only SELECT, CREATE TABLE, INSERT, UPDATE, DELETE, and ALTER TABLE queries are permitted.' }, { status: 422 });
    }

    const cfg = await getConnectionConfig(connectionId);
    if (!cfg) return NextResponse.json({ error: 'Invalid connectionId' }, { status: 404 });

    const requesterId = getCurrentUserId(req);
    if (cfg.ownerId && requesterId && cfg.ownerId !== requesterId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const connection = await mysql.createConnection({
      host: cfg.host,
      port: (cfg as any).port || 3306,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      ssl: (cfg as any).ssl ? { rejectUnauthorized: false } : undefined,
    } as any);

    try {
      const [result] = await connection.query(query);
      await connection.end();
      // For CREATE/INSERT/UPDATE/DELETE, result is metadata, not rows
      return NextResponse.json({ success: true, rows: Array.isArray(result) ? result : [], result });
    } catch (err: any) {
      await connection.end();
      const msg = err?.message || String(err);
      // MySQL auth errors typically include ER_ACCESS_DENIED_ERROR code 'ER_ACCESS_DENIED_ERROR'
      if (err?.code === 'ER_ACCESS_DENIED_ERROR') {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
      console.error('MySQL query error:', msg);
      return NextResponse.json({ error: 'Query error' }, { status: 500 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Invalid request' }, { status: 400 });
  }
}
