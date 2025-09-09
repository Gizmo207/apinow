import { useState, useEffect } from 'react';
import { Database, Table, Eye, Search, RefreshCw } from 'lucide-react';
import { DatabaseManager } from '../utils/database';

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
      const dbManager = DatabaseManager.getInstance();
      // Ensure underlying connection exists (especially for firebase after reload)
      await (dbManager as any).ensureConnection?.(selectedDatabase);
      const schema = await dbManager.introspectDatabase(selectedDatabase.id || selectedDatabase.name);
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
      const dbManager = DatabaseManager.getInstance();
      const data = await dbManager.getTableData(selectedDatabase.id || selectedDatabase.name, table.name, 10);
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
          
          <div className="p-4 max-h-96 overflow-y-auto">
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
                  <h2 className="text-xl font-semibold text-gray-900">{selectedTable.name}</h2>
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
                            {Object.values(row).map((value: any, cellIndex) => (
                              <td key={cellIndex} className="py-2 px-3 text-gray-600">
                                {value !== null ? String(value) : <span className="text-gray-400 italic">null</span>}
                              </td>
                            ))}
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
    </div>
  );
}