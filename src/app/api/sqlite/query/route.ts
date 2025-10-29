import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { filePath, query } = await request.json();
    
    if (!filePath || !query) {
      return NextResponse.json({ error: 'File path and query required' }, { status: 400 });
    }

    const Database = require('better-sqlite3');
    const db = new Database(filePath, { readonly: true });

    const rows = db.prepare(query).all();
    db.close();

    return NextResponse.json({ rows });
  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json(
      { error: 'Query failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
