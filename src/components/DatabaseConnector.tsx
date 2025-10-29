import { useState } from 'react';
import { Database, Plus, Upload, Trash2, HelpCircle } from 'lucide-react';

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
  const [showHelp, setShowHelp] = useState(false);

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
      { value: 'aws-rds', label: 'AWS RDS' },
      { value: 'azure-database', label: 'Azure Database for MySQL' },
      { value: 'clever-cloud', label: 'Clever Cloud' },
      { value: 'digitalocean', label: 'DigitalOcean Managed Database' },
      { value: 'fly-io', label: 'Fly.io' },
      { value: 'google-cloud-sql', label: 'Google Cloud SQL' },
      { value: 'planetscale', label: 'PlanetScale' },
      { value: 'railway', label: 'Railway' },
      { value: 'render', label: 'Render' },
      { value: 'scalingo', label: 'Scalingo' },
      { value: 'other', label: 'Other / Self-Hosted' },
    ],
    postgresql: [
      { value: 'aiven', label: 'Aiven' },
      { value: 'aws-rds', label: 'AWS RDS' },
      { value: 'azure-database', label: 'Azure Database for PostgreSQL' },
      { value: 'crunchy-data', label: 'Crunchy Data' },
      { value: 'digitalocean', label: 'DigitalOcean Managed Database' },
      { value: 'elephantsql', label: 'ElephantSQL' },
      { value: 'fly-io', label: 'Fly.io' },
      { value: 'google-cloud-sql', label: 'Google Cloud SQL' },
      { value: 'heroku', label: 'Heroku Postgres' },
      { value: 'neon', label: 'Neon' },
      { value: 'railway', label: 'Railway' },
      { value: 'render', label: 'Render' },
      { value: 'supabase', label: 'Supabase' },
      { value: 'tembo', label: 'Tembo' },
      { value: 'other', label: 'Other / Self-Hosted' },
    ],
    mariadb: [
      { value: 'aws-rds', label: 'AWS RDS' },
      { value: 'digitalocean', label: 'DigitalOcean' },
      { value: 'google-cloud-sql', label: 'Google Cloud SQL' },
      { value: 'skysilk', label: 'SkySilk' },
      { value: 'other', label: 'Other / Self-Hosted' },
    ],
    mssql: [
      { value: 'aws-rds', label: 'AWS RDS for SQL Server' },
      { value: 'azure-sql', label: 'Azure SQL Database' },
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
      { value: 'aws-elasticache', label: 'AWS ElastiCache' },
      { value: 'azure-cache', label: 'Azure Cache for Redis' },
      { value: 'fly-io', label: 'Fly.io' },
      { value: 'google-memorystore', label: 'Google Cloud Memorystore' },
      { value: 'railway', label: 'Railway' },
      { value: 'redis-cloud', label: 'Redis Cloud' },
      { value: 'render', label: 'Render' },
      { value: 'upstash', label: 'Upstash' },
      { value: 'other', label: 'Other / Self-Hosted' },
    ],
    cassandra: [
      { value: 'aws-keyspaces', label: 'AWS Keyspaces' },
      { value: 'azure-cosmos', label: 'Azure Cosmos DB' },
      { value: 'datastax-astra', label: 'DataStax Astra DB' },
      { value: 'instaclustr', label: 'Instaclustr' },
      { value: 'other', label: 'Other / Self-Hosted' },
    ],
    dynamodb: [
      { value: 'aws', label: 'AWS DynamoDB' },
    ],
  };

  const connectionHelp: { [key: string]: any } = {
    supabase: {
      title: 'Finding Supabase Connection String',
      steps: [
        '1. Click the "Connect" button at the top of your project dashboard',
        '2. Or go to Project Settings → Database (gear icon)',
        '3. At the very top, click the "Connect" button',
        '4. A modal will pop up with all your connection info',
        '5. Select "URI" format (not Session mode)',
        '6. Copy the connection string',
        '7. If you need to reset your password: Project Settings → Database → Database password → Reset',
      ],
    },
    aiven: {
      title: 'Finding Aiven Connection String',
      steps: [
        '1. Go to your service in Aiven Console',
        '2. Click on "Overview" tab',
        '3. Scroll to "Connection information"',
        '4. Copy the "Service URI"',
        '5. Make sure to include ?ssl-mode=REQUIRED at the end',
      ],
    },
    planetscale: {
      title: 'Finding PlanetScale Connection String',
      steps: [
        '1. Go to your database dashboard',
        '2. Click "Connect" button',
        '3. Select "General" or your framework',
        '4. Copy the connection string shown',
        '5. Note: Passwords are generated per connection',
      ],
    },
    neon: {
      title: 'Finding Neon Connection String',
      steps: [
        '1. Go to your Neon project dashboard',
        '2. Click "Connection Details" or the connection icon',
        '3. Select "Connection string"',
        '4. Copy the string shown',
        '5. Connection pooling is enabled by default',
      ],
    },
    railway: {
      title: 'Finding Railway Connection String',
      steps: [
        '1. Go to your project in Railway',
        '2. Click on your database service',
        '3. Go to "Connect" tab',
        '4. Copy the "DATABASE_URL" or "Postgres Connection URL"',
        '5. The port may vary (not always 3306)',
      ],
    },
    'aws-rds': {
      title: 'Finding AWS RDS Connection String',
      steps: [
        '1. Go to RDS Dashboard in AWS Console',
        '2. Click on your database instance',
        '3. Find the "Endpoint" in Connectivity & security',
        '4. Build connection string: mysql://user:pass@endpoint:3306/dbname',
        '5. Or postgresql://user:pass@endpoint:5432/dbname',
      ],
    },
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
                <div className="flex items-center gap-2 mb-1">
                  <label className="block text-sm font-medium">Connection String</label>
                  {connectionHelp[serviceProvider] && (
                    <button
                      type="button"
                      onClick={() => setShowHelp(true)}
                      className="text-blue-600 hover:text-blue-700"
                      title="Help finding connection string"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
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
                  {(dbType === 'mysql' || dbType === 'postgresql') && serviceProvider !== 'other' && `📋 ${serviceProviders[dbType]?.find(p => p.value === serviceProvider)?.label} format`}
                  {(dbType === 'mysql' || dbType === 'postgresql') && serviceProvider === 'other' && `✅ ${dbType === 'mysql' ? 'MySQL' : 'PostgreSQL'} fully supported - use any valid connection string`}
                  {dbType !== 'mysql' && dbType !== 'postgresql' && serviceProvider !== 'other' && `⚠️ ${serviceProviders[dbType]?.find(p => p.value === serviceProvider)?.label} support coming soon`}
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
                {(db.type === 'mysql' || db.type === 'postgresql') && db.connectionString && (
                  <button
                    onClick={async () => {
                      if (!confirm('This will create a "users" table with 3 test users. Continue?')) return;
                      
                      setUploading(true);
                      try {
                        const res = await fetch(`/api/${db.type}/setup`, {
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

      {/* Help Modal */}
      {showHelp && serviceProvider && connectionHelp[serviceProvider] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-bold">{connectionHelp[serviceProvider].title}</h2>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                {connectionHelp[serviceProvider].steps.map((step: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {idx + 1}
                    </div>
                    <p className="text-gray-700 pt-0.5">{step.replace(/^\d+\.\s*/, '')}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Expected format:</strong>
                </p>
                <code className="block mt-2 text-xs bg-white p-2 rounded border font-mono text-gray-800">
                  {
                    serviceProvider === 'aiven' && dbType === 'mysql' ? 'mysql://avnadmin:PASS@mysql-xxx.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED' :
                    serviceProvider === 'supabase' ? 'postgresql://postgres:PASS@db.xxx.supabase.co:5432/postgres' :
                    serviceProvider === 'planetscale' ? 'mysql://username:pscale_pw_PASS@aws.connect.psdb.cloud/database?sslaccept=strict' :
                    serviceProvider === 'neon' ? 'postgresql://user:PASS@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require' :
                    serviceProvider === 'railway' && dbType === 'mysql' ? 'mysql://root:PASS@containers-us-west-xxx.railway.app:6969/railway' :
                    serviceProvider === 'railway' && dbType === 'postgresql' ? 'postgresql://postgres:PASS@containers-us-west-xxx.railway.app:5432/railway' :
                    dbType === 'postgresql' ? 'postgresql://user:password@host:5432/database' :
                    dbType === 'mysql' ? 'mysql://user:password@host:3306/database' :
                    'Connection string format'
                  }
                </code>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
