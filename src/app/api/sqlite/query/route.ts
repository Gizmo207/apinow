import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  
  try {
    const { filePath, fileData, query } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }
    
    // Handle both old filePath and new fileData approach
    let dbPath: string;
    
    if (fileData) {
      // New approach: receive base64 file data
      const buffer = Buffer.from(fileData, 'base64');
      tempFilePath = join(tmpdir(), `temp_${Date.now()}.db`);
      writeFileSync(tempFilePath, buffer);
      dbPath = tempFilePath;
    } else if (filePath) {
      // Old approach: file path (localhost only)
      dbPath = filePath;
    } else {
      return NextResponse.json({ error: 'No file data provided' }, { status: 400 });
    }

    const db = new Database(dbPath, { readonly: true });
    
    const result = db.prepare(query).all();
    
    db.close();
    
    // Clean up temp file
    if (tempFilePath) {
      try { unlinkSync(tempFilePath); } catch {}
    }
    
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('SQLite query error:', error);
    
    // Clean up temp file on error
    if (tempFilePath) {
      try { unlinkSync(tempFilePath); } catch {}
    }
    
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}
