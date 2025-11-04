import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Helper to extract sheet ID from URL
function extractSheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// Helper to fetch sheet data as CSV
async function fetchSheetData(sheetId: string): Promise<string> {
  // Use Google's CSV export endpoint (works for public sheets)
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  
  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.statusText}`);
  }
  
  return await response.text();
}

// Parse CSV to get schema info
function parseCSVSchema(csv: string) {
  const lines = csv.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    throw new Error('Empty sheet');
  }
  
  // First line is headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  return {
    columns: headers,
    rowCount: lines.length - 1
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionString } = body;
    
    if (!connectionString) {
      return NextResponse.json(
        { error: 'Missing sheet URL or ID' },
        { status: 400 }
      );
    }
    
    console.log('[Google Sheets Connect] Testing connection to sheet:', connectionString);
    
    // Extract sheet ID
    let sheetId = connectionString;
    if (connectionString.includes('docs.google.com')) {
      const extracted = extractSheetId(connectionString);
      if (!extracted) {
        return NextResponse.json(
          { error: 'Invalid Google Sheets URL' },
          { status: 400 }
        );
      }
      sheetId = extracted;
    }
    
    // Try to fetch the sheet
    const csvData = await fetchSheetData(sheetId);
    const schema = parseCSVSchema(csvData);
    
    console.log('[Google Sheets Connect] Connection successful:', {
      sheetId,
      columns: schema.columns.length,
      rows: schema.rowCount
    });
    
    return NextResponse.json({
      success: true,
      message: `Connected successfully! Found ${schema.columns.length} columns and ${schema.rowCount} rows`,
      sheetId,
      schema,
    });
    
  } catch (error: any) {
    console.error('[Google Sheets Connect] Error:', error.message);
    
    let errorMessage = 'Failed to connect to Google Sheets';
    let helpText = '';
    
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      errorMessage = 'Sheet not found or not accessible';
      helpText = 'Make sure the sheet is set to "Anyone with the link can view"';
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      errorMessage = 'Permission denied';
      helpText = 'Sheet must be publicly accessible. Go to Share → Get link → Anyone with the link can view';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.message,
        help: helpText
      },
      { status: 500 }
    );
  }
}
