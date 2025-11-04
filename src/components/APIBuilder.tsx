import React, { useState, useEffect } from 'react';
import { Save, Code, Copy, Check, Database } from 'lucide-react';
import { getSQLiteSchema } from '@/lib/sqliteBrowser';

interface APIBuilderProps {
  databases: any[];
}

export function APIBuilder({ databases }: APIBuilderProps) {
  const [selectedDb, setSelectedDb] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [savedEndpoints, setSavedEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load saved endpoints from localStorage
  useEffect(() => {
    const loadSavedEndpoints = () => {
      const saved = JSON.parse(localStorage.getItem('saved_endpoints') || '[]');
      setSavedEndpoints(saved);
    };
    
    loadSavedEndpoints();
    
    // Listen for endpoint save events
    const handleEndpointsSaved = () => loadSavedEndpoints();
    window.addEventListener('endpointsSaved', handleEndpointsSaved);
    
    return () => window.removeEventListener('endpointsSaved', handleEndpointsSaved);
  }, []);

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
        // Use browser-side SQLite
        const data = await getSQLiteSchema(selectedDb.filePath);
        const formattedTables = data.tables.map((tableName: string) => ({
          name: tableName,
          columns: data.schema[tableName] || []
        }));
        setTables(formattedTables);
        generateAvailableEndpoints(formattedTables);
        setLoading(false);
        return;
      }
      
      let res;
      const authUserRaw = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
      const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authUser?.uid) headers['x-user-id'] = authUser.uid;
      if (selectedDb.type === 'mysql' || selectedDb.type === 'mariadb') {
        res = await fetch('/api/mysql/connect', {
          method: 'POST',
          headers,
          body: JSON.stringify({ connectionId: selectedDb.id })
        });
      } else if (selectedDb.type === 'postgresql') {
        res = await fetch('/api/postgresql/connect', {
          method: 'POST',
          headers,
          body: JSON.stringify({ connectionId: selectedDb.id })
        });
      } else if (selectedDb.type === 'mongodb') {
        res = await fetch('/api/mongodb/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionId: selectedDb.id })
        });
      } else if (selectedDb.type === 'mssql') {
        res = await fetch('/api/mssql/connect', {
          method: 'POST',
          headers,
          body: JSON.stringify({ connectionId: selectedDb.id })
        });
      } else {
        setTables([]);
        alert('Database type not yet supported in Endpoint Builder');
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error('Failed to load tables');

      const data = await res.json();
      const tablesList = data.tables || [];
      
      let formattedTables;
      if (selectedDb.type === 'mysql' || selectedDb.type === 'mariadb' || selectedDb.type === 'postgresql' || selectedDb.type === 'mongodb' || selectedDb.type === 'mssql') {
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
    const isReadOnly = selectedDb.type === 'sqlite'; // Only SQLite is read-only now!
    
    tablesList.forEach(table => {
      // GET all (available for all database types)
      allEndpoints.push({
        id: `${selectedDb.id}-${table.name}-list`,
        table: table.name,
        method: 'GET',
        path: `/api/data/${table.name}`,
        description: `Get all records from ${table.name}`,
        collection: table.name,
        idType: 'users-list',
        columns: table.columns || []
      });
      
      // GET single (available for all database types)
      allEndpoints.push({
        id: `${selectedDb.id}-${table.name}-read`,
        table: table.name,
        method: 'GET',
        path: `/api/data/${table.name}/:id`,
        description: `Get a single record from ${table.name}`,
        collection: table.name,
        idType: 'users-read',
        columns: table.columns || []
      });
      
      // Write operations (POST/PUT/DELETE) only for writable databases
      // SQLite and Google Sheets in production are READ-ONLY (industry standard)
      if (!isReadOnly) {
        // POST create
        allEndpoints.push({
          id: `${selectedDb.id}-${table.name}-create`,
          table: table.name,
          method: 'POST',
          path: `/api/data/${table.name}`,
          description: `Create a new record in ${table.name}`,
          collection: table.name,
          idType: 'users-create',
          columns: table.columns || []
        });
        
        // PUT update
        allEndpoints.push({
          id: `${selectedDb.id}-${table.name}-update`,
          table: table.name,
          method: 'PUT',
          path: `/api/data/${table.name}/:id`,
          description: `Update a record in ${table.name}`,
          collection: table.name,
          idType: 'users-update',
          columns: table.columns || []
        });
        
        // DELETE
        allEndpoints.push({
          id: `${selectedDb.id}-${table.name}-delete`,
          table: table.name,
          method: 'DELETE',
          path: `/api/data/${table.name}/:id`,
          description: `Delete a record from ${table.name}`,
          collection: table.name,
          columns: table.columns || [],
          idType: 'users-delete'
        });
      }
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
    
    // Dispatch event to notify dashboard
    window.dispatchEvent(new Event('endpointsSaved'));
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
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{db.name}</h3>
                    {db.type === 'sqlite' && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                        READ-ONLY
                      </span>
                    )}
                    {db.type === 'googlesheets' && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                        FULL CRUD
                      </span>
                    )}
                  </div>
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
          
          {/* Read-Only Database Info */}
          {selectedDb.type === 'sqlite' && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-2">
                <span className="text-blue-600 text-lg">ℹ️</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">SQLite Production Mode: Read-Only</p>
                  <p className="text-sm text-blue-700">
                    Only GET (read) endpoints are available. This is industry standard for SQLite in production environments. 
                    Write operations (POST/PUT/DELETE) are not supported on blob storage.
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    Need write operations? Use PostgreSQL, MySQL, MongoDB, MSSQL, or Google Sheets instead.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Google Sheets Full CRUD Info */}
          {selectedDb.type === 'googlesheets' && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex gap-2">
                <span className="text-green-600 text-lg">✅</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 mb-1">Google Sheets: Full CRUD Support!</p>
                  <p className="text-sm text-green-700">
                    All operations available: GET, POST, PUT, DELETE. 
                    Your spreadsheet becomes a powerful, collaborative database with real-time updates!
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    💡 Edit data in Google Sheets OR via API - changes sync instantly!
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {loading ? (
            <p className="text-gray-600">Loading tables...</p>
          ) : tables.length === 0 ? (
            <p className="text-gray-600">No tables found in this database</p>
          ) : (
            <>
              {endpoints.filter(ep => !savedEndpoints.some(saved => saved.id === ep.id)).length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <Check className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <p className="font-medium">All endpoints have been saved!</p>
                  <p className="text-sm mt-1">Go to the API Tester to test your endpoints.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {tables.map(table => {
                    // Filter out already saved endpoints
                    const tableEndpoints = endpoints.filter(ep => 
                      ep.table === table.name && 
                      !savedEndpoints.some(saved => saved.id === ep.id)
                    );
                    
                    // Skip tables with no available endpoints
                    if (tableEndpoints.length === 0) return null;
                    
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
