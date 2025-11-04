import { adminDb } from '@/lib/firebase-admin';

export interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
  ownerId?: string;
  type?: string;
  connectionString?: string; // For MongoDB
}

function parseMysqlDsn(dsn: string) {
  try {
    const url = new URL(dsn);
    if (url.protocol !== 'mysql:' && url.protocol !== 'mariadb:') return null;
    const host = url.hostname;
    const port = url.port ? Number(url.port) : 3306;
    const user = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    const database = url.pathname && url.pathname.length > 1 ? decodeURIComponent(url.pathname.slice(1)) : '';
    // common ssl flags
    const sslParam = url.searchParams.get('ssl') || url.searchParams.get('ssl-mode') || url.searchParams.get('sslmode');
    const ssl = sslParam ? (sslParam === 'require' || sslParam === 'REQUIRED' || sslParam === 'true' || sslParam === '1') : undefined;
    return { host, port, user, password, database, ssl };
  } catch {
    return null;
  }
}

/**
 * Resolve a connection's server-side credentials by its ID.
 * Never expose this data to the client. Returns null if not found or incomplete.
 */
export async function getConnectionConfig(connectionId: string): Promise<ConnectionConfig | null> {
  if (!connectionId) return null;

  const snap = await adminDb.collection('database_connections').doc(connectionId).get();
  if (!snap.exists) return null;
  const data = (snap.data() || {}) as any;

  const type = (data.type || data.engine || '').toString().toLowerCase();

  // Normalize possible field names first
  let host = data.host || data.hostname;
  let portRaw = data.port ?? data.dbPort;
  let user = data.user || data.username;
  let password = data.password || data.pass;
  let database = data.database || data.db;
  let ssl = data.ssl === true || data.sslMode === 'require' || data.sslmode === 'require';
  const ownerId = data.ownerId || data.userId;

  // For MySQL/MariaDB, support docs that only stored a connectionString
  if ((!host || !user || !password) && (type === 'mysql' || type === 'mariadb')) {
    const dsn = data.connectionString || data.uri;
    if (typeof dsn === 'string' && dsn.length) {
      const parsed = parseMysqlDsn(dsn);
      if (parsed) {
        host = host || parsed.host;
        portRaw = portRaw ?? parsed.port;
        user = user || parsed.user;
        password = password || parsed.password;
        database = database || parsed.database;
        if (ssl === false || ssl === true) {
          // keep existing explicit ssl
        } else if (parsed.ssl !== undefined) {
          ssl = parsed.ssl;
        }
      }
    }
  }

  // Default ports by engine
  if (!portRaw) {
    if (type === 'mysql' || type === 'mariadb') portRaw = 3306;
    else portRaw = 5432;
  }

  // For MongoDB, return connectionString directly
  if (type === 'mongodb') {
    const connectionString = data.connectionString;
    if (!connectionString) return null;
    return { 
      connectionString, 
      ownerId, 
      type,
      // Dummy values for compatibility
      host: '', 
      port: 0, 
      user: '', 
      password: '', 
      database: database || ''
    };
  }

  // Validate required fields for SQL databases
  if (!host || !user || !password) return null;

  const port = typeof portRaw === 'string' ? parseInt(portRaw, 10) : Number(portRaw);
  const db = database || (type === 'mysql' || type === 'mariadb' ? '' : 'postgres');

  return { host, port: Number.isFinite(port) ? port : (type === 'mysql' || type === 'mariadb' ? 3306 : 5432), user, password, database: db, ssl, ownerId, type };
}
