// Server-side Analytics Service
import { getOurFirestore } from './firebaseServiceServer';

export interface AnalyticsLog {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId: string | null;
  timestamp?: Date;
  userAgent?: string;
  success: boolean;
}

/**
 * Log an API request to analytics
 */
export async function logApiRequest(data: AnalyticsLog): Promise<void> {
  try {
    const firestore = getOurFirestore();
    
    await firestore.collection('api_analytics').add({
      ...data,
      timestamp: new Date(),
    });
    
    console.log('[Analytics] Logged request:', data.endpoint, data.statusCode);
  } catch (error) {
    // Don't throw - analytics shouldn't break the API
    console.error('[Analytics] Failed to log request:', error);
  }
}

/**
 * Get analytics data for the dashboard
 */
export async function getAnalytics(userId: string, source?: 'protected' | 'public') {
  try {
    const firestore = getOurFirestore();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get all analytics logs for this user in the last 30 days
    // Note: We fetch all user's logs and filter/sort in memory to avoid needing composite indexes
    const logsSnapshot = await firestore
      .collection('api_analytics')
      .where('userId', '==', userId)
      .limit(1000)
      .get();
    
    // Convert and filter logs
    let allLogs = logsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        endpoint: data.endpoint,
        method: data.method,
        statusCode: data.statusCode,
        responseTime: data.responseTime,
        userId: data.userId,
        success: data.success,
        source: data.source || 'protected', // Default to protected for old logs
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
      };
    });
    
    // Filter by source if specified
    if (source) {
      allLogs = allLogs.filter(log => log.source === source);
    }
    
    // Filter by last 30 days and sort by timestamp
    const logs = allLogs
      .filter(log => log.timestamp >= thirtyDaysAgo)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Calculate metrics
    const totalRequests = logs.length;
    const successfulRequests = logs.filter(log => log.success).length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    
    const avgResponseTime = totalRequests > 0
      ? logs.reduce((sum, log) => sum + log.responseTime, 0) / totalRequests
      : 0;
    
    // Get unique users
    const uniqueUsers = new Set(logs.map(log => log.userId)).size;
    
    // Group requests by day for the chart
    const requestsByDay: { [key: string]: number } = {};
    logs.forEach(log => {
      const date = log.timestamp.toLocaleDateString();
      requestsByDay[date] = (requestsByDay[date] || 0) + 1;
    });
    
    // Get recent activity (last 10)
    const recentActivity = logs.slice(0, 10).map(log => ({
      id: log.id,
      endpoint: log.endpoint,
      method: log.method,
      statusCode: log.statusCode,
      responseTime: log.responseTime,
      timestamp: log.timestamp,
      success: log.success,
    }));
    
    return {
      totalRequests,
      successRate: Math.round(successRate),
      activeUsers: uniqueUsers,
      avgResponseTime: Math.round(avgResponseTime),
      requestsByDay,
      recentActivity,
    };
  } catch (error) {
    console.error('[Analytics] Failed to get analytics:', error);
    return {
      totalRequests: 0,
      successRate: 0,
      activeUsers: 0,
      avgResponseTime: 0,
      requestsByDay: {},
      recentActivity: [],
    };
  }
}
