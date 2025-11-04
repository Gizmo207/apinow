import { NextRequest, NextResponse } from 'next/server';
import { extractSheetId, getSheetMetadata, getSheetData, sheetDataToJSON } from '@/lib/googleSheets';

export const runtime = 'nodejs';

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
    
    // Try to fetch sheet metadata and data using service account
    const metadata = await getSheetMetadata(sheetId);
    const sheets = metadata.sheets || [];
    const firstSheetName = sheets[0]?.properties?.title || 'Sheet1';
    
    // Get data from first sheet
    const data = await getSheetData(sheetId, firstSheetName);
    const headers = data[0] || [];
    const rowCount = data.length - 1;
    
    console.log('[Google Sheets Connect] Connection successful:', {
      sheetId,
      sheetName: firstSheetName,
      columns: headers.length,
      rows: rowCount
    });
    
    return NextResponse.json({
      success: true,
      message: `Connected successfully! Found ${headers.length} columns and ${rowCount} rows`,
      sheetId,
      sheetName: firstSheetName,
      schema: {
        columns: headers,
        rowCount
      },
    });
    
  } catch (error: any) {
    console.error('[Google Sheets Connect] Error:', error.message);
    
    let errorMessage = 'Failed to connect to Google Sheets';
    let helpText = '';
    
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      errorMessage = 'Sheet not found';
      helpText = 'Double-check the URL and make sure the sheet exists';
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      errorMessage = 'Permission denied - Service account not shared';
      helpText = 'Share your Google Sheet with: firebase-adminsdk-fbsvc@api-now-bd858.iam.gserviceaccount.com (Editor permission)';
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
