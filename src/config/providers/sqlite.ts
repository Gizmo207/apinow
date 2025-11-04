import { ProviderConfig } from './types';

export const SQLITE_PROVIDERS: ProviderConfig[] = [
  {
    key: 'sqlite-browser',
    engine: 'sqlite',
    name: 'SQLite (Upload File)',
    helpSteps: [
      '📁 Upload an existing .db/.sqlite/.sqlite3 file',
      '🔒 File is stored securely on the server (Vercel Blob)',
      '📖 Production Mode: READ-ONLY (standard SQLite behavior)',
      '✏️ Local Dev: Full CRUD available in browser',
      '✅ Perfect for: Data exports, analytics, reference data',
      '',
      'ℹ️ Why Read-Only?',
      'SQLite is designed for local use. In production environments (Vercel, AWS, etc.), SQLite files on blob storage are read-only by design. This is industry standard and prevents concurrency issues.',
      '',
      'Need write operations? Use PostgreSQL, MySQL, or MongoDB instead.',
    ],
    fields: [
      {
        name: 'file',
        label: 'SQLite Database File',
        type: 'file',
        required: true,
        accept: '.db,.sqlite,.sqlite3',
        helpText: 'Upload your .db, .sqlite, or .sqlite3 file (READ-ONLY in production)',
      },
    ],
  },
];
