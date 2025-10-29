import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

// Helper to find the most recent database file
function getLatestDbFile(): string | null {
  const uploadsDir = join(process.cwd(), 'uploads');
  
  if (!existsSync(uploadsDir)) {
    return null;
  }
  
  const files = readdirSync(uploadsDir)
    .filter(f => f.endsWith('.db') || f.endsWith('.sqlite') || f.endsWith('.sqlite3'))
    .sort();
  
  if (files.length === 0) {
    return null;
  }
  
  return join(uploadsDir, files[files.length - 1]);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    
    const dbPath = getLatestDbFile();
    if (!dbPath) {
      return NextResponse.json({ 
        error: 'No database found',
        details: 'Please upload a SQLite database first'
      }, { status: 400 });
    }
    
    const db = new Database(dbPath, { readonly: true });
    const rows = db.prepare(`SELECT * FROM ${table}`).all();
    db.close();
    
    return NextResponse.json({ data: rows, count: rows.length });
  } catch (error: any) {
    console.error('[API /data] Error:', error.message);
    return NextResponse.json({ 
      error: 'Database error', 
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    const body = await request.json();
    
    const dbPath = getLatestDbFile();
    if (!dbPath) {
      return NextResponse.json({ 
        error: 'No database found',
        details: 'Please upload a SQLite database first'
      }, { status: 400 });
    }
    
    const db = new Database(dbPath, { readonly: false });
    
    const columns = Object.keys(body);
    const values = Object.values(body);
    const placeholders = columns.map(() => '?').join(', ');
    
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = db.prepare(query).run(...values);
    
    db.close();
    
    return NextResponse.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: 'Record created successfully' 
    });
  } catch (error: any) {
    console.error('[API /data] Error:', error.message);
    return NextResponse.json({ 
      error: 'Database error', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID parameter required' }, { status: 400 });
    }
    
    const dbPath = getLatestDbFile();
    if (!dbPath) {
      return NextResponse.json({ 
        error: 'No database found',
        details: 'Please upload a SQLite database first'
      }, { status: 400 });
    }
    
    const db = new Database(dbPath, { readonly: false });
    
    const updates = Object.keys(body).map(col => `${col} = ?`).join(', ');
    const values = [...Object.values(body), id];
    
    const query = `UPDATE ${table} SET ${updates} WHERE id = ?`;
    const result = db.prepare(query).run(...values);
    
    db.close();
    
    return NextResponse.json({ 
      success: true, 
      changes: result.changes,
      message: 'Record updated successfully' 
    });
  } catch (error: any) {
    console.error('[API /data] Error:', error.message);
    return NextResponse.json({ 
      error: 'Database error', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID parameter required' }, { status: 400 });
    }
    
    const dbPath = getLatestDbFile();
    if (!dbPath) {
      return NextResponse.json({ 
        error: 'No database found',
        details: 'Please upload a SQLite database first'
      }, { status: 400 });
    }
    
    const db = new Database(dbPath, { readonly: false });
    
    const query = `DELETE FROM ${table} WHERE id = ?`;
    const result = db.prepare(query).run(id);
    
    db.close();
    
    return NextResponse.json({ 
      success: true, 
      changes: result.changes,
      message: 'Record deleted successfully' 
    });
  } catch (error: any) {
    console.error('[API /data] Error:', error.message);
    return NextResponse.json({ 
      error: 'Database error', 
      details: error.message 
    }, { status: 500 });
  }
}
