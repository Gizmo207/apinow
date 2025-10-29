import { useState } from 'react';
import { Database, Plus, Upload, Trash2 } from 'lucide-react';

interface DatabaseConnectorProps {
  databases: any[];
  onAdd: (db: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function DatabaseConnector({ databases, onAdd, onDelete }: DatabaseConnectorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [category, setCategory] = useState('sql');
  const [dbType, setDbType] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [connectionString, setConnectionString] = useState('');
  const [uploading, setUploading] = useState(false);

  const categories = [
    { value: 'embedded', label: 'Embedded', description: 'File-based databases' },
    { value: 'sql', label: 'SQL', description: 'Relational databases' },
    { value: 'nosql', label: 'NoSQL', description: 'Non-relational databases' },
  ];

  const dbTypes: { [key: string]: any[] } = {
    embedded: [
      { value: 'sqlite', label: 'SQLite' },
    ],
    sql: [
      { value: 'mysql', label: 'MySQL' },
      { value: 'postgresql', label: 'PostgreSQL' },
      { value: 'mssql', label: 'Microsoft SQL Server' },
      { value: 'mariadb', label: 'MariaDB' },
    ],
    nosql: [
      { value: 'mongodb', label: 'MongoDB' },
      { value: 'redis', label: 'Redis' },
      { value: 'cassandra', label: 'Apache Cassandra' },
      { value: 'dynamodb', label: 'Amazon DynamoDB' },
    ],
  };

  const serviceProviders: { [key: string]: any[] } = {
    sqlite: [
      { value: 'local', label: 'Local File' },
    ],
    mysql: [
      { value: 'aiven', label: 'Aiven' },
      { value: 'planetscale', label: 'PlanetScale' },
      { value: 'aws-rds', label: 'AWS RDS' },
      { value: 'digitalocean', label: 'DigitalOcean Managed Database' },
      { value: 'railway', label: 'Railway' },
      { value: 'render', label: 'Render' },
      { value: 'fly-io', label: 'Fly.io' },
      { value: 'google-cloud-sql', label: 'Google Cloud SQL' },
      { value: 'azure-database', label: 'Azure Database for MySQL' },
      { value: 'clever-cloud', label: 'Clever Cloud' },
      { value: 'scalingo', label: 'Scalingo' },
      { value: 'other', label: 'Other / Self-Hosted' },
    ],
    postgresql: [
      { value: 'supabase', label: 'Supabase' },
      { value: 'neon', label: 'Neon' },
      { value: 'aiven', label: 'Aiven' },
      { value: 'aws-rds', label: 'AWS RDS' },
      { value: 'railway', label: 'Railway' },
      { value: 'render', label: 'Render' },
      { value: 'fly-io', label: 'Fly.io' },
      { value: 'digitalocean', label: 'DigitalOcean Managed Database' },
      { value: 'google-cloud-sql', label: 'Google Cloud SQL' },
      { value: 'azure-database', label: 'Azure Database for PostgreSQL' },
      { value: 'heroku', label: 'Heroku Postgres' },
      { value: 'crunchy-data', label: 'Crunchy Data' },
      { value: 'elephantsql', label: 'ElephantSQL' },
      { value: 'tembo', label: 'Tembo' },
      { value: 'other', label: 'Other / Self-Hosted' },
    ],
    mariadb: [
      { value: 'aws-rds', label: 'AWS RDS' },
      { value: 'google-cloud-sql', label: 'Google Cloud SQL' },
      { value: 'digitalocean', label: 'DigitalOcean' },
      { value: 'skysilk', label: 'SkySilk' },
      { value: 'other', label: 'Other / Self-Hosted' },
    ],
    mssql: [
      { value: 'azure-sql', label: 'Azure SQL Database' },
      { value: 'aws-rds', label: 'AWS RDS for SQL Server' },
      { value: 'google-cloud-sql', label: 'Google Cloud SQL' },
      { value: 'other', label: 'Other / Self-Hosted' },
    ],
    mongodb: [
      { value: 'atlas', label: 'MongoDB Atlas' },
      { value: 'aws-documentdb', label: 'AWS DocumentDB' },
      { value: 'azure-cosmos', label: 'Azure Cosmos DB' },
      { value: 'digitalocean', label: 'DigitalOcean MongoDB' },
      { value: 'scalegrid', label: 'ScaleGrid' },
      { value: 'other', label: 'Other / Self-Hosted' },
    ],
    redis: [
      { value: 'redis-cloud', label: 'Redis Cloud' },
      { value: 'upstash', label: 'Upstash' },
      { value: 'aws-elasticache', label: 'AWS ElastiCache' },
      { value: 'azure-cache', label: 'Azure Cache for Redis' },
      { value: 'google-memorystore', label: 'Google Cloud Memorystore' },
      { value: 'railway', label: 'Railway' },
      { value: 'render', label: 'Render' },
      { value: 'fly-io', label: 'Fly.io' },
      { value: 'other', label: 'Other / Self-Hosted' },
    ],
    cassandra: [
      { value: 'datastax-astra', label: 'DataStax Astra DB' },
      { value: 'aws-keyspaces', label: 'AWS Keyspaces' },
      { value: 'azure-cosmos', label: 'Azure Cosmos DB' },
      { value: 'instaclustr', label: 'Instaclustr' },
      { value: 'other', label: 'Other / Self-Hosted' },
    ],
    dynamodb: [
      { value: 'aws', label: 'AWS DynamoDB' },
    ],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setUploading(true);
    try {
      if (dbType === 'sqlite') {
        // SQLite: Upload file
        if (!file) return;
        
        const formData = new FormData();
        formData.append('file', file);
        
        const uploadRes = await fetch('/api/sqlite/upload', {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) throw new Error('Upload failed');

        const { filePath } = await uploadRes.json();

        await onAdd({
          id: Math.random().toString(36).substr(2, 9),
          name,
          type: 'sqlite',
          filePath,
          fileName: file.name,
          createdAt: new Date().toISOString()
        });
      } else {
        // Other databases: Use connection string
        if (!connectionString) return;
        
        const providerLabel = serviceProviders[dbType]?.find(p => p.value === serviceProvider)?.label;
        
        await onAdd({
          id: Math.random().toString(36).substr(2, 9),
          name,
          type: dbType,
          provider: providerLabel || serviceProvider,
          connectionString,
          createdAt: new Date().toISOString()
        });
      }

      // Reset form
      setName('');
      setFile(null);
      setConnectionString('');
      setCategory('sql');
      setDbType('');
      setServiceProvider('');
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
          <h3 className="text-lg font-semibold mb-4">Connect Database</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Category Dropdown */}
            <div>
              <label className="block text-sm font-medium mb-1">
                1. Database Category
                <span className="ml-2 text-xs text-gray-500 font-normal">What type of database?</span>
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setDbType(''); // Reset type
                  setServiceProvider(''); // Reset provider
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label} - {cat.description}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Database Engine Dropdown */}
            <div>
              <label className="block text-sm font-medium mb-1">
                2. Database Engine
                <span className="ml-2 text-xs text-gray-500 font-normal">Which database system?</span>
              </label>
              <select
                value={dbType}
                onChange={(e) => {
                  setDbType(e.target.value);
                  setServiceProvider(''); // Reset provider when engine changes
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select database engine...</option>
                {dbTypes[category]?.map((type: any) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Service Provider Dropdown */}
            {dbType && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  3. Service Provider
                  <span className="ml-2 text-xs text-gray-500 font-normal">Where is it hosted?</span>
                </label>
                <select
                  value={serviceProvider}
                  onChange={(e) => setServiceProvider(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select provider...</option>
                  {serviceProviders[dbType]?.map((provider) => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Database Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Database Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Database"
                required
              />
            </div>

            {/* SQLite: File Upload */}
            {dbType === 'sqlite' && (
              <div>
                <label className="block text-sm font-medium mb-1">SQLite File</label>
                <input
                  type="file"
                  accept=".db,.sqlite,.sqlite3"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
                {file && <p className="mt-2 text-sm text-green-600">✓ {file.name}</p>}
              </div>
            )}

            {/* Other Databases: Connection String */}
            {dbType !== 'sqlite' && serviceProvider && (
              <div>
                <label className="block text-sm font-medium mb-1">Connection String</label>
                <input
                  type="text"
                  value={connectionString}
                  onChange={(e) => setConnectionString(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder={
                    // MySQL Providers
                    serviceProvider === 'aiven' && dbType === 'mysql' ? 'mysql://avnadmin:PASS@mysql-xxx.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED' :
                    serviceProvider === 'planetscale' ? 'mysql://username:pscale_pw_PASS@aws.connect.psdb.cloud/database?sslaccept=strict' :
                    serviceProvider === 'aws-rds' && dbType === 'mysql' ? 'mysql://admin:password@database.xxx.us-east-1.rds.amazonaws.com:3306/mydb' :
                    serviceProvider === 'digitalocean' && dbType === 'mysql' ? 'mysql://doadmin:PASS@db-mysql-nyc-xxx.ondigitalocean.com:25060/defaultdb?ssl-mode=REQUIRED' :
                    serviceProvider === 'railway' && dbType === 'mysql' ? 'mysql://root:PASS@containers-us-west-xxx.railway.app:6969/railway' :
                    serviceProvider === 'render' && dbType === 'mysql' ? 'mysql://user:PASS@dpg-xxx-a.oregon-postgres.render.com:3306/database' :
                    serviceProvider === 'fly-io' && dbType === 'mysql' ? 'mysql://user:PASS@myapp.fly.dev:3306/database' :
                    serviceProvider === 'google-cloud-sql' && dbType === 'mysql' ? 'mysql://root:PASS@35.xxx.xxx.xxx:3306/database' :
                    serviceProvider === 'azure-database' && dbType === 'mysql' ? 'mysql://username@servername:PASS@servername.mysql.database.azure.com:3306/database?ssl=true' :
                    serviceProvider === 'clever-cloud' && dbType === 'mysql' ? 'mysql://user:PASS@mysql-xxx.services.clever-cloud.com:3306/database' :
                    serviceProvider === 'scalingo' && dbType === 'mysql' ? 'mysql://user:PASS@xxx.mysql.dbs.scalingo.com:30000/database' :
                    serviceProvider === 'other' && dbType === 'mysql' ? 'mysql://user:password@host:3306/database' :
                    
                    // PostgreSQL Providers
                    serviceProvider === 'supabase' ? 'postgresql://postgres.xxx:PASS@aws-0-us-east-1.pooler.supabase.com:5432/postgres' :
                    serviceProvider === 'neon' ? 'postgresql://user:PASS@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require' :
                    serviceProvider === 'aiven' && dbType === 'postgresql' ? 'postgres://avnadmin:PASS@pg-xxx.aivencloud.com:12345/defaultdb?sslmode=require' :
                    
                    // MongoDB Providers
                    serviceProvider === 'atlas' ? 'mongodb+srv://username:PASS@cluster0.xxx.mongodb.net/database?retryWrites=true&w=majority' :
                    
                    // Generic fallbacks
                    dbType === 'postgresql' ? 'postgresql://user:password@localhost:5432/database' :
                    dbType === 'mysql' ? 'mysql://user:password@localhost:3306/database' :
                    dbType === 'mongodb' ? 'mongodb://localhost:27017/database' :
                    dbType === 'redis' ? 'redis://localhost:6379' :
                    'Enter connection string'
                  }
                  required
                />
                <p className="mt-2 text-xs text-gray-500">
                  {dbType === 'mysql' && serviceProvider !== 'other' && `📋 ${serviceProviders[dbType]?.find(p => p.value === serviceProvider)?.label} format`}
                  {dbType === 'mysql' && serviceProvider === 'other' && '✅ MySQL fully supported - use any valid connection string'}
                  {dbType !== 'mysql' && serviceProvider !== 'other' && `⚠️ ${serviceProviders[dbType]?.find(p => p.value === serviceProvider)?.label} support coming soon`}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? (dbType === 'sqlite' ? 'Uploading...' : 'Connecting...') : (dbType === 'sqlite' ? 'Upload Database' : 'Connect Database')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {databases.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No databases connected</h3>
            <p className="text-gray-600 mb-4">Connect your first database to get started</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Connect Database
            </button>
          </div>
        ) : (
          databases.map(db => (
            <div key={db.id} className="bg-white p-6 rounded-lg border flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Database className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold">{db.name}</h3>
                  <p className="text-sm text-gray-600">
                    {(() => {
                      // Find the type label across all categories
                      let foundLabel = db.type.toUpperCase();
                      for (const category of Object.keys(dbTypes)) {
                        const type = dbTypes[category].find((t: any) => t.value === db.type);
                        if (type) {
                          foundLabel = type.label;
                          break;
                        }
                      }
                      return foundLabel;
                    })()} 
                    {db.fileName && ` • ${db.fileName}`}
                    {db.provider && ` • ${db.provider}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {db.type === 'mysql' && db.connectionString && (
                  <button
                    onClick={async () => {
                      if (!confirm('This will create a "users" table with 3 test users. Continue?')) return;
                      
                      setUploading(true);
                      try {
                        const res = await fetch('/api/mysql/setup', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ connectionString: db.connectionString })
                        });
                        
                        if (res.ok) {
                          alert('✅ Test data created! Go to Schema Explorer to see your users table.');
                        } else {
                          const error = await res.json();
                          alert('❌ Error: ' + error.error);
                        }
                      } catch (error) {
                        alert('❌ Failed to setup test data');
                      } finally {
                        setUploading(false);
                      }
                    }}
                    disabled={uploading}
                    className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                  >
                    Setup Test Data
                  </button>
                )}
                <button
                  onClick={() => onDelete(db.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
