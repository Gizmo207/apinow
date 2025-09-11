// Unified database connector interface
export interface DatabaseAdapter {
  type: string;
  listCollections(): Promise<string[]>;
  listDocuments(collection: string, limit?: number): Promise<any[]>;
  create(collection: string, id: string | undefined, data: any): Promise<any>;
  read(collection: string, id: string): Promise<any>;
  update(collection: string, id: string, data: any): Promise<any>;
  delete(collection: string, id: string): Promise<{ success: boolean }>;
  disconnect?(): Promise<void>;
}

export interface DatabaseConfig {
  type: 'firestore' | 'postgres' | 'mysql' | 'mongo' | 'sqlite';
  [key: string]: any;
}
