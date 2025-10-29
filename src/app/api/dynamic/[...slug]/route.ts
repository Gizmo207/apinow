import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- Helpers copied/adapted from introspect route ---
async function loadServiceAccountJSON(): Promise<string | null> {
  try {
    const envJson = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (envJson && envJson.trim()) return envJson;

    const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (gacPath) {
      const { readFile } = await import('fs/promises');
      try { const file = await readFile(gacPath, 'utf8'); if (file && file.trim()) return file; } catch {}
    }

    const { readFile } = await import('fs/promises');
    const { join } = await import('path');
    const candidate = join(process.cwd(), 'firebase-service-account.json');
    try { const file = await readFile(candidate, 'utf8'); if (file && file.trim()) return file; } catch {}

    return null;
  } catch {
    return null;
  }
}

function getAdminApp(appName: string, serviceAccountKey: string) {
  try {
    return admin.app(appName);
  } catch {
    const svc = JSON.parse(serviceAccountKey);
    return admin.initializeApp({
      credential: admin.credential.cert(svc as admin.ServiceAccount),
      projectId: svc.project_id,
    }, appName);
  }
}

async function verifyAuthIfProvided(req: NextRequest, authRequired: boolean): Promise<{ uid: string | null, token?: string | null, projectId?: string | null, error?: NextResponse }>{
  // Use shared server auth helper which can verify via Admin if available, or fall back to safe decode
  try {
    const ctx = await getOptionalAuth(req);
    if (!ctx) {
      if (authRequired) {
        return { uid: null, error: NextResponse.json({ error: 'Unauthorized', details: 'Missing or invalid token' }, { status: 401 }) };
      }
      return { uid: null };
    }
    return { uid: ctx.userId };
  } catch (e: any) {
    if (authRequired) {
      return { uid: null, error: NextResponse.json({ error: 'Unauthorized', details: e?.message || 'Invalid token' }, { status: 401 }) };
    }
    return { uid: null };
  }
}

async function getEndpointAndConnection(pathname: string, method: string, uid: string | null) {
  const keyJSON = await loadServiceAccountJSON();
  if (!keyJSON) {
    // Admin not configured; gracefully indicate we cannot look up endpoints
    return { endpoint: null, connection: null } as any;
  }
  const app = getAdminApp('dynamic-exec', keyJSON);
  const afs = admin.firestore(app);

  // Find endpoint by exact path and method
  const epSnap = await afs.collection('api_endpoints')
    .where('path', '==', pathname)
    .where('method', '==', method)
    .where('isActive', '==', true)
    .limit(1)
    .get();
  if (epSnap.empty) return { endpoint: null, connection: null };
  const endpoint = { id: epSnap.docs[0].id, ...epSnap.docs[0].data() } as any;

  // If authRequired, must have uid and ownership
  if (endpoint.authRequired) {
    if (!uid) throw new Error('AUTH_REQUIRED');
    if (endpoint.userId && endpoint.userId !== uid) throw new Error('FORBIDDEN');
  }

  if (!endpoint.connectionId) return { endpoint, connection: null };
  const connDoc = await afs.collection('database_connections').doc(endpoint.connectionId).get();
  const connection = connDoc.exists ? ({ id: connDoc.id, ...connDoc.data() } as any) : null;
  return { endpoint, connection };
}

// --- SQLite helpers ---
async function sqliteQuery(dbPath: string, sql: string, params: any[] = []) {
  let Database: any;
  try {
    Database = (await import('better-sqlite3')).default;
  } catch (e: any) {
    throw new Error('SQLITE_DRIVER_MISSING');
  }
  const { isAbsolute, join } = await import('path');
  const { existsSync } = await import('fs');
  if (dbPath !== ':memory:' && !isAbsolute(dbPath)) {
    dbPath = join(process.cwd(), dbPath);
  }
  if (dbPath !== ':memory:' && !existsSync(dbPath)) {
    const err: any = new Error('SQLITE_NOT_FOUND');
    (err as any).details = `Resolved path does not exist: ${dbPath}`;
    throw err;
  }
  const db = dbPath === ':memory:' ? new Database(dbPath) : new Database(dbPath, { readonly: false });
  try {
    const stmt = db.prepare(sql);
    if (/^select/i.test(sql)) {
      return stmt.all(...params);
    }
    const info = stmt.run(...params);
    return info;
  } finally {
    try { db.close?.(); } catch {}
  }
}

function safeIdent(name: string): string {
  // allow letters, numbers, underscore; quote with double quotes
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error('INVALID_IDENTIFIER');
  }
  return '"' + name + '"';
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
  try {
    const { slug } = await ctx.params;
    const collection = slug?.[0];
    const id = slug?.[1] || null;
    const pathname = new URL(req.url).pathname; // e.g. /api/dynamic/users or /api/dynamic/users/123
    const method = 'GET';

    // SQLite-only mode: bypass auth and endpoint lookups; use env path
    const connection = { type: 'sqlite', databaseName: process.env.SQLITE_DB_PATH || process.env.SQLITE_DB || '' } as any;
    if (!connection.databaseName) {
      return NextResponse.json({ error: 'SQLite path not configured', details: 'Set SQLITE_DB_PATH env var to your .db file' }, { status: 500 });
    }

    if (connection.type === 'sqlite') {
      const table = collection;
      if (!table) return NextResponse.json({ error: 'Table missing' }, { status: 400 });
      const limit = Math.min(100, Math.max(1, Number(new URL(req.url).searchParams.get('limit') || '50')));

      if (id) {
        // Try to fetch by id column
        try {
          const rows = await sqliteQuery(String(connection.databaseName || connection.database || connection.path || ''), `SELECT * FROM ${safeIdent(table)} WHERE id = ? LIMIT 1`, [id]);
          if (!rows || rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
          return NextResponse.json(rows[0]);
        } catch (e: any) {
          if (e.message === 'INVALID_IDENTIFIER') return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
          if (e.message === 'SQLITE_DRIVER_MISSING') return NextResponse.json({ error: 'SQLite driver not available' }, { status: 500 });
          if (e.message === 'SQLITE_NOT_FOUND') return NextResponse.json({ error: 'SQLite database not found', details: e.details }, { status: 404 });
          return NextResponse.json({ error: 'Query failed', details: e?.message || String(e) }, { status: 500 });
        }
      } else {
        try {
          const rows = await sqliteQuery(String(connection.databaseName || connection.database || connection.path || ''), `SELECT * FROM ${safeIdent(table)} LIMIT ?`, [limit]);
          return NextResponse.json(rows);
        } catch (e: any) {
          if (e.message === 'INVALID_IDENTIFIER') return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
          if (e.message === 'SQLITE_DRIVER_MISSING') return NextResponse.json({ error: 'SQLite driver not available' }, { status: 500 });
          if (e.message === 'SQLITE_NOT_FOUND') return NextResponse.json({ error: 'SQLite database not found', details: e.details }, { status: 404 });
          return NextResponse.json({ error: 'Query failed', details: e?.message || String(e) }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ error: 'Unsupported database type for GET' }, { status: 400 });
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ error: 'Failed to handle GET', details: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
  try {
    const { slug } = await ctx.params;
    const collection = slug?.[0];

    // SQLite-only execution: no auth or Firestore lookup
    const dbPathEnv = process.env.SQLITE_DB_PATH || process.env.SQLITE_DB || '';
    if (!dbPathEnv) {
      return NextResponse.json({ error: 'SQLite path not configured', details: 'Set SQLITE_DB_PATH (or SQLITE_DB) to your .db file path' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));

    const table = collection;
    if (!table) return NextResponse.json({ error: 'Table missing' }, { status: 400 });
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const keys = Object.keys(body);
    if (keys.length === 0) return NextResponse.json({ error: 'Empty body' }, { status: 400 });

    try {
      const columns = keys.map(k => safeIdent(k)).join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map(k => (body as any)[k]);
      const info: any = await sqliteQuery(String(dbPathEnv), `INSERT INTO ${safeIdent(table)} (${columns}) VALUES (${placeholders})`, values);
      const resultId = info?.lastInsertRowid ?? info?.lastInsertROWID ?? null;
      // Try to read back row if id present
      if (resultId != null) {
        try {
          const row = await sqliteQuery(String(dbPathEnv), `SELECT * FROM ${safeIdent(table)} WHERE id = ? LIMIT 1`, [resultId]);
          return NextResponse.json({ id: resultId, data: Array.isArray(row) && row.length ? row[0] : body }, { status: 201 });
        } catch {
          return NextResponse.json({ id: resultId, data: body }, { status: 201 });
        }
      }
      return NextResponse.json({ success: true, data: body }, { status: 201 });
    } catch (e: any) {
      if (e.message === 'INVALID_IDENTIFIER') return NextResponse.json({ error: 'Invalid table or column name' }, { status: 400 });
      if (e.message === 'SQLITE_DRIVER_MISSING') return NextResponse.json({ error: 'SQLite driver not available' }, { status: 500 });
      if (e.message === 'SQLITE_NOT_FOUND') return NextResponse.json({ error: 'SQLite database not found', details: e.details }, { status: 404 });
      return NextResponse.json({ error: 'Insert failed', details: e?.message || String(e) }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to handle POST', details: error?.message || 'Unknown error' }, { status: 500 });
  }
}

// Note: PUT/DELETE can be added similarly when id is present in slug
