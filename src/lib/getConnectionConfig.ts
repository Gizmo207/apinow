import { adminDb } from '@/lib/firebase-admin';

export interface PostgresConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
  ownerId?: string;
}

/**
 * Resolve a connection's server-side credentials by its ID.
 * Never expose this data to the client. Returns null if not found or incomplete.
 */
export async function getConnectionConfig(connectionId: string): Promise<PostgresConnectionConfig | null> {
  if (!connectionId) return null;

  // Using Firebase Admin Firestore; throws if admin not initialized
  const snap = await adminDb.collection('database_connections').doc(connectionId).get();
  if (!snap.exists) return null;
  const data = snap.data() || ({} as any);

  // Normalize possible field names
  const host = data.host || data.hostname;
  const portRaw = data.port ?? data.dbPort ?? 5432;
  const user = data.user || data.username;
  const password = data.password || data.pass;
  const database = data.database || data.db || 'postgres';
  const ssl = data.ssl === true || data.sslMode === 'require' || data.sslmode === 'require';
  const ownerId = data.ownerId || data.userId;

  // Validate required fields
  if (!host || !user || !password) return null;

  const port = typeof portRaw === 'string' ? parseInt(portRaw, 10) : Number(portRaw);

  return { host, port: Number.isFinite(port) ? port : 5432, user, password, database, ssl, ownerId };
}
