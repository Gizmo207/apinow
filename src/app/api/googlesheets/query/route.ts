import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper to fetch sheet data as CSV
async function fetchSheetData(sheetId: string): Promise<string> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  
  const response = await fetch(csvUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.statusText}`);
  }
  
  return await response.text();
}

// Parse CSV to JSON
function parseCSVToJSON(csv: string): any[] {
  const lines = csv.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return [];
  }
  
  // First line is headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  // Parse data rows
  const data: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    data.push(row);
  }
  
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionString, connectionId, query } = body;
    
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
    
    console.log('[Google Sheets Query] Fetching data from sheet:', sheetId);
    
    // Fetch and parse sheet data
    const csvData = await fetchSheetData(sheetId);
    let data = parseCSVToJSON(csvData);
    
    // If a custom query is provided, filter the data
    // For now, we'll support simple filtering later
    // Just return all data for GET requests
    
    console.log('[Google Sheets Query] Returned', data.length, 'rows');
    
    return NextResponse.json({
      success: true,
      data,
      count: data.length,
    });
    
  } catch (error: any) {
    console.error('[Google Sheets Query] Error:', error.message);
    
    return NextResponse.json(
      { 
        error: 'Failed to query Google Sheets',
        details: error.message
      },
      { status: 500 }
    );
  }
}
