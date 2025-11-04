import { ProviderConfig } from './types';

export const GOOGLESHEETS_PROVIDERS: ProviderConfig[] = [
  {
    key: 'googlesheets-service',
    engine: 'googlesheets',
    name: 'Google Sheets (Full CRUD)',
    helpSteps: [
      '📊 STEP 1: Open your Google Sheet',
      '🔗 STEP 2: Click the "Share" button (top right)',
      '✍️ STEP 3: Add this email as Editor:',
      '   firebase-adminsdk-fbsvc@api-now-bd858.iam.gserviceaccount.com',
      '',
      '⚠️ IMPORTANT: Give "Editor" permission (not just Viewer)',
      '',
      '📋 STEP 4: Copy your Google Sheets URL and paste below',
      '',
      '✅ You\'ll get FULL CRUD operations:',
      '   • GET - Read all data',
      '   • POST - Insert new rows',
      '   • PUT - Update existing rows',
      '   • DELETE - Remove rows',
      '',
      '🔒 Security: Only YOUR account can access this connection',
    ],
    fields: [
      {
        name: 'sheetUrl',
        label: 'Google Sheets URL',
        type: 'text',
        required: true,
        placeholder: 'https://docs.google.com/spreadsheets/d/SHEET_ID/edit',
        helpText: 'Paste your Google Sheets URL (must be publicly accessible)',
        pattern: /^https:\/\/docs\.google\.com\/spreadsheets\//,
        validate: (value: string) => {
          if (!value.includes('docs.google.com/spreadsheets/')) {
            return 'Please enter a valid Google Sheets URL';
          }
          return true;
        },
      },
    ],
    normalize: (values: Record<string, any>) => {
      // Extract Sheet ID from URL
      const urlMatch = values.sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const sheetId = urlMatch ? urlMatch[1] : '';
      
      return {
        connectionString: sheetId, // Store just the ID
        extras: {
          fullUrl: values.sheetUrl,
        }
      };
    },
  },
];
