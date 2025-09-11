// Unified database connector
import { DatabaseAdapter, DatabaseConfig } from './types';
import { FirestoreAdapter } from './firestore';
import { SQLiteAdapter } from './sqlite';

export async function connectDatabase(config: DatabaseConfig): Promise<DatabaseAdapter> {
  switch (config.type) {
    case 'firestore':
      return new FirestoreAdapter(config);
    
    case 'sqlite':
      return new SQLiteAdapter(config);
    
    case 'postgres':
      // TODO: Implement PostgresAdapter
      throw new Error('PostgreSQL adapter not yet implemented');
    
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
