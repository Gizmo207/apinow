import React, { useState, useEffect } from 'react';
import { Save, Code, Copy, Check, Database, Play } from 'lucide-react';
import { getSQLiteSchema } from '@/lib/sqliteClient';

interface APIBuilderProps {
  databases: any[];
}

export function APIBuilder({ databases }: APIBuilderProps) {
  const [selectedDb, setSelectedDb] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDb) {
      loadTables();
    }
  }, [selectedDb]);

  const loadTables = async () => {
    if (!selectedDb) return;
    
    setLoading(true);
    try {
      if (selectedDb.type === 'sqlite') {
        // Client-side SQLite
        const { tables: tablesList, schema } = await getSQLiteSchema(selectedDb.filePath);
        const formattedTables = tablesList.map((tableName: string) => ({
          name: tableName,
          columns: schema[tableName] || []
        }));
        setTables(formattedTables);
        generateAvailableEndpoints(formattedTables);
        setLoading(false);
        return;
      }
      
      let res;
      if (selectedDb.type === 'mysql') {
        res = await fetch('/api/mysql/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionString: selectedDb.connectionString })
        });
      } else if (selectedDb.type === 'postgresql') {
        res = await fetch('/api/postgresql/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionString: selectedDb.connectionString })
        });
      } else {
        alert('Database type not yet supported');
        return;
      }

      if (!res.ok) throw new Error('Failed to load tables');

      const data = await res.json();
      const tablesList = data.tables || [];
      
      let formattedTables;
      if (selectedDb.type === 'mysql' || selectedDb.type === 'postgresql') {
        formattedTables = tablesList.map((tableName: string) => ({
          name: tableName,
          columns: data.schema[tableName] || []
        }));
      } else {
        formattedTables = tablesList;
      }
      
      setTables(formattedTables);
      generateAvailableEndpoints(formattedTables);
    } catch (error) {
      console.error('Failed to load tables:', error);
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  const generateAvailableEndpoints = (tablesList: any[]) => {
    const allEndpoints: any[] = [];
    
    tablesList.forEach(table => {
      // GET all
      allEndpoints.push({
        id: `${selectedDb.id}-${table.name}-list`,
        table: table.name,
        method: 'GET',
        path: `/api/data/${table.name}`,
        description: `Get all records from ${table.name}`,
        collection: table.name,
        idType: 'users-list'
      });
      
      // POST create
      allEndpoints.push({
        id: `${selectedDb.id}-${table.name}-create`,
        table: table.name,
        method: 'POST',
        path: `/api/data/${table.name}`,
        description: `Create a new record in ${table.name}`,
        collection: table.name,
        idType: 'users-create'
      });
      
      // GET single
      allEndpoints.push({
        id: `${selectedDb.id}-${table.name}-read`,
        table: table.name,
        method: 'GET',
        path: `/api/data/${table.name}/:id`,
        description: `Get a single record from ${table.name}`,
        collection: table.name,
        idType: 'users-read'
      });
      
      // PUT update
      allEndpoints.push({
        id: `${selectedDb.id}-${table.name}-update`,
        table: table.name,
        method: 'PUT',
        path: `/api/data/${table.name}/:id`,
        description: `Update a record in ${table.name}`,
        collection: table.name,
        idType: 'users-update'
      });
      
      // DELETE
      allEndpoints.push({
        id: `${selectedDb.id}-${table.name}-delete`,
        table: table.name,
        method: 'DELETE',
        path: `/api/data/${table.name}/:id`,
        description: `Delete a record from ${table.name}`,
        collection: table.name,
        idType: 'users-delete'
      });
    });
    
    setEndpoints(allEndpoints);
  };

  const saveEndpoint = (endpoint: any) => {
    const existing = JSON.parse(localStorage.getItem('saved_endpoints') || '[]');
    
    if (existing.some((e: any) => e.id === endpoint.id)) {
      alert('⚠️ This endpoint is already saved!');
      return;
    }
    
    const endpointToSave = {
      ...endpoint,
      name: `${endpoint.method} ${endpoint.path}`,
      database: {
        id: selectedDb.id,
        type: selectedDb.type,
        connectionString: selectedDb.connectionString,
        filePath: selectedDb.filePath,
      },
      dbType: selectedDb.type,
      connectionInfo: selectedDb.type === 'sqlite' 
        ? { filePath: selectedDb.filePath } 
        : { connectionString: selectedDb.connectionString },
      createdAt: new Date().toISOString()
    };
    
    existing.push(endpointToSave);
    localStorage.setItem('saved_endpoints', JSON.stringify(existing));
    
    alert(`✅ Endpoint saved!\n\n${endpoint.method} ${endpoint.path}`);
  };

  if (databases.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No databases connected</h3>
        <p className="text-gray-600">Connect a database first to generate API endpoints</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🔧 Endpoint Builder</h1>
        <p className="text-gray-600 mt-1">Generate REST API endpoints from your database tables</p>
      </div>

      {/* Select Database */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Select Database</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {databases.map(db => (
            <button
              key={db.id}
              onClick={() => setSelectedDb(db)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                selectedDb?.id === db.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold">{db.name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{db.type}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Available Endpoints */}
      {selectedDb && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Available Endpoints</h2>
          
          {loading ? (
            <p className="text-gray-600">Loading tables...</p>
          ) : tables.length === 0 ? (
            <p className="text-gray-600">No tables found in this database</p>
          ) : (
            <div className="space-y-6">
              {tables.map(table => {
                const tableEndpoints = endpoints.filter(ep => ep.table === table.name);
                
                return (
                  <div key={table.name} className="border rounded-lg p-4">
                    {/* Table Header */}
                    <div className="mb-4 pb-3 border-b">
                      <h3 className="text-lg font-semibold text-gray-900">/{table.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {table.columns?.length || 0} columns • {tableEndpoints.length} endpoints
                      </p>
                    </div>
                    
                    {/* Endpoints for this table */}
                    <div className="space-y-3">
                      {tableEndpoints.map(endpoint => (
                        <div key={endpoint.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className={`px-2 py-1 text-xs font-medium rounded ${
                                  endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                                  endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                                  endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {endpoint.method}
                                </span>
                                <code className="text-sm font-mono text-gray-700">{endpoint.path}</code>
                              </div>
                              <p className="text-sm text-gray-600">{endpoint.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Collection: {endpoint.collection} • ID: {endpoint.idType}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={() => {
                                  localStorage.setItem('tester_prefill', JSON.stringify({
                                    url: `${window.location.origin}${endpoint.path}`,
                                    method: endpoint.method,
                                    endpointId: endpoint.id
                                  }));
                                  localStorage.setItem('dashboardView', 'tester');
                                  window.location.reload();
                                }}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <Play className="w-4 h-4" />
                                Test
                              </button>
                              <button
                                onClick={() => saveEndpoint(endpoint)}
                                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <Save className="w-4 h-4" />
                                Save
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
