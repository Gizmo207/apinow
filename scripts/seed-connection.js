#!/usr/bin/env node
/**
 * Seed Firestore `database_connections/<id>` docs from CLI.
 *
 * Usage (single doc):
 *   node scripts/seed-connection.js \
 *     --id=my-postgres-conn \
 *     --engine=postgresql \
 *     --host=aws-1-us-east-2.pooler.supabase.com \
 *     --port=5432 \
 *     --user=postgres.XXXX \
 *     --password=YOUR_DB_PASSWORD \
 *     --database=postgres \
 *     --ssl=true \
 *     --ownerId=<your-app-user-id>
 *
 * Usage (batch from JSON file):
 *   node scripts/seed-connection.js --file=./connections.json
 *   // connections.json example (array or object map):
 *   [
 *     {
 *       "id": "pg-prod",
 *       "engine": "postgresql",
 *       "host": "aws-1-us-east-2.pooler.supabase.com",
 *       "port": 5432,
 *       "user": "postgres.XXXX",
 *       "password": "...",
 *       "database": "postgres",
 *       "ssl": true,
 *       "ownerId": "<uid>"
 *     },
 *     {
 *       "id": "mysql-test",
 *       "engine": "mysql",
 *       "connectionString": "mysql://user:pass@host:3306/db"
 *     }
 *   ]
 *
 * Requirements:
 *   - FIREBASE_SERVICE_ACCOUNT_KEY must be set in the environment as full JSON.
 *   - Firestore will be accessed with Admin SDK.
 */

const fs = require('fs');
const path = require('path');

// Try to load FIREBASE_SERVICE_ACCOUNT_KEY from .env.local if not present
(function loadEnvLocal() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) return;
  const envPath = path.resolve(process.cwd(), '.env.local');
  try {
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      const match = raw.match(/^[\t ]*FIREBASE_SERVICE_ACCOUNT_KEY=(.*)$/m);
      if (match && match[1]) {
        // The value may already be JSON or may be quoted; trim whitespace
        const val = match[1].trim();
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY = val;
      }
    }
  } catch (e) {
    // ignore
  }
})();

// Lazy init firebase-admin to avoid requiring in environments without the key
let admin, firestore;

function requireAdmin() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY env var is not set. Put your service account JSON into .env.local and re-run.');
  }
  const { initializeApp, cert, getApps } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  let key;
  try {
    key = JSON.parse(keyJson);
  } catch (e) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON.');
  }
  if (!getApps().length) {
    initializeApp({ credential: cert(key) });
  }
  admin = true;
  firestore = getFirestore();
}

function parseArgs(argv) {
  const args = {};
  for (const part of argv.slice(2)) {
    if (!part.startsWith('--')) continue;
    const eq = part.indexOf('=');
    if (eq === -1) {
      args[part.slice(2)] = true;
    } else {
      const k = part.slice(2, eq);
      const v = part.slice(eq + 1);
      args[k] = v;
    }
  }
  return args;
}

function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (v == null) return undefined;
  return String(v).toLowerCase() === 'true';
}

function toNum(v) {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeDoc(input) {
  const engine = input.engine || input.type;
  const base = {
    id: input.id,
    type: engine,
    name: input.name || input.id || engine,
    providerKey: input.providerKey || engine,
    provider: input.provider || engine,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: input.ownerId || input.userId,
    status: input.status || 'connected',
  };

  // For all engines, allow connectionString too (some routes still use it)
  if (input.connectionString) base.connectionString = input.connectionString;

  switch (engine) {
    case 'postgresql':
      return {
        ...base,
        host: input.host,
        port: toNum(input.port) ?? 5432,
        user: input.user || input.username,
        password: input.password || input.pass,
        database: input.database || input.db || 'postgres',
        ssl: toBool(input.ssl) ?? true,
      };
    case 'mysql':
    case 'mariadb':
      return {
        ...base,
        host: input.host,
        port: toNum(input.port) ?? 3306,
        user: input.user || input.username,
        password: input.password || input.pass,
        database: input.database || input.db,
        ssl: toBool(input.ssl),
      };
    case 'mongodb':
      return {
        ...base,
        uri: input.uri || input.connectionString, // preferred for Mongo
        database: input.database || input.db,
      };
    case 'mssql':
      return {
        ...base,
        host: input.host,
        port: toNum(input.port) ?? 1433,
        user: input.user || input.username,
        password: input.password || input.pass,
        database: input.database || input.db,
        options: input.options,
      };
    case 'redis':
      return {
        ...base,
        host: input.host,
        port: toNum(input.port) ?? 6379,
        password: input.password || input.pass,
        db: toNum(input.db) ?? 0,
        tls: toBool(input.tls) ?? toBool(input.ssl),
      };
    case 'sqlite':
      return {
        ...base,
        filePath: input.filePath || input.databaseName || input.database || input.path,
        fileName: input.fileName,
      };
    default:
      return { ...base };
  }
}

async function upsertDoc(doc) {
  if (!doc.id) throw new Error('Missing required field: id');
  if (!doc.type) throw new Error('Missing required field: engine/type');
  await firestore.collection('database_connections').doc(doc.id).set(doc, { merge: true });
  return doc.id;
}

async function run() {
  const args = parseArgs(process.argv);

  if (args.file) {
    requireAdmin();
    const filePath = path.resolve(process.cwd(), args.file);
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
    const raw = fs.readFileSync(filePath, 'utf8');
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      throw new Error('Invalid JSON in file.');
    }
    const list = Array.isArray(data) ? data : Object.values(data);
    const results = [];
    for (const item of list) {
      const doc = normalizeDoc(item);
      const id = await upsertDoc(doc);
      results.push(id);
    }
    console.log(`Upserted ${results.length} connection document(s):`, results);
    return;
  }

  // Single-doc mode from flags
  const engine = args.engine || args.type;
  if (!args.id || !engine) {
    console.log('Missing required flags. Example:');
    console.log('  node scripts/seed-connection.js --id=my-postgres --engine=postgresql --host=aws-1-us-east-2.pooler.supabase.com --port=5432 --user=postgres.XXXX --password=*** --database=postgres --ssl=true');
    process.exit(1);
  }

  requireAdmin();
  const input = { ...args };
  input.ssl = toBool(args.ssl);
  input.tls = toBool(args.tls);
  input.port = toNum(args.port);
  input.db = toNum(args.db);
  const doc = normalizeDoc(input);
  await upsertDoc(doc);
  console.log('Upserted connection document:', doc.id);
}

run().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
