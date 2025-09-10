import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';
import FirebaseAuthService from '../lib/firebaseAuth';
// Removed automatic Firebase import to prevent connection errors

export interface DatabaseConnection {
  id: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'csv' | 'firebase';
  host?: string;
  port?: string;
  database?: string;
  username?: string;
  password?: string;
  // Firebase specific fields
  projectId?: string;
  apiKey?: string;
  authDomain?: string;
  status: 'connected' | 'disconnected' | 'error';
  tables: DatabaseTable[];
  createdAt: string;
}

export interface DatabaseTable {
  id: string;
  name: string;
  rowCount: number;
  columns: DatabaseColumn[];
  meta?: {
    permissionDenied?: boolean;
    source?: string;
  };
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey?: string;
}

// Shared list of commonly expected Firestore collections. Can be extended by UI helper.
export const FIREBASE_KNOWN_COLLECTIONS = [
  'mail', 'licenses', 'payments', 'users', 'public',
  // Domain-specific (learning / media) collections your users may have
  'classes', 'recordings', 'transcripts', 'studyPlans', 'notes', 'lectures'
];

export class DatabaseManager {
  private connections: Map<string, any> = new Map();
  private static instance: DatabaseManager;
  private additionalFirestoreCollections: Set<string> = new Set();

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Allow UI to register additional Firestore collection names to probe.
   */
  setAdditionalFirestoreCollections(cols: string[]) {
    cols.filter(Boolean).forEach(c => this.additionalFirestoreCollections.add(c.trim()))
  }

  async testConnection(config: Omit<DatabaseConnection, 'id' | 'status' | 'tables' | 'createdAt'>): Promise<{ success: boolean; message: string }> {
    try {
      switch (config.type) {
        case 'sqlite':
          return await this.testSQLiteConnection(config);
        case 'postgresql':
        case 'mysql':
          return await this.testRemoteConnection(config);
        case 'csv':
          return { success: true, message: 'CSV connection ready' };
        case 'firebase':
          return await this.testFirebaseConnection(config);
        default:
          return { success: false, message: 'Unsupported database type' };
      }
    } catch (error) {
      console.error('Database connection test failed:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  }

  private async testSQLiteConnection(config: any): Promise<{ success: boolean; message: string }> {
    try {
      // Create an in-memory SQLite database for demo purposes
      const Database = (await import('better-sqlite3')).default;
      const db = new Database(':memory:');
      
      // Create sample tables with realistic data
      this.createSampleTables(db);
      
      // Store the connection
      this.connections.set(config.name, db);
      
      return { 
        success: true, 
        message: 'SQLite database connected successfully with sample data' 
      };
    } catch (error) {
      console.error('SQLite connection failed:', error);
      return { 
        success: false, 
        message: `SQLite connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private createSampleTables(db: any) {
    // Users table
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      )
    `);

    // Products table
    db.exec(`
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category_id INTEGER,
        stock_quantity INTEGER DEFAULT 0,
        sku TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      )
    `);

    // Categories table
    db.exec(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        parent_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id)
      )
    `);

    // Orders table
    db.exec(`
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'pending',
        shipping_address TEXT,
        billing_address TEXT,
        order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        shipped_date DATETIME,
        delivered_date DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Order Items table
    db.exec(`
      CREATE TABLE order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Insert sample data
    this.insertSampleData(db);
  }

  private insertSampleData(db: any) {
    // Insert categories
    const insertCategory = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
    insertCategory.run('Electronics', 'Electronic devices and accessories');
    insertCategory.run('Clothing', 'Apparel and fashion items');
    insertCategory.run('Books', 'Books and educational materials');
    insertCategory.run('Home & Garden', 'Home improvement and gardening supplies');

    // Insert users
    const insertUser = db.prepare(`
      INSERT INTO users (first_name, last_name, email, phone, is_active) 
      VALUES (?, ?, ?, ?, ?)
    `);
    insertUser.run('John', 'Doe', 'john.doe@example.com', '+1-555-0101', 1);
    insertUser.run('Jane', 'Smith', 'jane.smith@example.com', '+1-555-0102', 1);
    insertUser.run('Bob', 'Johnson', 'bob.johnson@example.com', '+1-555-0103', 1);
    insertUser.run('Alice', 'Williams', 'alice.williams@example.com', '+1-555-0104', 1);
    insertUser.run('Charlie', 'Brown', 'charlie.brown@example.com', '+1-555-0105', 0);

    // Insert products
    const insertProduct = db.prepare(`
      INSERT INTO products (name, description, price, category_id, stock_quantity, sku, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertProduct.run('iPhone 15', 'Latest Apple smartphone', 999.99, 1, 50, 'IPH15-001', 1);
    insertProduct.run('Samsung Galaxy S24', 'Android flagship phone', 899.99, 1, 30, 'SGS24-001', 1);
    insertProduct.run('MacBook Pro', '16-inch laptop with M3 chip', 2499.99, 1, 15, 'MBP16-001', 1);
    insertProduct.run('Nike Air Max', 'Comfortable running shoes', 129.99, 2, 100, 'NAM-001', 1);
    insertProduct.run('Levi\'s Jeans', 'Classic denim jeans', 79.99, 2, 75, 'LJ-001', 1);
    insertProduct.run('JavaScript Guide', 'Complete programming guide', 49.99, 3, 200, 'JSG-001', 1);
    insertProduct.run('Garden Hose', '50ft expandable garden hose', 29.99, 4, 40, 'GH50-001', 1);

    // Insert orders
    const insertOrder = db.prepare(`
      INSERT INTO orders (user_id, total_amount, status, shipping_address, billing_address) 
      VALUES (?, ?, ?, ?, ?)
    `);
    insertOrder.run(1, 1129.98, 'completed', '123 Main St, Anytown, USA', '123 Main St, Anytown, USA');
    insertOrder.run(2, 899.99, 'shipped', '456 Oak Ave, Somewhere, USA', '456 Oak Ave, Somewhere, USA');
    insertOrder.run(3, 159.98, 'pending', '789 Pine Rd, Elsewhere, USA', '789 Pine Rd, Elsewhere, USA');
    insertOrder.run(1, 2499.99, 'processing', '123 Main St, Anytown, USA', '123 Main St, Anytown, USA');

    // Insert order items
    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) 
      VALUES (?, ?, ?, ?, ?)
    `);
    insertOrderItem.run(1, 1, 1, 999.99, 999.99);
    insertOrderItem.run(1, 4, 1, 129.99, 129.99);
    insertOrderItem.run(2, 2, 1, 899.99, 899.99);
    insertOrderItem.run(3, 4, 1, 129.99, 129.99);
    insertOrderItem.run(3, 7, 1, 29.99, 29.99);
    insertOrderItem.run(4, 3, 1, 2499.99, 2499.99);
  }

  private async testRemoteConnection(config: any): Promise<{ success: boolean; message: string }> {
    // For demo purposes, simulate connection validation
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!config.host || !config.database || !config.username) {
          resolve({ 
            success: false, 
            message: 'Missing required connection parameters (host, database, username)' 
          });
          return;
        }

        // Simulate connection success for demo
        resolve({ 
          success: true, 
          message: `Connected to ${config.type.toUpperCase()} database at ${config.host}:${config.port || 'default'}` 
        });
      }, 1500);
    });
  }

  private async testFirebaseConnection(config: any): Promise<{ success: boolean; message: string }> {
    try {
      if (!config.projectId || !config.apiKey) {
        return {
          success: false,
          message: 'Missing required Firebase configuration (projectId, apiKey)'
        };
      }

      // Prevent connection with placeholder values
      if (config.projectId === 'your-project-id' || 
          config.apiKey === 'your-api-key' ||
          config.projectId === 'placeholder-project' ||
          config.apiKey === 'placeholder-key') {
        return {
          success: false,
          message: 'Please enter your actual Firebase credentials (not placeholder values)'
        };
      }

  const firebaseConfig = {
        apiKey: config.apiKey,
        authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
        projectId: config.projectId,
      };

      // Initialize Firebase app
      const app = initializeApp(firebaseConfig, `test-${Date.now()}`);
      const db = getFirestore(app);

      // Attempt a lightweight read from a likely existing collection, but don't fail the whole test if permission denied
      const probeCollections = ['licenses','mail','users'];
      let probeSucceeded = false;
      for (const c of probeCollections) {
        try {
          await getDocs(query(collection(db, c), limit(1)));
          probeSucceeded = true;
          break;
        } catch (_e) {
          // ignore permission errors; we'll still consider init successful
        }
      }

      // Store the Firebase connection under both name and (if provided) id to support different lookup patterns
      if (config.id) {
        this.connections.set(config.id, { app, db, type: 'firebase', projectId: config.projectId });
      }
      this.connections.set(config.name, { app, db, type: 'firebase', projectId: config.projectId });

      return {
        success: true,
        message: `Successfully initialized Firebase project: ${config.projectId}${probeSucceeded ? '' : ' (limited read access)'}.`
      };
    } catch (error) {
      console.error('Firebase connection failed:', error);
      return {
        success: false,
        message: `Firebase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Lazily establish a connection from a saved database configuration object if not already connected.
   * Supports at minimum firebase + sqlite demo reconnection.
   */
  async ensureConnection(config: any): Promise<void> {
    const existing = this.connections.get(config.id) || this.connections.get(config.name);
    if (existing) return;

    if (config.type === 'firebase') {
      // Reuse testFirebaseConnection logic but don't enforce probe success
      await this.testFirebaseConnection(config);
      return;
    }
    if (config.type === 'sqlite') {
      // Recreate sample in-memory DB
      await this.testSQLiteConnection(config);
      // Also map by id if available
      const byName = this.connections.get(config.name);
      if (config.id && byName && !this.connections.get(config.id)) {
        this.connections.set(config.id, byName);
      }
      return;
    }
    // For other types (mysql/postgresql) we currently simulate; skip until real implementation
  }

  async introspectDatabase(connectionId: string): Promise<DatabaseTable[]> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Database connection not found');
    }

    // Handle Firebase connections
    if (connection.type === 'firebase') {
      return this.introspectFirebaseDatabase(connection);
    }

    try {
      const tables: DatabaseTable[] = [];
      
      // Get all tables
      const tablesQuery = connection.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      const tableRows = tablesQuery.all();
      
      for (const tableRow of tableRows) {
        const tableName = tableRow.name;
        
        // Get table info (columns)
        const columnsQuery = connection.prepare(`PRAGMA table_info(${tableName})`);
        const columnRows = columnsQuery.all();
        
        // Get row count
        const countQuery = connection.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
        const countResult = countQuery.get();
        
        // Get foreign key info
        const fkQuery = connection.prepare(`PRAGMA foreign_key_list(${tableName})`);
        const fkRows = fkQuery.all();
        const foreignKeys: Record<string, string> = {};
        
        fkRows.forEach((fk: any) => {
          foreignKeys[fk.from] = `${fk.table}.${fk.to}`;
        });

        const columns: DatabaseColumn[] = columnRows.map((col: any) => ({
          name: col.name,
          type: col.type,
          nullable: col.notnull === 0,
          primaryKey: col.pk === 1,
          foreignKey: foreignKeys[col.name]
        }));

        tables.push({
          id: `table_${tableName}`,
          name: tableName,
          rowCount: countResult?.count || 0,
          columns
        });
      }

      return tables;
    } catch (error) {
      console.error('Database introspection failed:', error);
      throw new Error(`Failed to introspect database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async introspectFirebaseDatabase(connection: any): Promise<DatabaseTable[]> {
    try {
      // Validate Firebase connection has required properties
      if (!connection.db || !connection.projectId || connection.projectId === 'placeholder-project-id') {
        throw new Error('Invalid Firebase configuration - missing required credentials');
      }

      // For connection-specific Firebase instances, we'll use the connection's auth instead of global auth
      // The connection already has the API key from when the user connected
      const { db, app } = connection;
      
      // Get auth instance for this specific connection
      try {
        const { getAuth, signInAnonymously } = await import('firebase/auth');
        const auth = getAuth(app);
        
        // Check if already signed in
        if (!auth.currentUser) {
          console.log('Signing in anonymously for Firestore access...');
          await signInAnonymously(auth);
          console.log('Anonymous sign-in successful');
        }
      } catch (authError) {
        console.warn('Anonymous auth failed, proceeding without auth:', authError);
        // Continue without auth - some rules might still allow access
      }

      const tables: DatabaseTable[] = [];

      // Merge base + additional user-provided collections
      const knownCollections = Array.from(new Set([
        ...FIREBASE_KNOWN_COLLECTIONS,
        ...this.additionalFirestoreCollections
      ]));

  const permissionDenied: string[] = [];
  for (const collectionName of knownCollections) {
        try {
          // Try to get documents from this collection
          const snapshot = await getDocs(query(collection(db, collectionName), limit(5)));
          
          if (!snapshot.empty) {
            console.log(`Found collection: ${collectionName} with ${snapshot.size} documents`);
            // Collection exists and has documents
            
            // Analyze document structure from first document
            const firstDoc = snapshot.docs[0];
            const sampleData = firstDoc.data();
            
            console.log(`Sample data from ${collectionName}:`, sampleData);
            
            // Generate column schema from actual document fields
            const columns: DatabaseColumn[] = Object.keys(sampleData).map(fieldName => {
              const fieldValue = sampleData[fieldName];
              let fieldType = 'string'; // default type
              
              if (typeof fieldValue === 'number') {
                fieldType = 'number';
              } else if (typeof fieldValue === 'boolean') {
                fieldType = 'boolean';
              } else if (fieldValue instanceof Date || (fieldValue && fieldValue.toDate)) {
                fieldType = 'timestamp';
              } else if (Array.isArray(fieldValue)) {
                fieldType = 'array';
              } else if (typeof fieldValue === 'object' && fieldValue !== null) {
                fieldType = 'object';
              }
              
              return {
                name: fieldName,
                type: fieldType,
                nullable: true, // Firestore fields are generally optional
                primaryKey: fieldName === 'id' || fieldName === '_id',
                foreignKey: fieldName.endsWith('Id') && fieldName !== 'id' ? `${fieldName.replace('Id', '')}.id` : undefined
              };
            });

            // Add document ID as a field if not already present
            if (!columns.find(col => col.name === 'id')) {
              columns.unshift({
                name: 'id',
                type: 'string',
                nullable: false,
                primaryKey: true
              });
            }

            // Get actual document count by fetching more docs
            const fullSnapshot = await getDocs(collection(db, collectionName));
            
            tables.push({
              id: `collection_${collectionName}`,
              name: collectionName,
              rowCount: fullSnapshot.size,
              columns
            });

            console.log(`Added table: ${collectionName} with ${fullSnapshot.size} documents`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
            if (message.toLowerCase().includes('missing or insufficient permissions')) {
              permissionDenied.push(collectionName);
              console.log(`Permission denied for collection ${collectionName}`);
            } else {
              console.log(`Collection ${collectionName} not found or no access:`, message);
            }
            continue;
        }
      }

      // If no collections found, show a helpful message
      if (tables.length === 0) {
        console.log('No collections found in Firebase project');
        // Create a placeholder to show the connection works but no data found
        tables.push({
          id: 'collection_placeholder',
          name: 'no_collections_found',
          rowCount: 0,
          columns: [
            {
              name: 'id',
              type: 'string',
              nullable: false,
              primaryKey: true
            },
            {
              name: 'message',
              type: 'string',
              nullable: false,
              primaryKey: false
            }
          ]
        });
      } else {
        console.log(`Found ${tables.length} collections in Firebase project`);
      }

      // Append placeholders for permission denied collections so UI can surface guidance
      for (const denied of permissionDenied) {
        tables.push({
          id: `collection_${denied}_denied`,
          name: denied,
          rowCount: 0,
          columns: [
            { name: 'id', type: 'string', nullable: false, primaryKey: true },
            { name: 'permission', type: 'string', nullable: false, primaryKey: false }
          ],
          meta: { permissionDenied: true, source: 'firestore-rules' }
        });
      }

      return tables;
    } catch (error) {
      console.error('Firebase introspection failed:', error);
      throw new Error(`Failed to introspect Firebase database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executeQuery(connectionId: string, query: string): Promise<any[]> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Database connection not found');
    }

    // Handle Firebase connections
    if (connection.type === 'firebase') {
      return this.executeFirebaseQuery(connection, query);
    }

    try {
      // Determine if it's a SELECT query or other type
      const trimmedQuery = query.trim().toLowerCase();
      
      if (trimmedQuery.startsWith('select')) {
        const stmt = connection.prepare(query);
        return stmt.all();
      } else {
        // For INSERT, UPDATE, DELETE
        const stmt = connection.prepare(query);
        const result = stmt.run();
        return [{ 
          changes: result.changes, 
          lastInsertRowid: result.lastInsertRowid 
        }];
      }
    } catch (error) {
      console.error('Query execution failed:', error);
      throw new Error(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTableData(connectionId: string, tableName: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Database connection not found');
    }

    // Handle Firebase connections
    if (connection.type === 'firebase') {
      return this.getFirebaseTableData(connection, tableName, limit, offset);
    }

    const query = `SELECT * FROM ${tableName} LIMIT ${limit} OFFSET ${offset}`;
    return this.executeQuery(connectionId, query);
  }

  private async executeFirebaseQuery(connection: any, query: string): Promise<any[]> {
    // For Firebase, we'll simulate SQL-like queries by parsing basic SELECT statements
    // This is a simplified implementation for demonstration
    try {
      const trimmedQuery = query.trim().toLowerCase();
      
      if (trimmedQuery.startsWith('select')) {
        // Parse simple SELECT * FROM collection_name
        const match = trimmedQuery.match(/select\s+\*\s+from\s+(\w+)/);
        if (match) {
          const collectionName = match[1];
          return this.getFirebaseTableData(connection, collectionName, 100, 0);
        }
      }
      
      throw new Error('Only basic SELECT * FROM collection queries are supported for Firebase');
    } catch (error) {
      console.error('Firebase query execution failed:', error);
      throw new Error(`Firebase query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getFirebaseTableData(connection: any, collectionName: string, limitCount: number = 100, offset: number = 0): Promise<any[]> {
    const { db } = connection;
    
    try {
      // Skip placeholder pseudo-collection
      if (collectionName === 'no_collections_found') {
        return [];
      }

      // Ensure authentication before making Firestore calls (fixes 400 Bad Request)
      const authService = FirebaseAuthService.getInstance();
      await authService.ensureAuthenticated();
      
      // Get documents from the collection
      const snapshot = await getDocs(query(collection(db, collectionName), limit(limitCount)));
      
      const results: any[] = [];
      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        // Add the document ID as 'id' field
        results.push({
          id: docSnapshot.id,
          ...data
        });
      });
      
      // Handle offset (simple client-side pagination for demo)
      return results.slice(offset);
    } catch (error) {
      // Gracefully handle permission errors: return empty set rather than hard failing
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.toLowerCase().includes('missing or insufficient permissions')) {
        console.warn(`Firebase permissions blocked read on '${collectionName}'. Returning empty result.`);
        return [];
      }
      console.error('Firebase table data fetch failed:', error);
      throw new Error(`Failed to fetch data from Firebase collection '${collectionName}': ${message}`);
    }
  }

  getConnection(connectionId: string): any {
    return this.connections.get(connectionId);
  }

  closeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection && typeof connection.close === 'function') {
      connection.close();
    }
    this.connections.delete(connectionId);
  }

  closeAllConnections(): void {
    for (const [, connection] of this.connections.entries()) {
      if (connection && typeof connection.close === 'function') {
        connection.close();
      }
    }
    this.connections.clear();
  }
}