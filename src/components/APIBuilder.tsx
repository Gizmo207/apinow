import React, { useState, useEffect } from 'react';
import { Plus, Database, Table, Settings, Zap, Trash2, Edit3 } from 'lucide-react';

interface APIBuilderProps {
  databases?: any[];
  onEndpointsChange?: (endpoints: any[]) => void;
}

export function APIBuilder({ databases = [], onEndpointsChange }: APIBuilderProps) {
  const [selectedDatabase, setSelectedDatabase] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    table: '',
    method: 'GET',
    path: '',
    authentication: true,
    filters: [] as any[]
  });

  useEffect(() => {
    if (databases.length > 0 && !selectedDatabase) {
      setSelectedDatabase(databases[0]);
    }
  }, [databases]);

  useEffect(() => {
    const loadTables = async () => {
      if (!selectedDatabase) return;
      
      // Use server actions to get tables
      try {
        const { introspectDatabaseAction, connectToDatabaseAction } = await import('../actions/databaseActions');
        
        // Connect to database using server action
        await connectToDatabaseAction(selectedDatabase);
        
        // Introspect database schema via server action
        const result = await introspectDatabaseAction(selectedDatabase);
        if (result.success && result.tables) {
          setTables(result.tables);
          console.log('API Builder loaded tables:', result.tables.map(t => t.name));
        } else {
          console.error('Failed to load tables:', result.error);
          setTables([]);
        }
      } catch (error) {
        console.error('Failed to load tables:', error);
        setTables([]);
      }
    };
    
    loadTables();
  }, [selectedDatabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDatabase) {
      alert('Please select a database');
      return;
    }

    try {
      // Save endpoint to Firestore
      const { FirebaseService } = await import('../services/firebaseService');
      const firebaseService = FirebaseService.getInstance();
      
      const endpointConfig = {
        name: formData.name,
        path: formData.path,
        method: formData.method as 'GET' | 'POST' | 'PUT' | 'DELETE',
        tableName: formData.table,
        connectionId: selectedDatabase.id,
        authRequired: formData.authentication,
        filters: formData.filters,
        rateLimit: 100,
        isActive: true
      };

      const savedEndpoint = await firebaseService.saveEndpoint(endpointConfig);
      
      // Update local state
      const updatedEndpoints = [...endpoints, savedEndpoint];
      setEndpoints(updatedEndpoints);
      
      if (onEndpointsChange) {
        onEndpointsChange(updatedEndpoints);
      }

      setShowAddForm(false);
      setFormData({
        name: '',
        table: '',
        method: 'GET',
        path: '',
        authentication: true,
        filters: []
      });
      
      alert('API Endpoint created successfully! You can now test it in the API Tester.');
    } catch (error) {
      console.error('Failed to save endpoint:', error);
      alert('Failed to create endpoint: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDelete = (id: string) => {
    const updatedEndpoints = endpoints.filter(ep => ep.id !== id);
    setEndpoints(updatedEndpoints);
    
    if (onEndpointsChange) {
      onEndpointsChange(updatedEndpoints);
    }
  };

  const addFilter = () => {
    setFormData(prev => ({
      ...prev,
      filters: [...prev.filters, { field: '', operator: 'equals', value: '' }]
    }));
  };

  const removeFilter = (index: number) => {
    setFormData(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index)
    }));
  };

  const updateFilter = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      filters: prev.filters.map((filter, i) => 
        i === index ? { ...filter, [field]: value } : filter
      )
    }));
  };

  if (databases.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Builder</h1>
          <p className="text-gray-600">Build REST APIs from your database tables</p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Databases Connected</h3>
          <p className="text-gray-600">Connect a database first to start building APIs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Builder</h1>
          <p className="text-gray-600">Build REST APIs from your database tables</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Endpoint</span>
        </button>
      </div>

      {/* Database Selector */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Database
        </label>
        <select
          value={selectedDatabase?.id || ''}
          onChange={(e) => {
            const db = databases.find(d => d.id === e.target.value);
            setSelectedDatabase(db);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {databases.map(db => (
            <option key={db.id} value={db.id}>{db.name}</option>
          ))}
        </select>
      </div>

      {/* Add Endpoint Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Create New API Endpoint</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endpoint Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Get Users"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HTTP Method
                </label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Database Table
                </label>
                <select
                  value={formData.table}
                  onChange={(e) => setFormData(prev => ({ ...prev, table: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a table</option>
                  {tables.map(table => (
                    <option key={table.id} value={table.name}>{table.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Path
                </label>
                <input
                  type="text"
                  value={formData.path}
                  onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="/api/users"
                  required
                />
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.authentication}
                  onChange={(e) => setFormData(prev => ({ ...prev, authentication: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Require Authentication</span>
              </label>
            </div>

            {/* Filters Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Filters (Optional)
                </label>
                <button
                  type="button"
                  onClick={addFilter}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  + Add Filter
                </button>
              </div>
              {formData.filters.map((filter, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="Field name"
                    value={filter.field}
                    onChange={(e) => updateFilter(index, 'field', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="equals">equals</option>
                    <option value="contains">contains</option>
                    <option value="greater_than">greater than</option>
                    <option value="less_than">less than</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeFilter(index)}
                    className="p-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Endpoint
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Endpoints List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">API Endpoints ({endpoints.length})</h2>
        
        {endpoints.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No API Endpoints</h3>
            <p className="text-gray-600 mb-4">Create your first API endpoint to get started</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Endpoint
            </button>
          </div>
        ) : (
          endpoints.map(endpoint => (
            <div key={endpoint.id} className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 text-sm font-medium rounded ${
                    endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                    endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                    endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {endpoint.method}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{endpoint.name}</h3>
                    <code className="text-sm text-gray-600">{endpoint.path}</code>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(endpoint.id)}
                    className="p-2 text-red-400 hover:text-red-600 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Table className="w-4 h-4" />
                  <span>Table: {endpoint.table}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Database className="w-4 h-4" />
                  <span>Database: {endpoint.database}</span>
                </div>
                {endpoint.authentication && (
                  <div className="flex items-center space-x-1">
                    <Settings className="w-4 h-4" />
                    <span>Auth Required</span>
                  </div>
                )}
              </div>
              
              {endpoint.filters && endpoint.filters.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600">Filters:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {endpoint.filters.map((filter: any, index: number) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                      >
                        {filter.field} {filter.operator}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}