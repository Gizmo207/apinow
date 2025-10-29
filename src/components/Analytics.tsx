import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Activity, Clock, Download, RefreshCw, AlertTriangle, CheckCircle, Key } from 'lucide-react';
import { getAnalyticsSummary, getRealTimeStats, clearAnalytics, exportAnalytics, getEvents } from '@/lib/analytics';

export function Analytics() {
  const [summary, setSummary] = useState(getAnalyticsSummary(7));
  const [realTime, setRealTime] = useState(getRealTimeStats());
  const [days, setDays] = useState(7);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = () => {
    setSummary(getAnalyticsSummary(days));
    setRealTime(getRealTimeStats());
  };

  useEffect(() => {
    // CLEAR ANY EXISTING MOCK DATA ON MOUNT
    const existingData = localStorage.getItem('api_analytics');
    if (existingData) {
      const events = JSON.parse(existingData);
      // Check if data looks like demo data (has xyz789***, abc123***, def456*** keys)
      const hasDemoKeys = events.some((e: any) => 
        e.apiKey && (e.apiKey.includes('xyz789') || e.apiKey.includes('abc123') || e.apiKey.includes('def456'))
      );
      if (hasDemoKeys) {
        console.log('Clearing demo data from previous session...');
        clearAnalytics();
      }
    }
    
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [days, refreshKey]);

  const handleRefresh = () => {
    loadData();
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
      clearAnalytics();
      loadData();
    }
  };

  const handleExport = () => {
    const data = exportAnalytics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const errorRate = summary.totalCalls > 0
    ? (summary.errorCalls / summary.totalCalls) * 100
    : 0;
  
  const successRate = summary.totalCalls > 0
    ? (summary.successCalls / summary.totalCalls) * 100
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time API performance and usage metrics</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          
          <button
            onClick={handleExport}
            disabled={summary.totalCalls === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Real-Time Stats Banner */}
      {summary.totalCalls > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-blue-100 text-sm">Last Hour</p>
              <p className="text-2xl font-bold">{realTime.callsLastHour}</p>
              <p className="text-xs text-blue-100 mt-1">calls</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Last Minute</p>
              <p className="text-2xl font-bold">{realTime.callsLastMinute}</p>
              <p className="text-xs text-blue-100 mt-1">calls</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Avg Latency</p>
              <p className="text-2xl font-bold">{realTime.avgLatencyLastHour}</p>
              <p className="text-xs text-blue-100 mt-1">ms</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Error Rate</p>
              <p className="text-2xl font-bold">{realTime.errorRateLastHour}%</p>
              <p className="text-xs text-blue-100 mt-1">last hour</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total API Calls</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalCalls.toLocaleString()}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-sm text-gray-500 mt-2">Last {days} days</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{successRate.toFixed(1)}%</p>
            </div>
            {successRate >= 95 ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            )}
          </div>
          <p className="text-sm text-gray-500 mt-2">{summary.successCalls} successful</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className="text-2xl font-bold text-gray-900">{errorRate.toFixed(1)}%</p>
            </div>
            <AlertTriangle className={`w-8 h-8 ${errorRate > 5 ? 'text-red-500' : 'text-gray-400'}`} />
          </div>
          <p className="text-sm text-gray-500 mt-2">{summary.errorCalls} errors</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{summary.avgResponseTime}ms</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
          <p className="text-sm text-gray-500 mt-2">Last {days} days</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Calls by Day</h3>
          {summary.callsByDay.length > 0 ? (
            <div className="h-64 flex items-end justify-around space-x-1">
              {summary.callsByDay.map((day, index) => {
                const maxCount = Math.max(...summary.callsByDay.map(d => d.count));
                const heightPercent = maxCount > 0 ? (day.count / maxCount) * 85 : 0;
                const heightPx = Math.max(heightPercent, 8);
                return (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div className="relative group w-full flex items-end justify-center h-48">
                      <div 
                        className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer" 
                        style={{ height: `${heightPx}%` }}
                      >
                        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {day.count} calls
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 text-center font-medium">{day.date}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <Activity className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No API calls yet</p>
                <p className="text-sm text-gray-400 mt-1">Start using your APIs to see analytics</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Endpoints</h3>
          {summary.topEndpoints.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {summary.topEndpoints.map((ep, index) => {
                const maxCount = Math.max(...summary.topEndpoints.map(e => e.count));
                const widthPercent = (ep.count / maxCount) * 100;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <code className="text-gray-700 font-mono text-xs">{ep.endpoint}</code>
                      <span className="text-gray-600 font-medium">{ep.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No endpoints called yet</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent API Calls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent API Calls</h3>
          {summary.totalCalls > 0 && (
            <button
              onClick={handleClearData}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear All Data
            </button>
          )}
        </div>
        <div className="p-6">
          {getEvents(20).length > 0 ? (
            <div className="space-y-2">
              {getEvents(20).reverse().map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      event.method === 'GET' ? 'bg-green-100 text-green-800' :
                      event.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                      event.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {event.method}
                    </span>
                    <code className="text-sm text-gray-700 font-mono">{event.endpoint}</code>
                    {event.apiKey && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Key className="w-3 h-3" />
                        {event.apiKey}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      event.statusCode >= 200 && event.statusCode < 300 ? 'bg-green-100 text-green-800' :
                      event.statusCode >= 400 ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {event.statusCode}
                    </span>
                    <span className="text-sm text-gray-600 font-medium">{event.responseTime}ms</span>
                    <span className="text-xs text-gray-400 w-20">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No API calls tracked yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Test your APIs to see analytics data here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}