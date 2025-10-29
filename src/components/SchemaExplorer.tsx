import React, { useState, useEffect } from 'react';
import { Database, Table, RefreshCw } from 'lucide-react';
import { getSQLiteSchema, querySQLite } from '@/lib/sqliteClient';

interface SchemaExplorerProps {
  databases: any[];
}

export function SchemaExplorer({ databases }: SchemaExplorerProps) {
  const [selectedDb, setSelectedDb] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (databases.length > 0 && !selectedDb) {
      setSelectedDb(databases[0]);
    }
  }, [databases]);

  useEffect(() => {
    if (selectedDb) {
      loadSchema();
    }
  }, [selectedDb]);

  const loadSchema = async () => {
    if (!selectedDb) return;
    
    console.log('Loading schema for database:', selectedDb);
    
    setLoading(true);
    try {
      if (selectedDb.type === 'sqlite') {
        // Client-side SQLite: Load from IndexedDB
        console.log('Loading SQLite schema from IndexedDB');
        const { tables: tablesList, schema } = await getSQLiteSchema(selectedDb.filePath);
        const formattedTables = tablesList.map((tableName: string) => ({
          name: tableName,
          columns: schema[tableName] || []
        }));
        setTables(formattedTables);
        setLoading(false);
        return;
      }
      
      let res;
      if (selectedDb.type === 'mysql') {
        console.log('Calling MySQL connect API with:', selectedDb.connectionString);
        res = await fetch('/api/mysql/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionString: selectedDb.connectionString })
        });
      } else if (selectedDb.type === 'postgresql') {
        console.log('Calling PostgreSQL connect API with:', selectedDb.connectionString);
        res = await fetch('/api/postgresql/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionString: selectedDb.connectionString })
        });
      } else {
        throw new Error(`Database type ${selectedDb.type} not yet supported`);
      }

      if (!res.ok) {
        const errorData = await res.json();
        console.error('API Error:', errorData);
        throw new Error('Failed to load schema');
      }

      const data = await res.json();
      console.log('API Response:', data);
      
      // MySQL returns tables array directly, SQLite returns it in tables property
      const tablesList = data.tables || [];
      console.log('Tables list:', tablesList);
      
      // Convert MySQL and PostgreSQL tables to the format expected
      if (selectedDb.type === 'mysql' || selectedDb.type === 'postgresql') {
        const formattedTables = tablesList.map((tableName: string) => ({
          name: tableName,
          columns: data.schema[tableName] || []
        }));
        console.log(`Formatted ${selectedDb.type} tables:`, formattedTables);
        setTables(formattedTables);
      } else {
        setTables(tablesList);
      }
    } catch (error) {
      console.error('Failed to load schema:', error);
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (table: any) => {
    setLoading(true);
    try {
      if (selectedDb.type === 'sqlite') {
        // Client-side SQLite: Query from IndexedDB
        const rows = await querySQLite(selectedDb.filePath, `SELECT * FROM ${table.name} LIMIT 100`);
        setTableData(rows);
        setSelectedTable(table);
        setLoading(false);
        return;
      }
      
      let res;
      if (selectedDb.type === 'mysql') {
        res = await fetch('/api/mysql/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectionString: selectedDb.connectionString,
            query: `SELECT * FROM ${table.name} LIMIT 100`
          })
        });
      } else if (selectedDb.type === 'postgresql') {
        res = await fetch('/api/postgresql/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectionString: selectedDb.connectionString,
            query: `SELECT * FROM ${table.name} LIMIT 100`
          })
        });
      } else {
        throw new Error(`Database type ${selectedDb.type} not yet supported`);
      }

      if (!res.ok) throw new Error('Failed to load table data');

      const data = await res.json();
      const rows = data.rows || data.data || [];
      setTableData(rows);
      setSelectedTable(table);
    } catch (error) {
      console.error('Failed to load table data:', error);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  if (databases.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No databases</h3>
        <p className="text-gray-600">Upload a database first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schema Explorer</h1>
          <p className="text-gray-600 mt-1">Browse your database schema and data</p>
        </div>
        <select
          value={selectedDb?.id || ''}
          onChange={(e) => setSelectedDb(databases.find(db => db.id === e.target.value))}
          className="px-3 py-2 border rounded-lg"
        >
          {databases.map(db => (
            <option key={db.id} value={db.id}>{db.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Tables List */}
        <div className="col-span-1 bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Tables</h3>
            <button onClick={loadSchema} className="p-1 hover:bg-gray-100 rounded">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {loading && !tables.length ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <div className="space-y-2">
              {tables.map(table => (
                <button
                  key={table.name}
                  onClick={() => loadTableData(table)}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${
                    selectedTable?.name === table.name
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <Table className="w-4 h-4 inline mr-2" />
                  {table.name}
                  <span className="text-xs text-gray-500 ml-2">({table.rowCount})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table Data */}
        <div className="col-span-3 bg-white rounded-lg border">
          {selectedTable ? (
            <div>
              <div className="p-4 border-b">
                <h3 className="font-semibold">{selectedTable.name}</h3>
                <p className="text-sm text-gray-600">{selectedTable.columns.length} columns, {selectedTable.rowCount} rows</p>
              </div>
              <div className="overflow-auto max-h-[600px]">
                {loading ? (
                  <p className="p-4 text-gray-500">Loading...</p>
                ) : tableData.length === 0 ? (
                  <p className="p-4 text-gray-500">No data</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {selectedTable.columns.map((col: any) => (
                          <th key={col.name} className="px-4 py-2 text-left font-medium">
                            {col.name}
                            <span className="text-xs text-gray-500 ml-1">{col.type}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, i) => (
                        <tr key={i} className="border-t hover:bg-gray-50">
                          {selectedTable.columns.map((col: any) => (
                            <td key={col.name} className="px-4 py-2">
                              {row[col.name] !== null && row[col.name] !== undefined
                                ? String(row[col.name])
                                : <span className="text-gray-400 italic">null</span>
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              Select a table to view its data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
