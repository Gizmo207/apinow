import React, { useState } from 'react';
import { Database, Plus, Trash2, TestTube, CheckCircle, XCircle, Loader, Edit } from 'lucide-react';

interface DatabaseConnectorProps {
  databases: any[];
  onAdd: (db: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTest: (db: any) => Promise<void>;
}

export function DatabaseConnector({ databases, onAdd, onDelete, onTest }: DatabaseConnectorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDatabase, setEditingDatabase] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'sqlite' as 'sqlite' | 'mysql' | 'postgresql' | 'firebase' | 'mongodb' | 'sqlserver' | 'mariadb' | 'supabase' | 'oracle' | 'redis' | 'dynamodb' | 'cassandra',
    host: '',
    port: '',
    database: '',
    username: '',
    password: '',
    projectId: '',
    apiKey: '',
    authDomain: '',
    // Firebase Admin SDK fields
    serviceAccountKey: '',
    adminApiKey: '',
    adminAuthDomain: '',
    databaseURL: '',
    storageBucket: '',
    // MongoDB
    connectionString: '',
    // Supabase
    supabaseUrl: '',
    supabaseKey: '',
    // AWS DynamoDB
    awsRegion: '',
    awsAccessKey: '',
    awsSecretKey: '',
    // Redis
    redisPassword: ''
  });
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [connectionResults, setConnectionResults] = useState<{ [key: string]: 'success' | 'error' | null }>({});

  const handleEdit = (database: any) => {
    setEditingDatabase(database);
    setFormData({
      name: database.name,
      type: database.type,
      host: database.host || '',
      port: database.port || '',
      database: database.database || '',
      username: database.username || '',
      password: database.password || '',
      projectId: database.projectId || '',
      apiKey: database.apiKey || '',
      authDomain: database.authDomain || '',
      serviceAccountKey: database.serviceAccountKey || '',
      adminApiKey: database.adminApiKey || '',
      adminAuthDomain: database.adminAuthDomain || '',
      databaseURL: database.databaseURL || '',
      storageBucket: database.storageBucket || '',
      connectionString: database.connectionString || '',
      supabaseUrl: database.supabaseUrl || '',
      supabaseKey: database.supabaseKey || '',
      awsRegion: database.awsRegion || '',
      awsAccessKey: database.awsAccessKey || '',
      awsSecretKey: database.awsSecretKey || '',
      redisPassword: database.redisPassword || ''
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setEditingDatabase(null);
    setShowAddForm(false);
    setFormData({
      name: '',
      type: 'sqlite' as 'sqlite' | 'mysql' | 'postgresql' | 'firebase' | 'mongodb' | 'sqlserver' | 'mariadb' | 'supabase' | 'oracle' | 'redis' | 'dynamodb' | 'cassandra',
      host: '',
      port: '',
      database: '',
      username: '',
      password: '',
      projectId: '',
      apiKey: '',
      authDomain: '',
      serviceAccountKey: '',
      adminApiKey: '',
      adminAuthDomain: '',
      databaseURL: '',
      storageBucket: '',
      connectionString: '',
      supabaseUrl: '',
      supabaseKey: '',
      awsRegion: '',
      awsAccessKey: '',
      awsSecretKey: '',
      redisPassword: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Test connection first
    const testId = editingDatabase ? editingDatabase.id : 'new';
    setTestingConnection(testId);
    
    try {
      // Create temporary connection object for testing
      const tempConnection = {
        id: testId,
        ...formData,
        connected: false,
        createdAt: new Date().toISOString()
      };
      
      await onTest(tempConnection);
      
      // Connection successful, add to list
      if (editingDatabase) {
        // Update existing connection
        const updatedDatabases = databases.map(db => 
          db.id === editingDatabase.id 
            ? { 
                ...db, 
                ...formData,
                // Map Firebase Admin SDK fields
                serviceAccountKey: formData.serviceAccountKey,
                adminApiKey: formData.adminApiKey,
                adminAuthDomain: formData.adminAuthDomain,
                databaseURL: formData.databaseURL,
                storageBucket: formData.storageBucket
              }
            : db
        );
        
        setConnectionResults(prev => ({ ...prev, [editingDatabase.id]: 'success' }));
        onAdd(updatedDatabases.find(db => db.id === editingDatabase.id));
      } else {
        // Create new connection
        const newDatabase = {
          id: Math.random().toString(36).substr(2, 9),
          name: formData.name,
          type: formData.type,
          host: formData.host,
          port: formData.port,
          database: formData.database,
          username: formData.username,
          password: formData.password,
          projectId: formData.projectId,
          apiKey: formData.apiKey,
          authDomain: formData.authDomain,
          // Firebase Admin SDK fields
          serviceAccountKey: formData.serviceAccountKey,
          adminApiKey: formData.adminApiKey,
          adminAuthDomain: formData.adminAuthDomain,
          databaseURL: formData.databaseURL,
          storageBucket: formData.storageBucket,
          connected: true,
          createdAt: new Date().toISOString()
        };
        
        setConnectionResults(prev => ({ ...prev, [newDatabase.id]: 'success' }));
        onAdd(newDatabase);
      }
      
      resetForm();
    } catch (error) {
      setConnectionResults(prev => ({ ...prev, [testId]: 'error' }));
      console.error('Connection failed:', error);
    } finally {
      setTestingConnection(null);
    }
  };

  const handleTestConnection = async (database: any) => {
    setTestingConnection(database.id);
    try {
      await onTest(database);
      setConnectionResults(prev => ({ ...prev, [database.id]: 'success' }));
    } catch (error) {
      setConnectionResults(prev => ({ ...prev, [database.id]: 'error' }));
      console.error('Connection test failed:', error);
    } finally {
      setTestingConnection(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      onDelete(id);
    } catch (error) {
      console.error('Failed to delete connection:', error);
    }
  };

  const getConnectionStatus = (database: any) => {
    if (testingConnection === database.id) {
      return <Loader className="w-4 h-4 animate-spin text-blue-500" />;
    }
    
    const result = connectionResults[database.id];
    if (result === 'success') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (result === 'error') {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    
    return database.connected ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <XCircle className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Database Connections</h1>
          <p className="text-gray-600 mt-1">Connect to your databases to start building APIs</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Database</span>
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Add New Database Connection</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Connection Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="My Database"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Database Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'sqlite' | 'mysql' | 'postgresql' | 'firebase' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Database Type"
                >
                  <optgroup label="📁 Embedded">
                    <option value="sqlite">SQLite</option>
                  </optgroup>
                  <optgroup label="🗄️ SQL Databases">
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="sqlserver">Microsoft SQL Server</option>
                    <option value="mariadb">MariaDB</option>
                    <option value="oracle">Oracle Database</option>
                  </optgroup>
                  <optgroup label="📦 NoSQL Databases">
                    <option value="mongodb">MongoDB</option>
                    <option value="dynamodb">Amazon DynamoDB</option>
                    <option value="cassandra">Apache Cassandra</option>
                    <option value="redis">Redis</option>
                  </optgroup>
                  <optgroup label="☁️ Cloud Platforms">
                    <option value="firebase">Firebase Firestore</option>
                    <option value="supabase">Supabase (PostgreSQL)</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {formData.type !== 'sqlite' && formData.type !== 'firebase' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Host
                  </label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Port
                  </label>
                  <input
                    type="text"
                    value={formData.port}
                    onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="3306"
                  />
                </div>
              </div>
            )}

            {formData.type === 'firebase' && (
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Client SDK Configuration</h3>
                  <p className="text-sm text-gray-600 mb-4">These credentials are used for reading data from your frontend</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project ID
                      </label>
                      <input
                        type="text"
                        value={formData.projectId}
                        onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="my-firebase-project"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API Key
                      </label>
                      <input
                        type="text"
                        value={formData.apiKey}
                        onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="AIzaSyC..."
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Auth Domain (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.authDomain}
                        onChange={(e) => setFormData(prev => ({ ...prev, authDomain: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="my-firebase-project.firebaseapp.com"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Admin SDK Configuration</h3>
                  <p className="text-sm text-gray-600 mb-4">These credentials enable full admin access for API generation</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Service Account Key (JSON)
                      </label>
                      <textarea
                        rows={4}
                        value={formData.serviceAccountKey}
                        onChange={(e) => setFormData(prev => ({ ...prev, serviceAccountKey: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        placeholder='{"type": "service_account", "project_id": "...", "private_key_id": "...", "private_key": "...", ...}'
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Download this from Firebase Console → Project Settings → Service Accounts → Generate new private key
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Database URL (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.databaseURL}
                        onChange={(e) => setFormData(prev => ({ ...prev, databaseURL: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://my-project-default-rtdb.firebaseio.com/"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Storage Bucket (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.storageBucket}
                        onChange={(e) => setFormData(prev => ({ ...prev, storageBucket: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="my-project.appspot.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formData.type !== 'sqlite' && formData.type !== 'firebase' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Database Name
                </label>
                <input
                  type="text"
                  value={formData.database}
                  onChange={(e) => setFormData(prev => ({ ...prev, database: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="my_database"
                  required
                />
              </div>
            )}

            {formData.type === 'sqlite' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Database Name
                </label>
                <input
                  type="text"
                  value={formData.database}
                  onChange={(e) => setFormData(prev => ({ ...prev, database: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="database.db"
                  required
                />
              </div>
            )}

            {formData.type !== 'sqlite' && formData.type !== 'firebase' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="password"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={testingConnection !== null}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {testingConnection ? 'Testing...' : 'Add Database'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {databases.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No databases connected</h3>
            <p className="text-gray-600 mb-4">Connect your first database to start building APIs</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Database
            </button>
          </div>
        ) : (
          databases.map(database => (
            <div key={database.id} className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Database className="w-8 h-8 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{database.name}</h3>
                    <p className="text-sm text-gray-600">
                      {database.type.toUpperCase()} • {database.database || database.projectId}
                    </p>
                    {database.type === 'firebase' && database.serviceAccountKey && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          ✅ Admin SDK Configured
                        </span>
                      </div>
                    )}
                    {database.type === 'firebase' && !database.serviceAccountKey && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                          ⚠️ Admin SDK Missing
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {getConnectionStatus(database)}
                  <button
                    onClick={() => handleTestConnection(database)}
                    disabled={testingConnection === database.id}
                    className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    <TestTube className="w-4 h-4" />
                    <span>Test</span>
                  </button>
                  <button
                    onClick={() => handleEdit(database)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    aria-label={`Edit ${database.name} connection`}
                    title="Edit Connection"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(database.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    aria-label={`Delete ${database.name} connection`}
                    title="Delete Connection"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {connectionResults[database.id] === 'success' && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✅ Connection successful! Sample data has been created.
                  </p>
                </div>
              )}
              
              {connectionResults[database.id] === 'error' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    ❌ Connection failed. Please check your database settings.
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
  {/* Firestore rules helper moved to Schema Explorer */}
    </div>
  );
}