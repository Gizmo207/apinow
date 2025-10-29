// Analytics tracking and storage
// Tracks API calls, errors, latency for all endpoints

export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number; // milliseconds
  apiKey?: string; // Partial key for privacy
  error?: string;
  userId?: string;
}

export interface AnalyticsSummary {
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  avgResponseTime: number;
  callsByDay: { date: string; count: number }[];
  topEndpoints: { endpoint: string; count: number }[];
  callsByStatus: { status: number; count: number }[];
  callsByApiKey: { key: string; count: number }[];
}

const STORAGE_KEY = 'api_analytics';
const MAX_EVENTS = 1000; // Keep last 1000 events

// Log an API call event
export function logApiCall(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>) {
  const analyticsEvent: AnalyticsEvent = {
    id: generateId(),
    timestamp: Date.now(),
    ...event,
  };

  // Get existing events
  const events = getEvents();
  
  // Add new event
  events.push(analyticsEvent);
  
  // Keep only last MAX_EVENTS
  const trimmedEvents = events.slice(-MAX_EVENTS);
  
  // Save to localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedEvents));
  
  return analyticsEvent;
}

// Get all events
export function getEvents(limit?: number): AnalyticsEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const events = JSON.parse(stored) as AnalyticsEvent[];
    
    if (limit) {
      return events.slice(-limit);
    }
    
    return events;
  } catch (error) {
    console.error('Failed to load analytics events:', error);
    return [];
  }
}

// Get events within date range
export function getEventsByDateRange(startDate: Date, endDate: Date): AnalyticsEvent[] {
  const events = getEvents();
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  
  return events.filter(event => 
    event.timestamp >= startTime && event.timestamp <= endTime
  );
}

// Get analytics summary
export function getAnalyticsSummary(days: number = 7): AnalyticsSummary {
  const now = new Date();
  const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  const events = getEventsByDateRange(startDate, now);
  
  // Total calls
  const totalCalls = events.length;
  
  // Success vs error calls
  const successCalls = events.filter(e => e.statusCode >= 200 && e.statusCode < 400).length;
  const errorCalls = totalCalls - successCalls;
  
  // Average response time
  const avgResponseTime = events.length > 0
    ? events.reduce((sum, e) => sum + e.responseTime, 0) / events.length
    : 0;
  
  // Calls by day
  const callsByDay = getCallsByDay(events, days);
  
  // Top endpoints
  const endpointCounts: Record<string, number> = {};
  events.forEach(event => {
    const key = `${event.method} ${event.endpoint}`;
    endpointCounts[key] = (endpointCounts[key] || 0) + 1;
  });
  
  const topEndpoints = Object.entries(endpointCounts)
    .map(([endpoint, count]) => ({ endpoint, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Calls by status code
  const statusCounts: Record<number, number> = {};
  events.forEach(event => {
    statusCounts[event.statusCode] = (statusCounts[event.statusCode] || 0) + 1;
  });
  
  const callsByStatus = Object.entries(statusCounts)
    .map(([status, count]) => ({ status: Number(status), count }))
    .sort((a, b) => b.count - a.count);
  
  // Calls by API key
  const keyCounts: Record<string, number> = {};
  events.forEach(event => {
    if (event.apiKey) {
      keyCounts[event.apiKey] = (keyCounts[event.apiKey] || 0) + 1;
    }
  });
  
  const callsByApiKey = Object.entries(keyCounts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    totalCalls,
    successCalls,
    errorCalls,
    avgResponseTime: Math.round(avgResponseTime),
    callsByDay,
    topEndpoints,
    callsByStatus,
    callsByApiKey,
  };
}

// Get calls grouped by day
function getCallsByDay(events: AnalyticsEvent[], days: number): { date: string; count: number }[] {
  const now = new Date();
  const result: { date: string; count: number }[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const count = events.filter(event => 
      event.timestamp >= date.getTime() && event.timestamp < nextDate.getTime()
    ).length;
    
    result.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count,
    });
  }
  
  return result;
}

// Clear all analytics data
export function clearAnalytics() {
  localStorage.removeItem(STORAGE_KEY);
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Export data as JSON
export function exportAnalytics(): string {
  const events = getEvents();
  return JSON.stringify(events, null, 2);
}

// Get real-time stats (last hour)
export function getRealTimeStats(): {
  callsLastHour: number;
  callsLastMinute: number;
  avgLatencyLastHour: number;
  errorRateLastHour: number;
} {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  const oneMinuteAgo = now - (60 * 1000);
  
  const events = getEvents();
  
  const lastHourEvents = events.filter(e => e.timestamp >= oneHourAgo);
  const lastMinuteEvents = events.filter(e => e.timestamp >= oneMinuteAgo);
  
  const callsLastHour = lastHourEvents.length;
  const callsLastMinute = lastMinuteEvents.length;
  
  const avgLatencyLastHour = lastHourEvents.length > 0
    ? lastHourEvents.reduce((sum, e) => sum + e.responseTime, 0) / lastHourEvents.length
    : 0;
  
  const errorsLastHour = lastHourEvents.filter(e => e.statusCode >= 400).length;
  const errorRateLastHour = callsLastHour > 0
    ? (errorsLastHour / callsLastHour) * 100
    : 0;
  
  return {
    callsLastHour,
    callsLastMinute,
    avgLatencyLastHour: Math.round(avgLatencyLastHour),
    errorRateLastHour: Math.round(errorRateLastHour * 100) / 100,
  };
}
