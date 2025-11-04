import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allowed engines we can accept via this create endpoint
const ALLOWED_ENGINES = new Set(['postgresql', 'mysql', 'mariadb', 'mongodb', 'mssql']);

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

// Minimal MySQL/MariaDB DSN parser (mysql:// or mariadb://)
function parseMysqlDsn(dsn: string) {
  try {
    const url = new URL(dsn);
    if (url.protocol !== 'mysql:' && url.protocol !== 'mariadb:') return null;
    const host = url.hostname;
    const port = url.port ? Number(url.port) : 3306;
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const database = url.pathname && url.pathname.length > 1 ? decodeURIComponent(url.pathname.slice(1)) : '';
    const sslParam = url.searchParams.get('ssl') || url.searchParams.get('ssl-mode') || url.searchParams.get('sslmode');
    const ssl = sslParam ? (sslParam === 'require' || sslParam === 'REQUIRED' || parseBoolean(sslParam, false)) : undefined;
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
      // For other engines (mysql, mariadb, mongodb, mssql):
      const connectionString = sanitizeString(body.connectionString);
      if (!connectionString) {
        return NextResponse.json({ error: 'Missing connectionString for this engine' }, { status: 422 });
      }

      if (type === 'mysql' || type === 'mariadb') {
        // Parse DSN and persist discrete fields too
        const parsed = parseMysqlDsn(connectionString);
        if (!parsed) {
          return NextResponse.json({ error: 'Invalid MySQL/MariaDB connection string' }, { status: 422 });
        }
        docData = {
          ...docData,
          connectionString,
          host: sanitizeString(body.host) || parsed.host,
          port: body.port != null ? Number(body.port) : parsed.port,
          user: sanitizeString(body.user) || parsed.user,
          password: sanitizeString(body.password) || parsed.password,
          database: sanitizeString(body.database) || parsed.database,
          ssl: body.ssl != null ? parseBoolean(body.ssl) : (parsed.ssl ?? false),
        };
      } else if (type === 'mongodb') {
        // For MongoDB, inject database name into connection string if missing
        const database = sanitizeString(body.database) || 'test';
        let finalConnectionString = connectionString;
        
        // Simple approach: if /? exists (no database), inject database name
        if (connectionString.includes('/?')) {
          finalConnectionString = connectionString.replace('/?', `/${database}?`);
        } else if (connectionString.endsWith('/')) {
          finalConnectionString = connectionString + database;
        }
        // else: database probably already in URL, leave as-is
        
        console.log('[MongoDB] Original:', connectionString);
        console.log('[MongoDB] Final:', finalConnectionString);
        
        docData = {
          ...docData,
          connectionString: finalConnectionString,
          database,
        };
      } else {
        // Persist as-is for now (mssql)
        docData = {
          ...docData,
          connectionString,
        };
      }
    }

    const ref = await adminDb.collection('database_connections').add(docData);

    return NextResponse.json({ id: ref.id, type, name }, { status: 201 });
  } catch (e: any) {
    const message = typeof e?.message === 'string' ? e.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// List connections for current user
export async function GET(req: NextRequest) {
  try {
    const requesterId = getCurrentUserId(req);
    if (!requesterId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const qs = req.nextUrl.searchParams;
    const limit = Number(qs.get('limit') || 50);
    const snap = await adminDb.collection('database_connections')
      .where('ownerId', '==', requesterId)
      .orderBy('createdAt', 'desc')
      .limit(Math.min(limit, 200))
      .get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data(), password: undefined, connectionString: undefined }));
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list connections' }, { status: 500 });
  }
}

// Delete a connection (by id). Enforces ownership.
export async function DELETE(req: NextRequest) {
  try {
    const requesterId = getCurrentUserId(req);
    if (!requesterId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const id = sanitizeString(body.id) || req.nextUrl.searchParams.get('id') || undefined;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const ref = adminDb.collection('database_connections').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const data = snap.data() as any;
    if (data?.ownerId && data.ownerId !== requesterId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await ref.delete();
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete connection' }, { status: 500 });
  }
}
