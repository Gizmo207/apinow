import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Helper to fetch sheet data as CSV
async function fetchSheetData(sheetId: string): Promise<string> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  
  const response = await fetch(csvUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.statusText}`);
  }
  
  return await response.text();
}

// Get schema from CSV
function getSchemaFromCSV(csv: string) {
  const lines = csv.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return { tables: [], schema: {} };
  }
  
  // First line is headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  // Google Sheets appears as a single "table" with the sheet name
  // For simplicity, we'll call it "Sheet1" or use the actual sheet name if available
  const tableName = 'data'; // Default table name for the sheet
  
  const columns = headers.map(header => ({
    name: header || 'column',
    type: 'TEXT', // Google Sheets are all text by default
    nullable: true,
    primaryKey: false
  }));
  
  return {
    tables: [tableName],
    schema: {
      [tableName]: columns
    }
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionString, connectionId } = body;
    
    let sheetId = connectionString;
    
    // If connectionId is provided, fetch from stored connections
    if (connectionId) {
      const authUserRaw = request.headers.get('x-user-id');
      if (!authUserRaw) {
        return NextResponse.json(
          { error: 'User ID required for stored connections' },
          { status: 401 }
        );
      }
      
      // Fetch connection from storage
      const connectionsRes = await fetch(`${request.nextUrl.origin}/api/connections?userId=${authUserRaw}`);
      if (connectionsRes.ok) {
        const connections = await connectionsRes.json();
        const connection = connections.find((c: any) => c.id === connectionId);
        if (connection) {
          sheetId = connection.connectionString;
        }
      }
    }
    
    if (!sheetId) {
      return NextResponse.json(
        { error: 'Missing sheet ID or connection' },
        { status: 400 }
      );
    }
    
    console.log('[Google Sheets Introspect] Getting schema for sheet:', sheetId);
    
    // Fetch and parse sheet data
    const csvData = await fetchSheetData(sheetId);
    const schema = getSchemaFromCSV(csvData);
    
    console.log('[Google Sheets Introspect] Found tables:', schema.tables);
    
    return NextResponse.json(schema);
    
  } catch (error: any) {
    console.error('[Google Sheets Introspect] Error:', error.message);
    
    return NextResponse.json(
      { 
        error: 'Failed to introspect Google Sheets',
        details: error.message
      },
      { status: 500 }
    );
  }
}
