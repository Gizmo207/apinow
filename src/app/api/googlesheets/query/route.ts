import { NextRequest, NextResponse } from 'next/server';
import { extractSheetId, getSheetMetadata, getSheetData, sheetDataToJSON, appendRows, updateRows, deleteRows, jsonToSheetRow } from '@/lib/googleSheets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    
    // Get sheet metadata to find first sheet name
    const metadata = await getSheetMetadata(sheetId);
    const sheets = metadata.sheets || [];
    const firstSheetName = sheets[0]?.properties?.title || 'Sheet1';
    
    // Fetch and parse sheet data using service account
    const rawData = await getSheetData(sheetId, firstSheetName);
    const data = sheetDataToJSON(rawData);
    
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
