import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  
  try {
    const { filePath, fileData, blobUrl } = await request.json();
    
    // Handle three approaches: blobUrl (server-stored), fileData (browser-uploaded), filePath (localhost)
    let dbPath: string;
    
    if (blobUrl) {
      // Server-stored approach: fetch from Vercel Blob
      console.log('[SQLite Introspect] Fetching from blob:', blobUrl);
      const response = await fetch(blobUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch blob: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      tempFilePath = join(tmpdir(), `blob_${Date.now()}.db`);
      writeFileSync(tempFilePath, buffer);
      dbPath = tempFilePath;
      console.log('[SQLite Introspect] Downloaded blob to temp file');
    } else if (fileData) {
      // Browser approach: receive base64 file data
      const buffer = Buffer.from(fileData, 'base64');
      tempFilePath = join(tmpdir(), `temp_${Date.now()}.db`);
      writeFileSync(tempFilePath, buffer);
      dbPath = tempFilePath;
    } else if (filePath) {
      // Old approach: file path (localhost only)
      dbPath = filePath;
    } else {
      return NextResponse.json({ error: 'No file data provided (need blobUrl, fileData, or filePath)' }, { status: 400 });
    }

    const db = new Database(dbPath, { readonly: true });
    
    // Get tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();

    const tableNames = tables.map((t: any) => t.name);
    const schema: any = {};
    
    tableNames.forEach((tableName: string) => {
      // Get columns
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
      
      schema[tableName] = columns.map((col: any) => ({
        name: col.name,
        type: col.type,
        nullable: col.notnull === 0,
        primaryKey: col.pk === 1
      }));
    });

    db.close();
    
    // Clean up temp file
    if (tempFilePath) {
      try { unlinkSync(tempFilePath); } catch {}
    }

    return NextResponse.json({ tables: tableNames, schema });
  } catch (error) {
    console.error('Introspect error:', error);
    
    // Clean up temp file on error
    if (tempFilePath) {
      try { unlinkSync(tempFilePath); } catch {}
    }
    
    return NextResponse.json(
      { error: 'Failed to introspect database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
