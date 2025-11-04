import { NextRequest, NextResponse } from 'next/server';
import { extractSheetId, getSheetMetadata, getSheetData } from '@/lib/googleSheets';

export const runtime = 'nodejs';

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
    
    // Fetch sheet metadata and data using service account
    const metadata = await getSheetMetadata(sheetId);
    const sheets = metadata.sheets || [];
    
    // Get data from first sheet to extract headers
    const firstSheetName = sheets[0]?.properties?.title || 'Sheet1';
    const data = await getSheetData(sheetId, firstSheetName);
    const headers = data[0] || [];
    
    // Create schema in expected format
    const tableName = firstSheetName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const columns = headers.map((header: string) => ({
      name: header || 'column',
      type: 'TEXT',
      nullable: true,
      primaryKey: false
    }));
    
    const schema = {
      tables: [tableName],
      schema: {
        [tableName]: columns
      }
    };
    
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
