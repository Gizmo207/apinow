import { useState, useEffect } from 'react';
import { Database, Play, Code, CheckCircle, XCircle, Loader, Save, Bookmark } from 'lucide-react';
import { UnifiedDatabaseService } from '../utils/unifiedDatabase';
import { DatabaseConnection } from '../utils/database';
import { APIEndpoint } from '../lib/apiGenerator';

interface UnifiedAPIBuilderProps {
  databases: DatabaseConnection[];
}

export function UnifiedAPIBuilder({ databases }: UnifiedAPIBuilderProps) {
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseConnection | null>(null);
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<Map<string, any>>(new Map());
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [savingEndpoint, setSavingEndpoint] = useState<string | null>(null);
  const [savedEndpoints, setSavedEndpoints] = useState<any[]>([]);
  const [viewModes, setViewModes] = useState<Map<string, 'pretty' | 'raw'>>(new Map());

  const unifiedService = UnifiedDatabaseService.getInstance();

  useEffect(() => {
    if (databases.length > 0 && !selectedDatabase) {
      setSelectedDatabase(databases[0]);
    }
  }, [databases, selectedDatabase]);

  // Load saved endpoints
  useEffect(() => {
    const loadSavedEndpoints = async () => {
      try {
        const { FirebaseService } = await import('../services/firebaseService');
        const firebaseService = FirebaseService.getInstance();
        const saved = await firebaseService.getEndpoints();
        setSavedEndpoints(saved);
      } catch (error) {
        console.error('Failed to load saved endpoints:', error);
      }
    };
    loadSavedEndpoints();
  }, []);

  const handleDatabaseSelect = async (database: DatabaseConnection) => {
    setSelectedDatabase(database);
    setEndpoints([]);
    setTestResults(new Map());
    
    if (database) {
      await generateEndpoints(database);
    }
  };

  const generateEndpoints = async (database: DatabaseConnection) => {
    setLoading(true);
    try {
      // Connect to database using unified service
      await unifiedService.connectToDatabase(database);
      
      // Generate API endpoints
      const generatedEndpoints = await unifiedService.generateAPIEndpoints(database.id);
      setEndpoints(generatedEndpoints);
      
      console.log(`Generated ${generatedEndpoints.length} endpoints for ${database.name}`);
    } catch (error) {
      console.error('Failed to generate endpoints:', error);
      setEndpoints([]);
    } finally {
      setLoading(false);
    }
  };

  const saveEndpoint = async (endpoint: APIEndpoint) => {
    if (!selectedDatabase) return;
    
    setSavingEndpoint(endpoint.id);
    
    try {
      const { FirebaseService } = await import('../services/firebaseService');
      const firebaseService = FirebaseService.getInstance();
      
      const endpointConfig = {
        name: endpoint.description || `${endpoint.method} ${endpoint.collection}`,
        path: `/api/dynamic${endpoint.path}`,
        method: endpoint.method as 'GET' | 'POST' | 'PUT' | 'DELETE',
        tableName: endpoint.collection,
        connectionId: selectedDatabase.id,
        authRequired: true,
        filters: [],
        rateLimit: 100,
        isActive: true
      };

      const savedEndpoint = await firebaseService.saveEndpoint(endpointConfig);
      setSavedEndpoints(prev => [...prev, savedEndpoint]);
      
      alert(`✅ API endpoint saved! You can now use it at:\n${endpointConfig.path}`);
    } catch (error) {
      console.error('Failed to save endpoint:', error);
      alert('Failed to save endpoint: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSavingEndpoint(null);
    }
  };

  const testEndpoint = async (endpoint: APIEndpoint) => {
    if (!selectedDatabase) return;
    
    setTestingEndpoint(endpoint.id);
    
    try {
      let result;
      const params: any = {};
      const body: any = {};

      // Prepare test data based on endpoint type
      if (endpoint.method === 'GET' && endpoint.path.includes(':id')) {
        // For single document read, we need an ID
        // Try to get the first document to get a valid ID
        const listEndpoint = endpoints.find(e => 
          e.collection === endpoint.collection && 
          e.method === 'GET' && 
          !e.path.includes(':id')
        );
        
        if (listEndpoint) {
          const docs = await unifiedService.executeAPIEndpoint(
            selectedDatabase.id, 
            listEndpoint.id, 
            { limit: 1 }
          );
          
          if (docs && docs.length > 0) {
            params.id = docs[0].id;
          } else {
            throw new Error('No documents found to test with');
          }
        }
      } else if (endpoint.method === 'POST') {
        // For create, use sample data
        Object.assign(body, {
          name: 'Test Document',
          description: 'Created via unified API builder',
          createdAt: new Date().toISOString(),
          testField: true
        });
      } else if (endpoint.method === 'PUT') {
        // For update, we need an ID and update data
        const listEndpoint = endpoints.find(e => 
          e.collection === endpoint.collection && 
          e.method === 'GET' && 
          !e.path.includes(':id')
        );
        
        if (listEndpoint) {
          const docs = await unifiedService.executeAPIEndpoint(
            selectedDatabase.id, 
            listEndpoint.id, 
            { limit: 1 }
          );
          
          if (docs && docs.length > 0) {
            params.id = docs[0].id;
            Object.assign(body, {
              updatedAt: new Date().toISOString(),
              testUpdate: true
            });
          } else {
            throw new Error('No documents found to test with');
          }
        }
      }

      result = await unifiedService.executeAPIEndpoint(
        selectedDatabase.id,
        endpoint.id,
        params,
        body
      );

      setTestResults(prev => new Map(prev.set(endpoint.id, {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      })));

    } catch (error) {
      console.error(`Test failed for ${endpoint.id}:`, error);
      setTestResults(prev => new Map(prev.set(endpoint.id, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })));
    } finally {
      setTestingEndpoint(null);
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'text-blue-600 bg-blue-50';
      case 'POST': return 'text-green-600 bg-green-50';
      case 'PUT': return 'text-yellow-600 bg-yellow-50';
      case 'DELETE': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatValue = (value: any): string => {
    // Handle Firestore timestamps
    if (typeof value === 'object' && value !== null) {
      if (value.seconds !== undefined && value.nanoseconds !== undefined) {
        const date = new Date(value.seconds * 1000);
        return date.toLocaleString();
      }
      if (value._seconds !== undefined) {
        const date = new Date(value._seconds * 1000);
        return date.toLocaleString();
      }
    }
    
    // Handle other types
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const renderPrettyView = (data: any) => {
    try {
      // Case 1: Array of objects - render as table
      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0] || {});
        
        return (
          <div className="overflow-auto max-h-64 mt-2">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  {headers.map(header => (
                    <th key={header} className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row: any, rowIndex: number) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {headers.map(header => (
                      <td key={header} className="border border-gray-300 px-2 py-1 text-gray-600">
                        {formatValue(row[header])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      
      // Case 2: Single object - render as key-value pairs
      if (typeof data === 'object' && data !== null) {
        return (
          <div className="overflow-auto max-h-64 space-y-1 p-2 mt-2 text-xs">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="flex border-b border-gray-200 pb-1">
                <span className="font-semibold text-gray-700 w-1/3">{key}:</span>
                <span className="text-gray-600 w-2/3 break-all">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        );
      }
      
      // Fallback: render as formatted JSON
      return (
        <pre className="text-xs overflow-x-auto mt-2 p-2 bg-gray-50 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
    } catch (error) {
      return (
        <pre className="text-xs overflow-x-auto mt-2 p-2">
          {String(data)}
        </pre>
      );
    }
  };

  const renderTestResult = (endpointId: string) => {
    const result = testResults.get(endpointId);
    if (!result) return null;

    const viewMode = viewModes.get(endpointId) || 'pretty';

    return (
      <div className={`mt-2 p-3 rounded ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        {result.success ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-800 text-sm">Test Successful</span>
              </div>
              {/* Pretty/Raw Toggle */}
              <div className="flex gap-1 bg-white rounded p-1">
                <button
                  onClick={() => setViewModes(prev => new Map(prev.set(endpointId, 'pretty')))}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    viewMode === 'pretty'
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Pretty
                </button>
                <button
                  onClick={() => setViewModes(prev => new Map(prev.set(endpointId, 'raw')))}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    viewMode === 'raw'
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Raw
                </button>
              </div>
            </div>
            {viewMode === 'pretty' ? (
              renderPrettyView(result.data)
            ) : (
              <pre className="text-xs overflow-x-auto p-2 bg-white rounded">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-red-800">
            <XCircle className="w-4 h-4" />
            <span className="text-sm">{result.error}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🔍 API Explorer</h1>
        <p className="text-gray-600">
          Browse auto-generated endpoints, test them, and save the ones you want to use
        </p>
      </div>

      {/* My Saved APIs Section */}
      {savedEndpoints.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bookmark className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-blue-900">My Saved APIs ({savedEndpoints.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {savedEndpoints.map((endpoint) => (
              <div key={endpoint.id} className="flex items-center gap-2 bg-white p-2 rounded text-sm">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMethodColor(endpoint.method)}`}>
                  {endpoint.method}
                </span>
                <code className="text-xs font-mono text-gray-700">{endpoint.path}</code>
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-700 mt-2">
            💡 These APIs are now live! Test them in the API Tester tab.
          </p>
        </div>
      )}

      {/* Database Selection */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Select Database</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {databases.map((database) => (
            <div
              key={database.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedDatabase?.id === database.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleDatabaseSelect(database)}
            >
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-gray-600" />
                <div>
                  <div className="font-medium">{database.name}</div>
                  <div className="text-sm text-gray-500 capitalize">{database.type}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generated Endpoints */}
      {selectedDatabase && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Generated API Endpoints</h2>
            {loading && <Loader className="w-5 h-5 animate-spin text-blue-600" />}
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Generating endpoints...
            </div>
          ) : endpoints.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No endpoints available. Make sure the database is connected and has collections.
            </div>
          ) : (
            <div className="space-y-4">
              {endpoints.map((endpoint) => (
                <div
                  key={endpoint.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(endpoint.method)}`}>
                        {endpoint.method}
                      </span>
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {endpoint.path}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => testEndpoint(endpoint)}
                        disabled={testingEndpoint === endpoint.id}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        {testingEndpoint === endpoint.id ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        Test
                      </button>
                      <button
                        onClick={() => saveEndpoint(endpoint)}
                        disabled={savingEndpoint === endpoint.id || savedEndpoints.some(saved => saved.path === `/api/dynamic${endpoint.path}`)}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                        title={savedEndpoints.some(saved => saved.path === `/api/dynamic${endpoint.path}`) ? 'Already saved' : 'Save this endpoint'}
                      >
                        {savingEndpoint === endpoint.id ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : savedEndpoints.some(saved => saved.path === `/api/dynamic${endpoint.path}`) ? (
                          <Bookmark className="w-4 h-4 fill-current" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {savedEndpoints.some(saved => saved.path === `/api/dynamic${endpoint.path}`) ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{endpoint.description}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Collection: {endpoint.collection}</span>
                    <span>ID: {endpoint.id}</span>
                  </div>

                  {renderTestResult(endpoint.id)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* API Documentation Preview */}
      {endpoints.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Code className="w-5 h-5" />
            <h2 className="text-lg font-semibold">API Documentation</h2>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Base URL</h3>
            <code className="text-sm">http://localhost:3000/api</code>
            
            <h3 className="font-medium mb-2 mt-4">Available Collections</h3>
            <div className="space-y-1">
              {Array.from(new Set(endpoints.map(e => e.collection))).map(collection => (
                <div key={collection} className="text-sm">
                  <code>/{collection}</code> - CRUD operations available
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
