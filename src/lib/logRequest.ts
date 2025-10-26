import { getFirestore } from 'firebase-admin/firestore';

interface LogRequestParams {
  endpoint: string;
  status: number;
  error?: string;
  source: 'public' | 'protected';
  apiKey?: string;
  userId?: string;
  responseTime?: number;
  method?: string;
}

export async function logRequest(params: LogRequestParams): Promise<void> {
  try {
    const db = getFirestore();
    
    await db.collection('api_logs').add({
      endpoint: params.endpoint,
      status: params.status,
      error: params.error || null,
      source: params.source,
      apiKey: params.apiKey || null,
      userId: params.userId || null,
      responseTime: params.responseTime || null,
      method: params.method || 'GET',
      timestamp: new Date(),
    });
  } catch (error) {
    // Don't throw - logging shouldn't break the API
    console.error('Error logging request:', error);
  }
}
