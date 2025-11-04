import { useState } from 'react';
import { Database, Plus, Trash2, X } from 'lucide-react';
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
        // Other databases: Create server-side connection doc and only keep id client-side
        try {
          const authUserRaw = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
          const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (authUser?.uid) headers['x-user-id'] = authUser.uid;
          
          // For MongoDB, inject password into connection string if provided separately
          let finalConnectionString = values.connectionString;
          if (provider.engine === 'mongodb' && values.password) {
            // Replace <db_password>, <password>, or PASSWORD placeholder with actual password
            finalConnectionString = finalConnectionString
              .replace('<db_password>', encodeURIComponent(values.password))
              .replace('<password>', encodeURIComponent(values.password))
              .replace(':PASSWORD@', `:${encodeURIComponent(values.password)}@`);
          }
          
          const res = await fetch('/api/connections', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              type: provider.engine,
              name: dbName || `${provider.name} Connection`,
              connectionString: finalConnectionString,
              database: values.database,
              ownerId: authUser?.uid
            })
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Failed to create connection' }));
            throw new Error(err.error || 'Failed to create connection');
          }
          const data = await res.json();
          await onAdd({
            id: data.id,
            name: data.name || (dbName || `${provider.name} Connection`),
            type: data.type || provider.engine,
            provider: provider.name,
            providerKey,
            createdAt: new Date().toISOString()
          });
        } catch (e) {
          console.error('Failed to create server-side connection:', e);
          throw e;
        }
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
            {/* Engine Selection - FIRST */}
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

            {/* Provider Selection - SECOND */}
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
            
            {/* Connection Name - LAST */}
            {providerKey && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Connection Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={dbName}
                  onChange={e => setDbName(e.target.value)}
                  placeholder="My MongoDB Atlas"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  A friendly name to identify this connection in your app (you choose this)
                </p>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
