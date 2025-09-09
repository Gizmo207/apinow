import React from 'react';
import { Database, Zap, Users, Activity, TrendingUp, Clock } from 'lucide-react';

interface DashboardProps {
  databases: any[];
  endpoints: any[];
  user: any;
  onViewChange: (view: string) => void;
}

export function Dashboard({ databases, endpoints, user, onViewChange }: DashboardProps) {
  const totalDatabases = databases.length;
  const totalEndpoints = endpoints.length;
  const connectedDatabases = databases.filter(db => db.connected).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your API platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Connected Databases</p>
              <p className="text-2xl font-bold text-gray-900">{connectedDatabases}</p>
            </div>
            <Database className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {totalDatabases - connectedDatabases} disconnected
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active APIs</p>
              <p className="text-2xl font-bold text-gray-900">{totalEndpoints}</p>
            </div>
            <Zap className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">All endpoints ready</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">No requests yet</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">0ms</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">No data available</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onViewChange('databases')}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <Database className="w-6 h-6 text-blue-600 mb-2" />
            <h3 className="font-medium text-gray-900">Connect Database</h3>
            <p className="text-sm text-gray-600">Add a new database connection</p>
          </button>
          
          <button
            onClick={() => onViewChange('builder')}
            className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
          >
            <Zap className="w-6 h-6 text-green-600 mb-2" />
            <h3 className="font-medium text-gray-900">Build API</h3>
            <p className="text-sm text-gray-600">Create new API endpoints</p>
          </button>
          
          <button
            onClick={() => onViewChange('tester')}
            className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <Activity className="w-6 h-6 text-purple-600 mb-2" />
            <h3 className="font-medium text-gray-900">Test APIs</h3>
            <p className="text-sm text-gray-600">Test your API endpoints</p>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No recent activity</p>
          <p className="text-sm">Activity will appear here as you use the platform</p>
        </div>
      </div>
    </div>
  );
}