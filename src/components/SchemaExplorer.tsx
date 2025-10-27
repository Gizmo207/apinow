import { useState, useEffect } from 'react';
import { Database, Table, Eye, Search, RefreshCw } from 'lucide-react';
import { UnifiedDatabaseService } from '../utils/unifiedDatabase';

interface SchemaExplorerProps {
  databases: any[];
  currentView: string;
  onViewChange: (view: any) => void;
  endpoints: any[];
  user: any;
  onUpgradeClick?: () => void;
}

export function SchemaExplorer({ databases }: SchemaExplorerProps) {
  const [selectedDatabase, setSelectedDatabase] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>({});
  const [showRulesHelper, setShowRulesHelper] = useState(false);
  const [rulesTarget, setRulesTarget] = useState<string | string[] | null>(null);
  const [showInlineRules, setShowInlineRules] = useState(false);
  const [existingRulesInput, setExistingRulesInput] = useState('');
  const [generatedRules, setGeneratedRules] = useState('');
  const [isGeneratingRules, setIsGeneratingRules] = useState(false);

  const toggleCell = (rowIndex: number, key: string) => {
    const id = `${rowIndex}-${key}`;
    setExpandedCells(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const generateRuleSnippet = (collection: string | string[]) => {
    const collections = Array.isArray(collection) ? collection : [collection];
  // NOTE: Firestore requires the literal placeholder {database} in this path; {db} is invalid.
  return `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n${collections.map(c => `    match /${c}/{doc} {\n      // Allow authenticated users to read '${c}' collection\n      allow read: if request.auth != null;\n      // Owner-based write protection (expects userId field)\n      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;\n      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;\n    }`).join('\n')}\n  }\n}`;
  };

  const openRulesHelper = (collection: string | string[]) => {
    setRulesTarget(collection);
    setShowRulesHelper(true);
  };

  const buildCanonicalRules = (ownerCollections: string[], openWrite: string[], readOnly: string[], pub: string[]) => {
    return [
      "rules_version = '2';",
      'service cloud.firestore {',
      // Firestore spec requires {database} here; do not rename.
      `  match /databases/{database}/documents {`,
      '    function authed() { return request.auth != null; }',
      '    function isOwner() { return authed() && request.auth.uid == resource.data.userId; }',
      '    function creatingOwn() { return authed() && request.resource.data.userId != null && request.auth.uid == request.resource.data.userId; }',
      '',
      ...ownerCollections.map(c => `    match /${c}/{doc} {\n      allow create: if creatingOwn();\n      allow read, update, delete: if isOwner();\n    }`),
      '',
      ...openWrite.map(c => `    match /${c}/{doc} {\n      allow read: if authed();\n      allow create, update, delete: if true; // TODO tighten\n    }`),
      '',
      ...readOnly.map(c => `    match /${c}/{doc} { allow read: if authed(); }`),
      '',
      ...pub.map(c => `    match /${c}/{doc} { allow read: if true; }`),
      '',
      '    match /{document=**} {',
      '      allow read, write: if false;',
      '    }',
      '  }',
      '}'
    ].join('\n');
  };

  const generateMergedRules = () => {
    setIsGeneratingRules(true);
    try {
      const existingLower = existingRulesInput.toLowerCase();
      // Basic heuristic classification
      const ownerCandidates = ['classes','recordings','studyplans','notes'];
      const openWriteCandidates = ['transcripts','lectures'];
      const readOnlyCandidates = ['mail','licenses','payments','users'];
      const publicCandidates = ['public'];
      // Include known collections even if absent
      const ensureList = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));
      const owner = ensureList(ownerCandidates.filter(c => existingLower.includes(`/${c}/`))); // start with those present
      const openWrite = ensureList(openWriteCandidates.filter(c => existingLower.includes(`/${c}/`)));
      const readOnly = ensureList(readOnlyCandidates);
      const pub = ensureList(publicCandidates);
      // Add any denied tables currently selected (permissionDenied) into read list automatically
      const deniedTables = tables.filter(t => t.meta?.permissionDenied).map(t => t.name);
      const newlyAdded: string[] = [];
      deniedTables.forEach(n => {
        if (![...owner, ...openWrite, ...readOnly, ...pub].includes(n)) {
          readOnly.push(n);
          newlyAdded.push(n);
        }
      });
  const canonical = buildCanonicalRules(owner, openWrite, readOnly, pub);
      const annotated = newlyAdded.length
        ? canonical + '\n\n// Added read access for newly detected denied collections: ' + newlyAdded.join(', ')
        : canonical;
      setGeneratedRules(annotated);
    } finally {
      setIsGeneratingRules(false);
    }
  };

  useEffect(() => {
    if (databases.length > 0 && !selectedDatabase) {
      setSelectedDatabase(databases[0]);
    }
  }, [databases]);

  useEffect(() => {
    if (selectedDatabase) {
      loadDatabaseSchema();
    }
  }, [selectedDatabase]);

  const loadDatabaseSchema = async () => {
    if (!selectedDatabase) return;
    
    setLoading(true);
    try {
      const unifiedService = UnifiedDatabaseService.getInstance();
      
      // Connect to database using unified service (this will handle admin credentials for Firebase)
      await unifiedService.connectToDatabase(selectedDatabase);
      
      // Introspect database schema (pass connection for Firebase server-side access)
      const schema = await unifiedService.introspectDatabase(selectedDatabase.id, selectedDatabase);
      setTables(schema);
    } catch (error) {
      console.error('Failed to load schema:', error);
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (table: any) => {
    if (!selectedDatabase) return;
    
    setLoading(true);
    try {
      const unifiedService = UnifiedDatabaseService.getInstance();
      
      // Get adapter for this database
      const adapter = unifiedService.getAdapter(selectedDatabase.id);
      if (!adapter) {
        throw new Error('Database adapter not found');
      }
      
      // Query table data directly through adapter
      const data = await adapter.listDocuments(table.name, 10);
      setTableData(data);
      setSelectedTable(table);
    } catch (error) {
      console.error('Failed to load table data:', error);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (databases.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schema Explorer</h1>
          <p className="text-gray-600">Explore your database structure and data</p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Databases Connected</h3>
          <p className="text-gray-600">Connect a database first to explore its schema</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schema Explorer</h1>
          <p className="text-gray-600">Explore your database structure and data</p>
        </div>
        {databases.some(d => d.type === 'firebase') && (
          <button
            onClick={() => setShowInlineRules(prev => !prev)}
            className="px-3 py-2 text-sm rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50"
          >{showInlineRules ? 'Hide Rules Generator' : 'Show Rules Generator'}</button>
        )}
        
        <div className="flex items-center space-x-3">
          <select
            value={selectedDatabase?.id || ''}
            onChange={(e) => {
              const db = databases.find(d => d.id === e.target.value);
              setSelectedDatabase(db);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            title="Select Database"
          >
            <option value="">Select a database...</option>
            {databases.map(db => {
              const isValid = db.type !== 'firebase' || (
                db.config && 
                db.config.apiKey && 
                db.config.apiKey !== 'your-api-key' &&
                db.config.projectId && 
                db.config.projectId !== 'your-project-id'
              );
              return (
                <option key={db.id} value={db.id}>
                  {db.name} {db.type === 'firebase' && !isValid ? ' (Config Incomplete)' : ''}
                </option>
              );
            })}
          </select>
          
          <button
            onClick={loadDatabaseSchema}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
      {showInlineRules && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">Firestore Rules Assistant</h3>
            <button onClick={() => setShowInlineRules(false)} className="text-gray-500 hover:text-gray-700 text-xs">✕</button>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Paste Your Current Rules</label>
              <textarea
                className="w-full h-40 text-xs font-mono p-2 border rounded border-gray-300"
                placeholder="rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents { ... }\n}"
                value={existingRulesInput}
                onChange={e => setExistingRulesInput(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={generateMergedRules}
                disabled={isGeneratingRules}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >{isGeneratingRules ? 'Generating...' : 'Generate Updated Rules'}</button>
              {generatedRules && (
                <button
                  onClick={() => navigator.clipboard.writeText(generatedRules)}
                  className="text-xs text-blue-600 hover:underline"
                >Copy Output</button>
              )}
            </div>
            {generatedRules && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 flex items-center justify-between">
                  <span>Updated Rules (replace existing)</span>
                  <button
                    onClick={() => { setGeneratedRules(''); setExistingRulesInput(''); }}
                    className="text-[10px] text-gray-500 hover:text-gray-700"
                  >Reset</button>
                </label>
                <pre className="text-[11px] bg-gray-900 text-green-200 p-3 rounded max-h-72 overflow-auto whitespace-pre">{generatedRules}</pre>
                <p className="text-[10px] text-gray-500">Publish these in Firebase console, then click Refresh to re-scan collections.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tables List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Tables ({filteredTables.length})</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="p-4 max-h-[30rem] overflow-y-auto space-y-3">
            {/* Permission Denied Banner */}
            {filteredTables.some(t => t.meta?.permissionDenied) && (
              <div className="border border-amber-300 bg-amber-50 text-amber-800 text-xs p-3 rounded flex items-start justify-between space-x-4">
                <div className="space-y-1">
                  <p className="font-medium">Firestore access restricted</p>
                  <p className="leading-snug">We detected collections blocked by your Firestore security rules. Generate a rules snippet to enable read access (owner-safe writes).</p>
                </div>
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => openRulesHelper(filteredTables.filter(t => t.meta?.permissionDenied).map(t => t.name))}
                    className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-[11px]"
                  >Fix All</button>
                  <button
                    onClick={() => loadDatabaseSchema()}
                    className="px-2 py-1 bg-white border border-blue-600 text-blue-600 rounded hover:bg-blue-50 text-[11px]"
                  >Rescan</button>
                </div>
              </div>
            )}
            {loading ? (
              <div className="text-center py-4">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600">Loading schema...</p>
              </div>
            ) : !selectedDatabase ? (
              <div className="text-center py-8">
                <Database className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Select a database to view its schema</p>
              </div>
            ) : filteredTables.length === 0 ? (
              <div className="text-center py-8">
                <Table className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">No tables found</p>
                <p className="text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms' : 'This database appears to be empty'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTables.map(table => (
                  <button
                    key={table.id}
                    onClick={() => loadTableData(table)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedTable?.id === table.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Table className="w-4 h-4" />
                      <span className="font-medium">{table.name}</span>
                      {table.meta?.permissionDenied && (
                        <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">DENIED</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {table.columns.length} columns • {table.rowCount} rows
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table Details */}
        <div className="lg:col-span-2">
          {selectedTable ? (
            <div className="space-y-6">
              {/* Table Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                      <span>{selectedTable.name}</span>
                      {selectedTable.meta?.permissionDenied && (
                        <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded">PERMISSION DENIED</span>
                      )}
                    </h2>
                    {selectedTable.meta?.permissionDenied && (
                      <button
                        onClick={() => openRulesHelper(selectedTable.name)}
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        title="Generate Firestore rule snippet"
                      >Fix Rules</button>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{selectedTable.columns.length} columns</span>
                    <span>{selectedTable.rowCount} rows</span>
                  </div>
                </div>

                {/* Columns */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-gray-700">Column</th>
                        <th className="text-left py-2 text-gray-700">Type</th>
                        <th className="text-left py-2 text-gray-700">Constraints</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTable.columns.map((column: any, index: number) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-2 font-mono text-blue-600">{column.name}</td>
                          <td className="py-2 text-gray-600">{column.type}</td>
                          <td className="py-2">
                            <div className="flex items-center space-x-2">
                              {column.primaryKey && (
                                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">PK</span>
                              )}
                              {column.foreignKey && (
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">FK</span>
                              )}
                              {!column.nullable && (
                                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">NOT NULL</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sample Data */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Sample Data</h3>
                  <button
                    onClick={() => loadTableData(selectedTable)}
                    className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Refresh</span>
                  </button>
                </div>

                {tableData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          {Object.keys(tableData[0]).map(key => (
                            <th key={key} className="text-left py-2 px-3 text-gray-700 font-medium">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            {Object.entries(row).map(([key, value]: any, cellIndex) => {
                              const cellId = `${index}-${key}`;
                              const isObj = value && typeof value === 'object';
                              const isExpanded = expandedCells[cellId];
                              return (
                                <td key={cellIndex} className="py-2 px-3 text-gray-600 align-top">
                                  {value === null ? (
                                    <span className="text-gray-400 italic">null</span>
                                  ) : isObj ? (
                                    <div className="text-xs font-mono">
                                      <button
                                        onClick={() => toggleCell(index, key)}
                                        className="text-blue-600 hover:underline mr-2"
                                        title={isExpanded ? 'Collapse' : 'Expand'}
                                      >
                                        {isExpanded ? '−' : '+'}
                                      </button>
                                      {isExpanded ? (
                                        <pre className="whitespace-pre-wrap break-all max-h-40 overflow-auto bg-gray-50 p-2 rounded border border-gray-200">{JSON.stringify(value, null, 2)}</pre>
                                      ) : (
                                        <code className="bg-gray-100 px-1 py-0.5 rounded">{Array.isArray(value) ? `Array(${value.length})` : 'Object'}</code>
                                      )}
                                    </div>
                                  ) : (
                                    String(value)
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {tableData.length > 5 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Showing first 5 rows of {tableData.length} total
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Table className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No data available</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Table className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Select a Table</h3>
              <p className="text-gray-600">Choose a table from the left to explore its structure and data</p>
            </div>
          )}
        </div>
      </div>
      {showRulesHelper && rulesTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Firestore Rule Snippet {Array.isArray(rulesTarget) ? ' (Multiple Collections)' : <>for <span className="text-blue-600">{rulesTarget}</span></>}</h3>
              <button
                onClick={() => setShowRulesHelper(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
                aria-label="Close"
              >✕</button>
            </div>
            <p className="text-xs text-gray-600">Add this to your Firestore rules to allow the app to read the collection and enforce basic ownership.</p>
            <div className="relative">
              <button
                onClick={() => rulesTarget && navigator.clipboard.writeText(generateRuleSnippet(rulesTarget))}
                className="absolute top-2 right-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >Copy</button>
              <pre className="text-[11px] bg-gray-900 text-green-200 p-3 rounded overflow-auto max-h-72 whitespace-pre">{rulesTarget ? generateRuleSnippet(rulesTarget) : ''}</pre>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>After updating rules, click Refresh to re-scan.</span>
              <button
                onClick={() => { setShowRulesHelper(false); loadDatabaseSchema(); }}
                className="text-blue-600 hover:underline"
              >Reload Schema</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}