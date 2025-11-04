import { ProviderConfig } from './types';

export const GOOGLESHEETS_PROVIDERS: ProviderConfig[] = [
  {
    key: 'googlesheets-public',
    engine: 'googlesheets',
    name: 'Google Sheets (Public URL)',
    helpSteps: [
      '📊 Share your Google Sheet as "Anyone with the link can view"',
      '🔗 Copy the full Google Sheets URL',
      '✅ Paste the URL below',
      '',
      '📖 Mode: READ-ONLY (standard for shared sheets)',
      '✏️ Perfect for: Dynamic content, pricing tables, product catalogs',
      '',
      '💡 How to get the URL:',
      '1. Open your Google Sheet',
      '2. Click Share → Get link',
      '3. Set to "Anyone with the link can view"',
      '4. Copy the full URL',
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
