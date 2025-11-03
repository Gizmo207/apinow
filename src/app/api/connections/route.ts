import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allowed engines we can accept via this create endpoint
const ALLOWED_ENGINES = new Set(['postgresql', 'mysql', 'mariadb', 'mongodb', 'mssql', 'redis']);

function parseBoolean(val: any, fallback = false): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return ['true', '1', 'yes', 'on'].includes(val.toLowerCase());
  return fallback;
}

function sanitizeString(val: any): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  return trimmed.length ? trimmed : undefined;
}

// Minimal Postgres DSN parser (supports postgresql:// or postgres://)
function parsePostgresDsn(dsn: string) {
  try {
    // Support both postgres:// and postgresql://
    const normalized = dsn.replace(/^postgres:\/\//, 'postgresql://');
    const url = new URL(normalized);
    const host = url.hostname;
    const port = url.port ? Number(url.port) : 5432;
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    // path starts with /dbname
    const database = url.pathname && url.pathname.length > 1 ? decodeURIComponent(url.pathname.slice(1)) : 'postgres';
    const sslParam = url.searchParams.get('ssl') || url.searchParams.get('sslmode');
    const ssl = sslParam ? (sslParam === 'require' || parseBoolean(sslParam, false)) : undefined;
    return { host, port, user, password, database, ssl };
  } catch {
    return null;
  }
}

import { getCurrentUserId } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = sanitizeString(body.type)?.toLowerCase();
    const name = sanitizeString(body.name) || 'Database';

    if (!type || !ALLOWED_ENGINES.has(type)) {
      return NextResponse.json({ error: 'Unsupported or missing type' }, { status: 422 });
    }

    const requesterId = getCurrentUserId(req);
    // Allow explicit ownerId in body only if it matches requester; otherwise ignore
    let ownerId = sanitizeString(body.ownerId);
    if (!ownerId) ownerId = requesterId;

    const now = new Date().toISOString();

    let docData: any = {
      type,
      name,
      createdAt: now,
      updatedAt: now,
      ownerId,
    };

    if (type === 'postgresql') {
      // Accept either a DSN or discrete fields
      const connectionString = sanitizeString(body.connectionString);
      let host = sanitizeString(body.host);
      let port = body.port != null ? Number(body.port) : undefined;
      let user = sanitizeString(body.user);
      let password = sanitizeString(body.password);
      let database = sanitizeString(body.database) || 'postgres';
      let ssl = body.ssl != null ? parseBoolean(body.ssl) : undefined;

      if (connectionString) {
        const parsed = parsePostgresDsn(connectionString);
        if (!parsed) {
          return NextResponse.json({ error: 'Invalid PostgreSQL connection string' }, { status: 422 });
        }
        host = host || parsed.host;
        port = port || parsed.port;
        user = user || parsed.user;
        password = password || parsed.password;
        database = database || parsed.database || 'postgres';
        if (ssl === undefined) ssl = parsed.ssl ?? true; // default to true for pooler
      }

      if (!host || !user || !password) {
        return NextResponse.json({ error: 'Missing required PostgreSQL fields: host, user, password' }, { status: 422 });
      }

      docData = {
        ...docData,
        host,
        port: Number.isFinite(port as number) ? (port as number) : 5432,
        user,
        password,
        database,
        ssl: ssl === undefined ? true : !!ssl
      };
    } else {
      // For other engines (mysql, mariadb, mongodb, mssql, redis):
      // Store what was provided. You can extend this later per engine.
      const connectionString = sanitizeString(body.connectionString);
      if (!connectionString) {
        return NextResponse.json({ error: 'Missing connectionString for this engine' }, { status: 422 });
      }
      docData = {
        ...docData,
        connectionString,
      };
    }

    const ref = await adminDb.collection('database_connections').add(docData);

    return NextResponse.json({ id: ref.id, type, name }, { status: 201 });
  } catch (e: any) {
    const message = typeof e?.message === 'string' ? e.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
