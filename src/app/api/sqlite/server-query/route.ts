import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let tempDbPath: string | null = null;

  try {
    const { blobUrl, query } = await request.json();

    if (!blobUrl || !query) {
      return NextResponse.json(
        { error: 'Missing blobUrl or query' },
        { status: 400 }
      );
    }

    console.log('[SQLite Server Query] Fetching blob:', blobUrl);

    // Download the SQLite database from blob storage
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create temporary file
    const tempFileName = `sqlite_${Date.now()}_${Math.random().toString(36).substring(7)}.db`;
    tempDbPath = join(tmpdir(), tempFileName);
    
    console.log('[SQLite Server Query] Writing to temp file:', tempDbPath);
    await writeFile(tempDbPath, buffer);

    // Open database and execute query
    const db = new Database(tempDbPath, { readonly: true });
    
    try {
      console.log('[SQLite Server Query] Executing query:', query);
      const stmt = db.prepare(query);
      const rows = stmt.all();
      
      console.log('[SQLite Server Query] Query successful, returned', rows.length, 'rows');
      
      db.close();

      return NextResponse.json({
        success: true,
        data: rows,
        count: rows.length,
      });
    } catch (queryError: any) {
      db.close();
      throw queryError;
    }
  } catch (error: any) {
    console.error('[SQLite Server Query] Error:', error.message);
    return NextResponse.json(
      {
        error: 'Query failed',
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    // Clean up temporary file
    if (tempDbPath) {
      try {
        await unlink(tempDbPath);
        console.log('[SQLite Server Query] Cleaned up temp file');
      } catch (cleanupError) {
        console.error('[SQLite Server Query] Failed to clean up temp file:', cleanupError);
      }
    }
  }
}
