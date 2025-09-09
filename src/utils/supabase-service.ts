import { supabase } from '../lib/supabase';
import { DatabaseConnection } from './database';

export interface SupabaseConnection {
  id: string;
  user_id: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'firebase';
  host?: string;
  port?: string;
  database_name?: string;
  username?: string;
  encrypted_password?: string;
  project_id?: string;
  api_key?: string;
  auth_domain?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface APIEndpoint {
  id: string;
  user_id: string;
  connection_id: string;
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  table_name: string;
  filters: any[];
  auth_required: boolean;
  rate_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class SupabaseService {
  private static instance: SupabaseService;

  static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  // Database Connections
  async saveConnection(connection: Omit<DatabaseConnection, 'id' | 'status' | 'tables' | 'createdAt'>): Promise<SupabaseConnection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('database_connections')
      .insert({
        user_id: user.id,
        name: connection.name,
        type: connection.type,
        host: connection.host,
        port: connection.port,
        database_name: connection.database,
        username: connection.username,
        encrypted_password: connection.password, // TODO: Encrypt this
        project_id: connection.projectId,
        api_key: connection.apiKey, // TODO: Encrypt this
        auth_domain: connection.authDomain,
        status: 'connected'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getConnections(): Promise<SupabaseConnection[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('database_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateConnection(id: string, updates: Partial<SupabaseConnection>): Promise<SupabaseConnection> {
    const { data, error } = await supabase
      .from('database_connections')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteConnection(id: string): Promise<void> {
    const { error } = await supabase
      .from('database_connections')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // API Endpoints
  async saveEndpoint(endpoint: Omit<APIEndpoint, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<APIEndpoint> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('api_endpoints')
      .insert({
        user_id: user.id,
        ...endpoint
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getEndpoints(): Promise<APIEndpoint[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('api_endpoints')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateEndpoint(id: string, updates: Partial<APIEndpoint>): Promise<APIEndpoint> {
    const { data, error } = await supabase
      .from('api_endpoints')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteEndpoint(id: string): Promise<void> {
    const { error } = await supabase
      .from('api_endpoints')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Analytics
  async recordApiUsage(endpointId: string, responseTime: number, isError: boolean = false): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    // Check if usage record exists for today
    const { data: existing } = await supabase
      .from('api_usage')
      .select('*')
      .eq('endpoint_id', endpointId)
      .eq('date', today)
      .single();

    if (existing) {
      // Update existing record
      await supabase
        .from('api_usage')
        .update({
          requests_count: existing.requests_count + 1,
          response_time_avg: (existing.response_time_avg * existing.requests_count + responseTime) / (existing.requests_count + 1),
          errors_count: existing.errors_count + (isError ? 1 : 0)
        })
        .eq('id', existing.id);
    } else {
      // Create new record
      await supabase
        .from('api_usage')
        .insert({
          endpoint_id: endpointId,
          user_id: user.id,
          requests_count: 1,
          response_time_avg: responseTime,
          errors_count: isError ? 1 : 0,
          date: today
        });
    }
  }

  async getApiUsage(days: number = 30): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('api_usage')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // User Subscription
  async getUserSubscription(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      // First try to query the view without user_id filter since the column might not exist
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .limit(1);

      if (error) {
        console.log('stripe_user_subscriptions view query failed, returning default subscription:', error.message);
        return null;
      }
      
      // If we got data, try to find the user's subscription
      const userSubscription = data?.find(sub => sub.user_id === user.id || sub.id === user.id);
      return userSubscription || null;
    } catch (error) {
      console.log('Error querying stripe_user_subscriptions, returning default subscription:', error);
      return null;
    }
  }

  async createUserSubscription(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Note: stripe_user_subscriptions is a view, we should insert into user_profiles instead
    // For now, return a default subscription object
    return {
      user_id: user.id,
      plan_type: 'free',
      requests_limit: 1000,
      requests_used: 0
    };
  }
}
