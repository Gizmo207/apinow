import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getConnectionConfig } from '@/lib/getConnectionConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PostBody {
  connectionId?: string;
  query?: string;
}

function isSafeSelect(sql: string): boolean {
  const s = sql.trim().replace(/;+\s*$/g, '');
  // Only allow SELECT statements, optionally with common clauses. Block dangerous keywords.
  if (!/^select\s/i.test(s)) return false;
  // Disallow data-changing keywords
  const forbidden = /(insert\s|update\s|delete\s|drop\s|truncate\s|alter\s|create\s|grant\s|revoke\s|comment\s|merge\s|call\s|execute\s|vacuum\s)/i;
  if (forbidden.test(s)) return false;
  // Very simple; good enough for our table preview use case
  return true;
}

import { getCurrentUserId } from '@/lib/auth-server';

export async function POST(req: Request) {
  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { connectionId, query } = body || {};
  if (!connectionId) {
    return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 });
  }
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }
  if (!isSafeSelect(query)) {
    return NextResponse.json({ error: 'Only SELECT queries are allowed' }, { status: 422 });
  }

  // Resolve credentials server-side
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

  const client = await pool.connect();
  try {
    const result = await client.query(query);
    const rows = result?.rows ?? [];
    return NextResponse.json({ success: true, rows });
  } catch (err: any) {
    // Map auth error
    if (typeof err?.code === 'string' && err.code === '28P01') {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    console.error('PostgreSQL query error:', err?.message || err);
    return NextResponse.json({ error: 'Query error' }, { status: 500 });
  } finally {
    client.release();
    await pool.end();
  }
}
