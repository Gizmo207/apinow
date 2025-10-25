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
import { UnifiedDatabaseService } from "../utils/unifiedDatabase";
import { DatabaseConnection } from "../utils/database";
import { APIEndpoint } from "../lib/apiGenerator";

/* ---------------------------------------------------------
   🔹 Unified API Builder
   - Generates CRUD endpoints for any connected database
   - Allows live testing & saving to Firestore
   - Includes Pretty / Raw response toggle
--------------------------------------------------------- */

interface UnifiedAPIBuilderProps {
  databases: DatabaseConnection[];
}

export function UnifiedAPIBuilder({ databases }: UnifiedAPIBuilderProps) {
  /* ------------------ STATE ------------------ */
  const [selectedDatabase, setSelectedDatabase] =
    useState<DatabaseConnection | null>(null);
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<Map<string, any>>(new Map());
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [savingEndpoint, setSavingEndpoint] = useState<string | null>(null);
  const [savedEndpoints, setSavedEndpoints] = useState<any[]>([]);
  const [viewModes, setViewModes] = useState<Map<string, "pretty" | "raw">>(
    new Map()
  );
  const [activeSaves, setActiveSaves] = useState<Set<string>>(new Set());

  const unifiedService = UnifiedDatabaseService.getInstance();

  /* ------------------ LIFECYCLE ------------------ */

  // Auto-select first database
  useEffect(() => {
    if (databases.length && !selectedDatabase) setSelectedDatabase(databases[0]);
  }, [databases, selectedDatabase]);

  // Load already-saved endpoints
  useEffect(() => {
    (async () => {
      try {
        const { FirebaseService } = await import("../services/firebaseService");
        const firebaseService = FirebaseService.getInstance();
        const saved = await firebaseService.getEndpoints();
        setSavedEndpoints(saved);
      } catch (err) {
        console.error("Failed to load saved endpoints:", err);
      }
    })();
  }, []);

  /* ------------------ HANDLERS ------------------ */

  // 🔄 Select database & generate endpoints
  const handleDatabaseSelect = async (db: DatabaseConnection) => {
    setSelectedDatabase(db);
    setEndpoints([]);
    setTestResults(new Map());
    await generateEndpoints(db);
  };

  // ⚙️ Generate endpoints for selected DB
  const generateEndpoints = async (db: DatabaseConnection) => {
    setLoading(true);
    try {
      await unifiedService.connectToDatabase(db);
      const generated = await unifiedService.generateAPIEndpoints(db.id);
      console.log(`🔍 Generated ${generated.length} endpoints`);

      // Filter out already-saved ones
      const unsaved = generated.filter(
        (ep) =>
          !savedEndpoints.some(
            (s) =>
              s.path === `/api/dynamic${ep.path}` && s.method === ep.method
          )
      );
      setEndpoints(unsaved);
      console.log(
        `✨ Showing ${unsaved.length} new endpoint(s) for ${db.name}`
      );
    } catch (err) {
      console.error("Endpoint generation failed:", err);
      setEndpoints([]);
    } finally {
      setLoading(false);
    }
  };

  // 💾 Save endpoint to Firestore
  const saveEndpoint = async (endpoint: APIEndpoint) => {
    if (!selectedDatabase || activeSaves.has(endpoint.id)) return;

    setActiveSaves((prev) => new Set(prev).add(endpoint.id));
    setSavingEndpoint(endpoint.id);

    try {
      const isDuplicate = savedEndpoints.some(
        (ep) =>
          ep.path === `/api/dynamic${endpoint.path}` &&
          ep.method === endpoint.method
      );
      if (isDuplicate) {
        setEndpoints((prev) => prev.filter((e) => e.id !== endpoint.id));
        return;
      }

      const config = {
        name: endpoint.description || `${endpoint.method} ${endpoint.collection}`,
        path: `/api/dynamic${endpoint.path}`,
        method: endpoint.method,
        tableName: endpoint.collection,
        connectionId: selectedDatabase.id,
        authRequired: true,
        filters: [],
        rateLimit: 100,
        isActive: true,
      };

      const { FirebaseService } = await import("../services/firebaseService");
      const firebase = FirebaseService.getInstance();
      const saved = await firebase.saveEndpoint(config);

      setSavedEndpoints((prev) =>
        prev.some((ep) => ep.path === saved.path && ep.method === saved.method)
          ? prev
          : [...prev, saved]
      );
      setEndpoints((prev) => prev.filter((ep) => ep.id !== endpoint.id));
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setActiveSaves((prev) => {
        const s = new Set(prev);
        s.delete(endpoint.id);
        return s;
      });
      setSavingEndpoint(null);
    }
  };

  // 🧪 Run endpoint test
  const testEndpoint = async (endpoint: APIEndpoint) => {
    if (!selectedDatabase) return;
    setTestingEndpoint(endpoint.id);

    try {
      const params: any = {};
      const body: any = {};

      // Prepare request body / params
      if (endpoint.method === "POST") {
        Object.assign(body, {
          name: "Test Document",
          description: "Created via Unified API Builder",
          createdAt: new Date().toISOString(),
        });
      }

      const result = await unifiedService.executeAPIEndpoint(
        selectedDatabase.id,
        endpoint.id,
        params,
        body
      );

      setTestResults((prev) =>
        new Map(
          prev.set(endpoint.id, {
            success: true,
            data: result,
            timestamp: new Date().toISOString(),
          })
        )
      );
    } catch (err: any) {
      setTestResults((prev) =>
        new Map(
          prev.set(endpoint.id, {
            success: false,
            error: err.message || "Unknown error",
            timestamp: new Date().toISOString(),
          })
        )
      );
    } finally {
      setTestingEndpoint(null);
    }
  };

  /* ------------------ HELPERS ------------------ */

  const getMethodColor = (method: string) =>
    ({
      GET: "text-blue-600 bg-blue-50",
      POST: "text-green-600 bg-green-50",
      PUT: "text-yellow-600 bg-yellow-50",
      DELETE: "text-red-600 bg-red-50",
    }[method] || "text-gray-600 bg-gray-50");

  const formatValue = (v: any): string => {
    if (v?.seconds || v?._seconds) {
      const s = v.seconds ?? v._seconds;
      return new Date(s * 1000).toLocaleString();
    }
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  const renderPrettyView = (data: any) => {
    if (Array.isArray(data) && data.length) {
      const headers = Object.keys(data[0]);
      return (
        <div className="overflow-auto max-h-64 mt-2">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {headers.map((h) => (
                    <td
                      key={h}
                      className="border border-gray-300 px-2 py-1 text-gray-600"
                    >
                      {formatValue(r[h])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (typeof data === "object" && data !== null) {
      return (
        <div className="overflow-auto max-h-64 space-y-1 p-2 mt-2 text-xs">
          {Object.entries(data).map(([k, v]) => (
            <div key={k} className="flex border-b border-gray-200 pb-1">
              <span className="font-semibold text-gray-700 w-1/3">{k}:</span>
              <span className="text-gray-600 w-2/3 break-all">
                {formatValue(v)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return (
      <pre className="text-xs overflow-x-auto mt-2 p-2 bg-gray-50 rounded">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  const renderTestResult = (endpointId: string) => {
    const res = testResults.get(endpointId);
    if (!res) return null;
    const mode = viewModes.get(endpointId) || "pretty";

    if (!res.success)
      return (
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
            <span className="font-medium text-green-800 text-sm">
              Test Successful
            </span>
          </div>
          <div className="flex gap-1 bg-white rounded p-1">
            {["pretty", "raw"].map((m) => (
              <button
                key={m}
                onClick={() =>
                  setViewModes((prev) => new Map(prev.set(endpointId, m as any)))
                }
                className={`px-2 py-0.5 text-xs rounded ${
                  mode === m
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {mode === "pretty" ? (
          renderPrettyView(res.data)
        ) : (
          <pre className="text-xs overflow-x-auto p-2 bg-white rounded">
            {JSON.stringify(res.data, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  /* ------------------ RENDER ------------------ */

  const renderEndpoints = () => {
    if (loading)
      return <div className="text-center py-8 text-gray-500">Loading...</div>;

    if (!endpoints.length)
      return (
        <div className="text-center py-12 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            All Endpoints Saved! 🎉
          </h3>
          <p className="text-green-700 mb-4">
            You've saved all available endpoints from this database.
          </p>
        </div>
      );

    return endpoints.map((ep) => (
      <Fragment key={ep.id}>
        <div className="border border-gray-200 rounded-lg p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(
                  ep.method
                )}`}
              >
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
                disabled={
                  savingEndpoint === ep.id ||
                  savedEndpoints.some(
                    (s) => s.path === `/api/dynamic${ep.path}`
                  )
                }
                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                {savingEndpoint === ep.id ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : savedEndpoints.some(
                    (s) => s.path === `/api/dynamic${ep.path}`
                  ) ? (
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
      </Fragment>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-gray-900">🔍 API Explorer</h1>
        <p className="text-gray-600">
          Browse auto-generated endpoints, test them, and save the ones you
          want.
        </p>
        {savedEndpoints.length > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            💾 {savedEndpoints.length} saved{" "}
            {savedEndpoints.length === 1 ? "endpoint" : "endpoints"}
          </p>
        )}
      </header>

      {/* DB Selector */}
      <section className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Select Database</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {databases.map((db) => (
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
                  <div className="text-sm text-gray-500 capitalize">
                    {db.type}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Endpoints */}
      {selectedDatabase && (
        <section className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Available Endpoints</h2>
          {renderEndpoints()}
        </section>
      )}

      {/* Docs Preview */}
      {!!endpoints.length && (
        <section className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Code className="w-5 h-5" />
            <h2 className="text-lg font-semibold">API Documentation</h2>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Base URL</h3>
            <code className="text-sm">http://localhost:3000/api</code>
            <h3 className="font-medium mb-2 mt-4">Available Collections</h3>
            {Array.from(new Set(endpoints.map((e) => e.collection))).map(
              (c) => (
                <div key={c} className="text-sm">
                  <code>/{c}</code> - CRUD operations available
                </div>
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}
