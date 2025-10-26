// Unified database connector
import { DatabaseAdapter, DatabaseConfig } from './types';
import { FirestoreAdapter } from './firestore';
import { SQLiteAdapter } from './sqlite';
import { PostgresAdapter } from './postgres';
import { MySQLAdapter } from './mysql';
import { MongoDBAdapter } from './mongodb';
import { SQLServerAdapter } from './sqlserver';
import { SupabaseAdapter } from './supabase';
import { RedisAdapter } from './redis';
import { MariaDBAdapter } from './mariadb';

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
      const mysqlAdapter = new MySQLAdapter(config);
      await mysqlAdapter.connect();
      return mysqlAdapter;
    
    case 'mongo':
      const mongoAdapter = new MongoDBAdapter(config);
      await mongoAdapter.connect();
      return mongoAdapter;
    
    case 'sqlserver':
      const sqlServerAdapter = new SQLServerAdapter(config);
      await sqlServerAdapter.connect();
      return sqlServerAdapter;
    
    case 'supabase':
      const supabaseAdapter = new SupabaseAdapter(config);
      await supabaseAdapter.connect();
      return supabaseAdapter;
    
    case 'redis':
      const redisAdapter = new RedisAdapter(config);
      await redisAdapter.connect();
      return redisAdapter;
    
    case 'mariadb':
      const mariadbAdapter = new MariaDBAdapter(config);
      await mariadbAdapter.connect();
      return mariadbAdapter;
    
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}

export type { DatabaseAdapter, DatabaseConfig } from './types';
export { FirestoreAdapter } from './firestore';
export { SQLiteAdapter } from './sqlite';
export { PostgresAdapter } from './postgres';
export { MySQLAdapter } from './mysql';
export { MongoDBAdapter } from './mongodb';
export { SQLServerAdapter } from './sqlserver';
export { SupabaseAdapter } from './supabase';
export { RedisAdapter } from './redis';
export { MariaDBAdapter } from './mariadb';
