// Client-side SQLite using sql.js (runs in browser)
import initSqlJs, { Database } from 'sql.js';

let SQL: any = null;

// Initialize sql.js
async function initSQL() {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });
  }
  return SQL;
}

// Store SQLite database in IndexedDB
export async function storeSQLiteFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Store in IndexedDB
  const dbId = `sqlite_${Date.now()}_${file.name}`;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SQLiteDatabases', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('databases')) {
        db.createObjectStore('databases');
      }
    };
    
    request.onsuccess = (event: any) => {
      const db = event.target.result;
      const transaction = db.transaction(['databases'], 'readwrite');
      const store = transaction.objectStore('databases');
      
      store.put({
        data: uint8Array,
        name: file.name,
        createdAt: new Date().toISOString()
      }, dbId);
      
      transaction.oncomplete = () => {
        db.close();
        resolve(dbId);
      };
      
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

// Get SQLite database from IndexedDB
export async function getSQLiteDatabase(dbId: string): Promise<Database | null> {
  await initSQL();
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SQLiteDatabases', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = (event: any) => {
      const db = event.target.result;
      const transaction = db.transaction(['databases'], 'readonly');
      const store = transaction.objectStore('databases');
      const getRequest = store.get(dbId);
      
      getRequest.onsuccess = () => {
        db.close();
        if (getRequest.result) {
          const database = new SQL.Database(getRequest.result.data);
          resolve(database);
        } else {
          resolve(null);
        }
      };
      
      getRequest.onerror = () => {
        db.close();
        reject(getRequest.error);
      };
    };
  });
}

// Get schema from SQLite database
export async function getSQLiteSchema(dbId: string) {
  const db = await getSQLiteDatabase(dbId);
  if (!db) throw new Error('Database not found');
  
  // Get all tables
  const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  const tables = tablesResult[0]?.values.map((row: any) => row[0]) || [];
  
  // Get schema for each table
  const schema: any = {};
  for (const tableName of tables) {
    const columnsResult = db.exec(`PRAGMA table_info(${tableName})`);
    schema[tableName] = columnsResult[0]?.values.map((col: any) => ({
      name: col[1],
      type: col[2],
      nullable: col[3] === 0,
      primaryKey: col[5] === 1
    })) || [];
  }
  
  db.close();
  
  return { tables, schema };
}

// Execute query on SQLite database
export async function querySQLite(dbId: string, query: string) {
  const db = await getSQLiteDatabase(dbId);
  if (!db) throw new Error('Database not found');
  
  const result = db.exec(query);
  db.close();
  
  if (result.length === 0) return [];
  
  // Convert to array of objects
  const columns = result[0].columns;
  const rows = result[0].values.map((row: any) => {
    const obj: any = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return obj;
  });
  
  return rows;
}
