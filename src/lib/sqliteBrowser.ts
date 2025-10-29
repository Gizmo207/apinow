// Browser-side SQLite storage - files stay in browser, queries go to server

// Store SQLite file in IndexedDB (browser storage)
export async function storeSQLiteFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
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
      
      store.put({ data: uint8Array, name: file.name, createdAt: new Date().toISOString() }, dbId);
      
      transaction.oncomplete = () => {
        db.close();
        resolve(dbId);
      };
      
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

// Get database file data from IndexedDB
export async function getDatabaseFile(dbId: string): Promise<Uint8Array | null> {
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
        resolve(getRequest.result ? getRequest.result.data : null);
      };
      
      getRequest.onerror = () => {
        db.close();
        reject(getRequest.error);
      };
    };
  });
}

// Query SQLite - sends file to server for processing
export async function querySQLite(dbId: string, query: string) {
  const dbData = await getDatabaseFile(dbId);
  if (!dbData) throw new Error('Database not found');
  
  // Convert to base64 for transmission
  const base64 = btoa(String.fromCharCode(...dbData));
  
  const response = await fetch('/api/sqlite/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileData: base64, query })
  });
  
  if (!response.ok) throw new Error('Query failed');
  
  const result = await response.json();
  return result.rows || result.data || [];
}

// Get schema - sends file to server for processing  
export async function getSQLiteSchema(dbId: string) {
  const dbData = await getDatabaseFile(dbId);
  if (!dbData) throw new Error('Database not found');
  
  // Convert to base64 for transmission
  const base64 = btoa(String.fromCharCode(...dbData));
  
  const response = await fetch('/api/sqlite/introspect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileData: base64 })
  });
  
  if (!response.ok) throw new Error('Failed to load schema');
  
  return await response.json();
}
