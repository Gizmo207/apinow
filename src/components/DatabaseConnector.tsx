import { useState } from 'react';
import { Database, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { storeSQLiteFile } from '@/lib/sqliteBrowser';
import { getProviderOptions, getProvider, type Engine } from '@/config/providers';
import { DynamicProviderForm } from './DynamicProviderForm';

interface DatabaseConnectorProps {
  databases: any[];
  onAdd: (db: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function DatabaseConnector({ databases, onAdd, onDelete }: DatabaseConnectorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [dbEngine, setDbEngine] = useState<Engine | ''>('');
  const [providerKey, setProviderKey] = useState('');
  const [dbName, setDbName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editConnectionString, setEditConnectionString] = useState('');

  // Database engines we currently support
  const engines: { value: Engine; label: string; description: string }[] = [
    { value: 'sqlite', label: 'SQLite', description: 'Embedded, browser-based' },
    { value: 'mysql', label: 'MySQL', description: 'Popular open-source' },
    { value: 'mariadb', label: 'MariaDB', description: 'MySQL-compatible fork' },
    { value: 'postgresql', label: 'PostgreSQL', description: 'Advanced features' },
    { value: 'mssql', label: 'Microsoft SQL Server', description: 'Enterprise database' },
    { value: 'mongodb', label: 'MongoDB', description: 'Document database (NoSQL)' },
    { value: 'redis', label: 'Redis', description: 'Key-value store (cache)' },
  ];

  const handleEdit = (db: any) => {
    setEditingId(db.id);
    setEditName(db.name);
    setEditConnectionString(db.connectionString || '');
  };

  const handleSaveEdit = async (db: any) => {
    try {
      const updatedDb = {
        ...db,
        name: editName,
        connectionString: editConnectionString,
      };
      
      const updatedDatabases = databases.map(d => d.id === db.id ? updatedDb : d);
      localStorage.setItem('sqlite_databases', JSON.stringify(updatedDatabases));
      window.location.reload();
    } catch (error) {
      console.error('Failed to update database:', error);
      alert('Failed to update database');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditConnectionString('');
  };

  const handleProviderSubmit = async (values: Record<string, any>) => {
    setUploading(true);
    try {
      const provider = getProvider(providerKey);
      if (!provider) throw new Error('Provider not found');

      if (provider.engine === 'sqlite' && values.file) {
        // SQLite: Store file in browser
        const dbId = await storeSQLiteFile(values.file);

        await onAdd({
          id: dbId,
          name: dbName || values.file.name,
          type: 'sqlite',
          filePath: dbId,
          fileName: values.file.name,
          provider: provider.name,
          providerKey,
          createdAt: new Date().toISOString()
        });
      } else if (values.connectionString) {
        // Other databases: Use connection string
        await onAdd({
          id: Math.random().toString(36).substr(2, 9),
          name: dbName,
          type: provider.engine,
          provider: provider.name,
          providerKey,
          connectionString: values.connectionString,
          createdAt: new Date().toISOString()
        });
      }

      // Reset form
      setDbName('');
      setDbEngine('');
      setProviderKey('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add database:', error);
      alert('Failed to add database');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🗄️ Databases</h1>
          <p className="text-gray-600 mt-1">Connect and manage your databases</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Connect Database
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Connect Database</h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setDbEngine('');
                setProviderKey('');
                setDbName('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Database Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Database Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={dbName}
                onChange={e => setDbName(e.target.value)}
                placeholder="My Database"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Engine Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Database Engine <span className="text-red-600">*</span>
              </label>
              <select
                value={dbEngine}
                onChange={e => {
                  setDbEngine(e.target.value as Engine);
                  setProviderKey(''); // Reset provider when engine changes
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select database engine...</option>
                {engines.map(eng => (
                  <option key={eng.value} value={eng.value}>
                    {eng.label} - {eng.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Provider Selection */}
            {dbEngine && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider <span className="text-red-600">*</span>
                </label>
                <select
                  value={providerKey}
                  onChange={e => setProviderKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select provider...</option>
                  {getProviderOptions(dbEngine).map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Dynamic Provider Form */}
            {providerKey && (
              <div className="pt-4 border-t">
                <DynamicProviderForm
                  providerKey={providerKey}
                  onSubmit={handleProviderSubmit}
                  onCancel={() => {
                    setShowAddForm(false);
                    setDbEngine('');
                    setProviderKey('');
                    setDbName('');
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Database List */}
      {databases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No databases connected</h3>
          <p className="text-gray-600 mb-4">Click "Connect Database" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {databases.map((db) => (
            <div key={db.id} className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow">
              {editingId === db.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm"
                    placeholder="Database name"
                  />
                  {db.connectionString && (
                    <input
                      type="text"
                      value={editConnectionString}
                      onChange={e => setEditConnectionString(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm font-mono"
                      placeholder="Connection string"
                    />
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(db)}
                      className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center justify-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400 flex items-center justify-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{db.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {db.type?.toUpperCase()}
                        </span>
                        {db.provider && (
                          <span className="text-xs text-gray-600">{db.provider}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {db.connectionString && (
                        <button
                          onClick={() => handleEdit(db)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(db.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    {db.fileName && <p>📁 {db.fileName}</p>}
                    <p>Added {new Date(db.createdAt).toLocaleDateString()}</p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
