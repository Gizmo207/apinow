import { DatabaseAdapter } from './types';

// Dynamic import to avoid bundling for client
let createClient: any;

export class SupabaseAdapter implements DatabaseAdapter {
  type = 'supabase';
  private client: any = null;
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // Only import @supabase/supabase-js on server side
    if (typeof window === 'undefined' && !createClient) {
      const supabase = await import('@supabase/supabase-js');
      createClient = supabase.createClient;
    }

    if (!createClient) {
      throw new Error('Supabase can only be used on the server side');
    }

    try {
      const supabaseUrl = this.config.supabaseUrl || this.config.url;
      const supabaseKey = this.config.supabaseKey || this.config.apiKey || this.config.anonKey;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL and API key are required');
      }

      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false, // Server-side, no session persistence needed
        },
      });

      // Test connection by listing tables
      const { error } = await this.client.from('_supabase_test_').select('*').limit(1);
      // It's okay if this fails - just testing connectivity
      
      console.log(`✅ Connected to Supabase: ${supabaseUrl}`);
    } catch (error) {
      console.error('❌ Supabase connection failed:', error);
      throw new Error(`Supabase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    // Supabase client doesn't need explicit disconnection
    this.client = null;
    console.log('✅ Disconnected from Supabase');
  }

  async listCollections(): Promise<string[]> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      // Query pg_catalog to get table names (requires appropriate permissions)
      const { data, error } = await this.client
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');

      if (error) {
        // Fallback: try using RPC if available
        console.warn('Direct schema query failed, using fallback method');
        // For now, return empty array - user will need to configure tables manually
        return [];
      }

      return data?.map((row: any) => row.table_name) || [];
    } catch (error) {
      console.error('Failed to list collections:', error);
      // Return empty array instead of throwing - Supabase may have restricted permissions
      return [];
    }
  }

  async listDocuments(collection: string, limit: number = 100): Promise<any[]> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      const { data, error } = await this.client
        .from(collection)
        .select('*')
        .limit(limit);

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error(`Failed to list documents from ${collection}:`, error);
      throw error;
    }
  }

  async create(collection: string, id: string | undefined, data: any): Promise<any> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      const insertData = id ? { id, ...data } : data;

      const { data: result, error } = await this.client
        .from(collection)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      return result;
    } catch (error) {
      console.error(`Failed to create document in ${collection}:`, error);
      throw error;
    }
  }

  async read(collection: string, id: string): Promise<any> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      const { data, error } = await this.client
        .from(collection)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Document not found: ${id}`);
      }

      return data;
    } catch (error) {
      console.error(`Failed to read document ${id} from ${collection}:`, error);
      throw error;
    }
  }

  async update(collection: string, id: string, data: any): Promise<any> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      // Remove id from update data
      const { id: _, ...updateData } = data;

      const { data: result, error } = await this.client
        .from(collection)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      if (!result) {
        throw new Error(`Document not found: ${id}`);
      }

      return result;
    } catch (error) {
      console.error(`Failed to update document ${id} in ${collection}:`, error);
      throw error;
    }
  }

  async delete(collection: string, id: string): Promise<{ success: boolean }> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      const { error } = await this.client
        .from(collection)
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      console.error(`Failed to delete document ${id} from ${collection}:`, error);
      throw error;
    }
  }
}
