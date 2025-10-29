// Generate demo analytics data for testing the dashboard
import { logApiCall } from './analytics';

const endpoints = [
  { path: '/api/data/users', method: 'GET' },
  { path: '/api/data/products', method: 'GET' },
  { path: '/api/data/orders', method: 'POST' },
  { path: '/api/data/customers', method: 'GET' },
  { path: '/api/data/invoices', method: 'GET' },
  { path: '/api/data/users', method: 'POST' },
  { path: '/api/data/products', method: 'PUT' },
  { path: '/api/data/orders', method: 'GET' },
];

const statusCodes = [200, 200, 200, 200, 201, 404, 500, 200];
const apiKeys = ['abc123***', 'xyz789***', 'def456***', null];

export function generateDemoAnalytics(count: number = 50) {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  for (let i = 0; i < count; i++) {
    // Spread events over last 7 days
    const daysAgo = Math.floor(Math.random() * 7);
    const timestamp = now - (daysAgo * oneDay) - Math.random() * oneDay;
    
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)] || undefined;
    
    // Simulate realistic response times
    const responseTime = statusCode >= 400 
      ? Math.floor(Math.random() * 3000) + 500 // Slower for errors
      : Math.floor(Math.random() * 500) + 50; // Fast for success
    
    // Create the event with custom timestamp
    const event = {
      endpoint: endpoint.path,
      method: endpoint.method,
      statusCode,
      responseTime,
      apiKey,
    };
    
    // Log it (this will add current timestamp, we'll override it)
    const logged = logApiCall(event);
    
    // Hack: Update the timestamp in localStorage to spread data over days
    const events = JSON.parse(localStorage.getItem('api_analytics') || '[]');
    const lastEvent = events[events.length - 1];
    if (lastEvent && lastEvent.id === logged.id) {
      lastEvent.timestamp = timestamp;
      localStorage.setItem('api_analytics', JSON.stringify(events));
    }
  }
  
  console.log(`✅ Generated ${count} demo analytics events`);
}
