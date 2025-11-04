import { google } from 'googleapis';
import { adminDb } from './firebase-admin';

// Initialize Google Sheets API with service account
function getGoogleSheetsClient() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    throw new Error('Firebase service account key not configured');
  }
  
  const credentials = JSON.parse(serviceAccountKey);
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  
  return google.sheets({ version: 'v4', auth });
}

// Extract Sheet ID from URL
export function extractSheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// Get all data from sheet
export async function getSheetData(sheetId: string, range: string = 'Sheet1') {
  const sheets = getGoogleSheetsClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });
  
  return response.data.values || [];
}

// Get sheet metadata (to find sheet names)
export async function getSheetMetadata(sheetId: string) {
  const sheets = getGoogleSheetsClient();
  
  const response = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
  });
  
  return response.data;
}

// Append rows to sheet
export async function appendRows(sheetId: string, range: string, values: any[][]) {
  const sheets = getGoogleSheetsClient();
  
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  });
  
  return response.data;
}

// Update specific rows
export async function updateRows(sheetId: string, range: string, values: any[][]) {
  const sheets = getGoogleSheetsClient();
  
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  });
  
  return response.data;
}

// Delete rows (by clearing them)
export async function deleteRows(sheetId: string, range: string) {
  const sheets = getGoogleSheetsClient();
  
  const response = await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range,
  });
  
  return response.data;
}

// Convert sheet data to JSON format
export function sheetDataToJSON(data: any[][]): any[] {
  if (data.length === 0) return [];
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map((row, index) => {
    const obj: any = { _rowIndex: index + 2 }; // Row index in sheet (1-indexed, +1 for header)
    headers.forEach((header, i) => {
      obj[header] = row[i] || '';
    });
    return obj;
  });
}

// Convert JSON object to sheet row
export function jsonToSheetRow(obj: any, headers: string[]): any[] {
  return headers.map(header => obj[header] || '');
}
