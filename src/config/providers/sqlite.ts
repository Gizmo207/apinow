import { ProviderConfig } from './types';

export const SQLITE_PROVIDERS: ProviderConfig[] = [
  {
    key: 'sqlite-browser',
    engine: 'sqlite',
    name: 'Browser Storage (Upload File)',
    helpSteps: [
      'Upload an existing .db/.sqlite/.sqlite3 file',
      'File is stored securely in your browser (IndexedDB)',
      'Data persists across sessions',
      'Each user has their own private database',
      'No server storage required - works on any hosting!',
    ],
    fields: [
      {
        name: 'file',
        label: 'SQLite Database File',
        type: 'file',
        required: true,
        accept: '.db,.sqlite,.sqlite3',
        helpText: 'Upload your .db, .sqlite, or .sqlite3 file',
      },
    ],
  },
];
