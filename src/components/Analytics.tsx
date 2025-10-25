import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Clock, Globe, Zap, RefreshCw } from 'lucide-react';
import { getAuthHeaders } from '@/lib/clientAuth';

interface AnalyticsData {
  totalRequests: number;
  successRate: number;
  activeUsers: number;
  avgResponseTime: number;
  requestsByDay: { [key: string]: number };
  recentActivity: any[];
}

export function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/analytics', { headers });
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Monitor your API performance and usage</p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{data?.totalRequests || 0}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-sm text-gray-500 mt-2">Last 30 days</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{data?.successRate || 0}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-sm text-gray-500 mt-2">Last 30 days</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{data?.activeUsers || 0}</p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-sm text-gray-500 mt-2">Last 30 days</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{data?.avgResponseTime || 0}ms</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
          <p className="text-sm text-gray-500 mt-2">Last 30 days</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Volume by Day</h3>
          {data && Object.keys(data.requestsByDay).length > 0 ? (
            <div className="h-64 flex items-end justify-around space-x-2 px-4">
              {Object.entries(data.requestsByDay).slice(-7).map(([date, count], index) => {
                const maxCount = Math.max(...Object.values(data.requestsByDay));
                const heightPercent = (count / maxCount) * 80; // Use 80% max height
                const heightPx = Math.max((heightPercent / 100) * 240, 40); // Min 40px height
                return (
                  <div key={index} className="flex flex-col items-center" style={{ width: '60px' }}>
                    <div className="relative group w-full flex items-end justify-center" style={{ height: '240px' }}>
                      <div 
                        className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer" 
                        style={{ height: `${heightPx}px` }}
                      >
                        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {count} requests
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 text-center font-medium">{date.split('/')[0]}/{date.split('/')[1]}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No data available</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Times (Last 10 Requests)</h3>
          {data && data.recentActivity.length > 0 ? (
            <div className="h-64">
              <div className="h-full flex items-end justify-around space-x-1 px-2">
                {data.recentActivity.slice(0, 10).reverse().map((activity, index) => {
                  const maxTime = Math.max(...data.recentActivity.slice(0, 10).map(a => a.responseTime));
                  const heightPercent = (activity.responseTime / maxTime) * 80;
                  const heightPx = Math.max((heightPercent / 100) * 200, 30); // Min 30px height
                  return (
                    <div key={index} className="flex flex-col items-center" style={{ width: '40px' }}>
                      <div className="relative group w-full flex items-end justify-center" style={{ height: '200px' }}>
                        <div 
                          className={`w-full rounded-t transition-colors cursor-pointer ${
                            activity.responseTime < 1000 ? 'bg-green-500 hover:bg-green-600' :
                            activity.responseTime < 2000 ? 'bg-yellow-500 hover:bg-yellow-600' :
                            'bg-red-500 hover:bg-red-600'
                          }`}
                          style={{ height: `${heightPx}px` }}
                        >
                          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {activity.responseTime}ms
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2 font-medium">#{10 - index}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                  <span className="text-gray-600">&lt;1s</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded mr-1"></div>
                  <span className="text-gray-600">1-2s</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                  <span className="text-gray-600">&gt;2s</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          {data && data.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {data.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      activity.method === 'GET' ? 'bg-green-100 text-green-800' :
                      activity.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                      activity.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {activity.method}
                    </span>
                    <code className="text-sm text-gray-700">{activity.endpoint}</code>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      activity.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {activity.statusCode}
                    </span>
                    <span className="text-sm text-gray-500">{activity.responseTime}ms</span>
                    <span className="text-sm text-gray-400">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Globe className="w-16 h-16 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No recent activity</p>
              <p className="text-sm text-gray-400 mt-1">Activity will appear here once you start using your APIs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}