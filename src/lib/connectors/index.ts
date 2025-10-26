// Unified database connector
import { DatabaseAdapter, DatabaseConfig } from './types';
import { FirestoreAdapter } from './firestore';
import { SQLiteAdapter } from './sqlite';
import { PostgresAdapter } from './postgres';

export async function connectDatabase(config: DatabaseConfig): Promise<DatabaseAdapter> {
  switch (config.type) {
    case 'firestore':
      return new FirestoreAdapter(config);
    
    case 'sqlite':
      return new SQLiteAdapter(config);
    
    case 'postgres':
      const pgAdapter = new PostgresAdapter(config);
      await pgAdapter.connect();
      return pgAdapter;
    
    case 'mysql':
      // TODO: Implement MySQLAdapter
      throw new Error('MySQL adapter not yet implemented');
    
    case 'mongo':
      // TODO: Implement MongoAdapter
      throw new Error('MongoDB adapter not yet implemented');
    
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}

export type { DatabaseAdapter, DatabaseConfig } from './types';
export { FirestoreAdapter } from './firestore';
export { SQLiteAdapter } from './sqlite';
export { PostgresAdapter } from './postgres';
