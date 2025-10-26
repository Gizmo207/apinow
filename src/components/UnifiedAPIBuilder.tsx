import { useState, useEffect, Fragment } from "react";
import {
  Database,
  Play,
  Code,
  CheckCircle,
  XCircle,
  Loader,
  Save,
  Check,
} from "lucide-react";
import { connectToDatabaseAction, generateEndpointsAction, testEndpointAction } from "../actions/databaseActions";
import { DatabaseConnection } from "../utils/database";
import { APIEndpoint } from "../lib/apiGenerator";

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
  const [viewModes, setViewModes] = useState<Map<string, "pretty" | "raw">>(new Map());
  const [activeSaves, setActiveSaves] = useState<Set<string>>(new Set());
  const [hasGeneratedEndpoints, setHasGeneratedEndpoints] = useState(false);

  useEffect(() => {
    if (databases.length && !selectedDatabase) setSelectedDatabase(databases[0]);
  }, [databases, selectedDatabase]);

  useEffect(() => {
    (async () => {
      try {
        const { FirebaseService } = await import("../services/firebaseService");
        const saved = await FirebaseService.getInstance().getEndpoints();
        setSavedEndpoints(saved);
      } catch (error) {
        console.error("Failed to load endpoints:", error);
      }
    })();
  }, []);

  const handleDatabaseSelect = async (db: DatabaseConnection) => {
    setSelectedDatabase(db);
    setEndpoints([]);
    setTestResults(new Map());
    setHasGeneratedEndpoints(false);
    await generateEndpoints(db);
  };

  const generateEndpoints = async (db: DatabaseConnection) => {
    setLoading(true);
    try {
      await connectToDatabaseAction(db);
      const result = await generateEndpointsAction(db.id, db);
      
      if (result.success && result.endpoints) {
        const unsaved = result.endpoints.filter(ep => 
          !savedEndpoints.some(saved => 
            saved.path === `/api/dynamic${ep.path}` && 
            saved.method === ep.method
          )
        );
        
        setEndpoints(unsaved);
      } else {
        console.error("Endpoint generation failed:", result.error);
        setEndpoints([]);
      }
      setHasGeneratedEndpoints(true);
    } catch (error) {
      console.error("Endpoint generation failed:", error);
      setEndpoints([]);
      setHasGeneratedEndpoints(true);
    } finally {
      setLoading(false);
    }
  };

  const saveEndpoint = async (endpoint: APIEndpoint) => {
    if (!selectedDatabase || activeSaves.has(endpoint.id)) return;

    setActiveSaves(prev => new Set(prev).add(endpoint.id));
    setSavingEndpoint(endpoint.id);

    try {
      const isDuplicate = savedEndpoints.some(
        ep => ep.path === `/api/dynamic${endpoint.path}` && 
              ep.method === endpoint.method
      );

      if (isDuplicate) {
        setEndpoints(prev => prev.filter(e => e.id !== endpoint.id));
        return;
      }

      const { FirebaseService } = await import("../services/firebaseService");
      
      console.log('[UnifiedAPIBuilder] Saving endpoint:', {
        collection: endpoint.collection,
        endpointPath: endpoint.path,
        finalPath: `/api/dynamic${endpoint.path}`
      });
      
      const savedEndpoint = await FirebaseService.getInstance().saveEndpoint({
        name: endpoint.description || `${endpoint.method} ${endpoint.collection}`,
        path: `/api/dynamic${endpoint.path}`,
        method: endpoint.method,
        tableName: endpoint.collection,
        connectionId: selectedDatabase.id,
        authRequired: true,
        filters: [],
        rateLimit: 100,
        isActive: true
      });

      setSavedEndpoints(prev => [...prev, savedEndpoint]);
      setEndpoints(prev => prev.filter(ep => ep.id !== endpoint.id));
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setActiveSaves(prev => {
        const newSet = new Set(prev);
        newSet.delete(endpoint.id);
        return newSet;
      });
      setSavingEndpoint(null);
    }
  };

  const testEndpoint = async (endpoint: APIEndpoint) => {
    if (!selectedDatabase) return;
    setTestingEndpoint(endpoint.id);

    try {
      const params: any = {};
      const body: any = {};

      if (endpoint.method === "POST") {
        Object.assign(body, {
          name: "Test Document",
          description: "Created via Unified API Builder",
          createdAt: new Date().toISOString(),
        });
      }

      const result = await testEndpointAction(
        selectedDatabase.id,
        endpoint.id,
        params,
        body
      );

      if (result.success) {
        setTestResults(prev => new Map(prev.set(endpoint.id, {
          success: true,
          data: result.result,
          timestamp: new Date().toISOString()
        })));
      } else {
        throw new Error(result.error || 'Test failed');
      }
    } catch (error: any) {
      setTestResults(prev => new Map(prev.set(endpoint.id, {
        success: false,
        error: error.message || "Unknown error",
        timestamp: new Date().toISOString()
      })));
    } finally {
      setTestingEndpoint(null);
    }
  };

  const renderTestResult = (endpointId: string) => {
    const res = testResults.get(endpointId);
    if (!res) return null;
    const mode = viewModes.get(endpointId) || "pretty";

    if (!res.success) return (
      <div className="flex items-center gap-1 mt-2 text-red-800">
        <XCircle className="w-4 h-4" />
        <span className="text-sm">{res.error}</span>
      </div>
    );

    return (
      <div className="mt-2 p-3 rounded bg-green-50 border border-green-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="font-medium text-green-800 text-sm">Test Successful</span>
          </div>
          <div className="flex gap-1 bg-white rounded p-1">
            {["pretty", "raw"].map(m => (
              <button
                key={m}
                onClick={() => setViewModes(prev => new Map(prev.set(endpointId, m as any)))}
                className={`px-2 py-0.5 text-xs rounded ${
                  mode === m ? "bg-blue-100 text-blue-700 font-semibold" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {mode === "pretty" ? (
          <pre className="text-xs overflow-x-auto p-2 bg-white rounded">
            {JSON.stringify(res.data, null, 2)}
          </pre>
        ) : (
          <pre className="text-xs overflow-x-auto p-2 bg-white rounded">
            {JSON.stringify(res.data, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">🔍 API Explorer</h1>
        <p className="text-gray-600">
          Browse auto-generated endpoints, test them, and save the ones you want.
        </p>
        {savedEndpoints.length > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            💾 {savedEndpoints.length} saved endpoints
          </p>
        )}
      </header>

      <section className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Select Database</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {databases.map(db => (
            <div
              key={db.id}
              onClick={() => handleDatabaseSelect(db)}
              className={`p-4 border rounded-lg cursor-pointer ${
                selectedDatabase?.id === db.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-gray-600" />
                <div>
                  <div className="font-medium">{db.name}</div>
                  <div className="text-sm text-gray-500 capitalize">{db.type}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedDatabase && (
        <section className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Available Endpoints</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : !hasGeneratedEndpoints ? (
            <div className="text-center py-12 text-gray-500">
              <p>Select a database above to view available endpoints</p>
            </div>
          ) : endpoints.length === 0 ? (
            <div className="text-center py-12 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">All Endpoints Saved! 🎉</h3>
              <p className="text-green-700 mb-4">
                You've saved all available endpoints from this database.
              </p>
            </div>
          ) : (
            endpoints.map(ep => (
              <div key={ep.id} className="border border-gray-200 rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      ep.method === "GET" ? "text-blue-600 bg-blue-50" :
                      ep.method === "POST" ? "text-green-600 bg-green-50" :
                      ep.method === "PUT" ? "text-yellow-600 bg-yellow-50" :
                      ep.method === "DELETE" ? "text-red-600 bg-red-50" :
                      "text-gray-600 bg-gray-50"
                    }`}>
                      {ep.method}
                    </span>
                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {ep.path}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => testEndpoint(ep)}
                      disabled={testingEndpoint === ep.id}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      {testingEndpoint === ep.id ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Test
                    </button>
                    <button
                      onClick={() => saveEndpoint(ep)}
                      disabled={savingEndpoint === ep.id || savedEndpoints.some(s => s.path === `/api/dynamic${ep.path}` && s.method === ep.method)}
                      className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                      {savingEndpoint === ep.id ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : savedEndpoints.some(s => s.path === `/api/dynamic${ep.path}` && s.method === ep.method) ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{ep.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Collection: {ep.collection}</span>
                  <span>ID: {ep.id}</span>
                </div>
                {renderTestResult(ep.id)}
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}