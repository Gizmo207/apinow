import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json();
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 });
    }

    const Database = require('better-sqlite3');
    const db = new Database(filePath, { readonly: true });

    // Get tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();

    const schema = tables.map((table: any) => {
      const tableName = table.name;
      
      // Get columns
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
      
      // Get row count
      const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as any;
      
      // Get foreign keys
      const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${tableName})`).all();
      const fkMap: Record<string, string> = {};
      foreignKeys.forEach((fk: any) => {
        fkMap[fk.from] = `${fk.table}.${fk.to}`;
      });

      return {
        name: tableName,
        rowCount: countResult.count,
        columns: columns.map((col: any) => ({
          name: col.name,
          type: col.type,
          nullable: col.notnull === 0,
          primaryKey: col.pk === 1,
          foreignKey: fkMap[col.name]
        }))
      };
    });

    db.close();

    return NextResponse.json({ tables: schema });
  } catch (error) {
    console.error('Introspect error:', error);
    return NextResponse.json(
      { error: 'Failed to introspect database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
