'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, Menu, X, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Dashboard } from '@/components/Dashboard';
import { DatabaseConnector } from '@/components/DatabaseConnector';
import { SchemaExplorer } from '@/components/SchemaExplorer';
import { MyAPIs } from '@/components/MyAPIs';
import { APIBuilder } from '@/components/APIBuilder';
import { APITester } from '@/components/APITester';
import { Documentation } from '@/components/Documentation';
import { Analytics } from '@/components/Analytics';
import { Settings } from '@/components/Settings';
import { Key, Copy, Check, Trash2 } from 'lucide-react';
import { getDatabaseFile } from '@/lib/sqliteBrowser';

type ViewType = 'dashboard' | 'databases' | 'schema' | 'builder' | 'endpoints' | 'api-keys' | 'tester' | 'docs' | 'analytics' | 'settings';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const isFromURLParam = useRef(false); // Track if view came from URL parameter
  const [currentView, setCurrentView] = useState<ViewType>('databases'); // Always default to databases, don't read localStorage on initial render
  const [databases, setDatabases] = useState<any[]>([]);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedEndpoints, setSelectedEndpoints] = useState<string[]>([]);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{keyId: string, success: boolean, message: string} | null>(null);
  const [testerKey, setTesterKey] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved === 'dark';
    }
    return false;
  });

  // Dark mode toggle
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Apply dark mode on mount
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Read view from URL query params, then clear URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam && ['dashboard', 'databases', 'schema', 'builder', 'endpoints', 'api-keys', 'tester', 'docs', 'analytics', 'settings'].includes(viewParam)) {
        isFromURLParam.current = true; // Mark that view came from URL
        setCurrentView(viewParam as ViewType);
        
        // Clear URL params after reading (e.g., from Stripe redirect)
        // This prevents the view from persisting across sessions
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // Persist current view to localStorage and URL hash
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Don't persist to localStorage if view came from URL parameter (e.g., Stripe redirect)
      // This prevents the redirect destination from becoming the default view
      if (!isFromURLParam.current) {
        localStorage.setItem('dashboardView', currentView);
      } else {
        // Reset the flag after handling the initial URL param
        isFromURLParam.current = false;
      }
      
      // Update URL hash to keep it in sync (replaceState doesn't trigger page reload)
      window.history.replaceState(null, '', `#${currentView}`);
    }
  }, [currentView]);

  useEffect(() => {
    // Don't redirect while still loading auth state
    if (loading) return;
    
    if (!user) {
      router.push('/landing');
      return;
    }

    // ✅ ONLY load saved view AFTER user is confirmed authenticated
    const savedView = localStorage.getItem('dashboardView');
    if (savedView && !isFromURLParam.current) {
      setCurrentView(savedView as ViewType);
    }

    // Load databases from localStorage
    const stored = localStorage.getItem('sqlite_databases');
    if (stored) {
      setDatabases(JSON.parse(stored));
    }

    // Load API keys from localStorage
    const keysStored = localStorage.getItem('api_keys');
    if (keysStored) {
      setApiKeys(JSON.parse(keysStored));
    }

    // Load endpoints from localStorage
    const loadEndpoints = () => {
      const endpointsStored = localStorage.getItem('saved_endpoints');
      if (endpointsStored) {
        setEndpoints(JSON.parse(endpointsStored));
      }
    };
    
    loadEndpoints();
    
    // Listen for storage changes (when endpoints are saved)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'saved_endpoints') {
        loadEndpoints();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event when saving in same tab
    const handleEndpointSaved = () => {
      loadEndpoints();
    };
    
    window.addEventListener('endpointsSaved', handleEndpointSaved);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('endpointsSaved', handleEndpointSaved);
    };
  }, [user, loading, router]);

  const handleAddDatabase = async (db: any) => {
    const newDatabases = [...databases, db];
    setDatabases(newDatabases);
    localStorage.setItem('sqlite_databases', JSON.stringify(newDatabases));
  };

  const handleDeleteDatabase = async (id: string) => {
    const newDatabases = databases.filter(db => db.id !== id);
    setDatabases(newDatabases);
    localStorage.setItem('sqlite_databases', JSON.stringify(newDatabases));
  };

  const menuItems = [
    { id: 'databases', label: 'Databases', icon: '🗄️' },
    { id: 'schema', label: 'Schema Explorer', icon: '🔍' },
    { id: 'builder', label: 'Endpoint Builder', icon: '🔧' },
    { id: 'endpoints', label: 'My Endpoints', icon: '📌' },
    { id: 'tester', label: 'Endpoint Tester', icon: '🧪' },
    { id: 'api-keys', label: 'My APIs', icon: '🔑' },
    { id: 'docs', label: 'Documentation', icon: '📄' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const renderCurrentView = () => {
    switch (currentView) {
      case 'databases':
        return <DatabaseConnector databases={databases} onAdd={handleAddDatabase} onDelete={handleDeleteDatabase} />;
      case 'schema':
        return <SchemaExplorer databases={databases} />;
      case 'builder':
        return <APIBuilder databases={databases} />;
      case 'endpoints':
        return <MyAPIs onNavigateToTester={() => {
          setTesterKey(prev => prev + 1);
          setCurrentView('tester');
        }} />;
      case 'api-keys':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🔑 My APIs</h1>
              <p className="text-gray-600 mt-1">Manage authentication keys for your API endpoints</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border p-6">
                <div className="text-3xl font-bold text-green-600">{apiKeys.filter(k => k.status === 'active').length}</div>
                <div className="text-sm text-gray-600 mt-1">Active Keys</div>
              </div>
              <div className="bg-white rounded-lg border p-6">
                <div className="text-3xl font-bold text-gray-600">{apiKeys.filter(k => k.status === 'inactive').length}</div>
                <div className="text-sm text-gray-600 mt-1">Inactive Keys</div>
              </div>
              <div className="bg-white rounded-lg border p-6">
                <div className="text-3xl font-bold text-purple-600">{databases.length}</div>
                <div className="text-sm text-gray-600 mt-1">Databases</div>
              </div>
              <div className="bg-white rounded-lg border p-6">
                <div className="text-3xl font-bold text-orange-600">{endpoints.length}</div>
                <div className="text-sm text-gray-600 mt-1">Endpoints</div>
              </div>
            </div>

            <div className="bg-white rounded-lg border">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Your API Keys</h3>
                  <button
                    onClick={() => setShowKeyForm(!showKeyForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Key className="w-4 h-4" />
                    {showKeyForm ? 'Cancel' : 'Generate New Key'}
                  </button>
                </div>

                {showKeyForm && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Key Name</label>
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g., Production App, Mobile Client"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Allowed Endpoints (optional - leave empty for all)
                      </label>
                      <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                        {endpoints.length === 0 ? (
                          <p className="text-sm text-gray-500">No endpoints available. Create some first!</p>
                        ) : (
                          endpoints.map((ep) => (
                            <label key={ep.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={selectedEndpoints.includes(ep.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedEndpoints([...selectedEndpoints, ep.id]);
                                  } else {
                                    setSelectedEndpoints(selectedEndpoints.filter(id => id !== ep.id));
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm">
                                <span className="font-medium">{ep.method}</span> {ep.path}
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (!newKeyName.trim()) {
                          alert('Please enter a name for the API key');
                          return;
                        }

                        const newKey = 'apinow_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                        const newApiKey = {
                          id: Date.now().toString(),
                          name: newKeyName,
                          key: newKey,
                          status: 'active',
                          createdAt: new Date().toISOString(),
                          lastUsed: null,
                          allowedEndpoints: selectedEndpoints.length > 0 ? selectedEndpoints : null
                        };
                        
                        const stored = localStorage.getItem('api_keys') || '[]';
                        const keys = JSON.parse(stored);
                        keys.push(newApiKey);
                        localStorage.setItem('api_keys', JSON.stringify(keys));
                        setApiKeys(keys);
                        
                        navigator.clipboard.writeText(newKey);
                        setNewKeyName('');
                        setSelectedEndpoints([]);
                        setShowKeyForm(false);
                      }}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
                    >
                      Create API Key
                    </button>
                  </div>
                )}
              </div>

              {apiKeys.length === 0 ? (
                <div className="text-center py-12">
                  <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No API keys yet</h3>
                  <p className="text-gray-600">Click "Generate New Key" to create your first API key</p>
                </div>
              ) : (
                <div className="p-6">
                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <div key={key.id} className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-gray-900">{key.name}</span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                                key.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {key.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                              <button
                                onClick={() => {
                                  const stored = localStorage.getItem('api_keys') || '[]';
                                  const keys = JSON.parse(stored);
                                  const updated = keys.map((k: any) => 
                                    k.id === key.id 
                                      ? {...k, status: k.status === 'active' ? 'inactive' : 'active'}
                                      : k
                                  );
                                  localStorage.setItem('api_keys', JSON.stringify(updated));
                                  setApiKeys(updated);
                                }}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                  key.status === 'active' ? 'bg-green-600' : 'bg-gray-300'
                                }`}
                                title={key.status === 'active' ? 'Disable key' : 'Enable key'}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  key.status === 'active' ? 'translate-x-5' : 'translate-x-0.5'
                                }`} />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <code className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded font-mono">{key.key}</code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(key.key);
                                setCopiedKey(key.key);
                                setTimeout(() => setCopiedKey(null), 2000);
                              }}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                              title="Copy to clipboard"
                            >
                              {copiedKey === key.key ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={async () => {
                                setTestingKey(key.id);
                                setTestResult(null);

                                // Find an endpoint to test with
                                let testEndpoint;
                                if (key.allowedEndpoints && key.allowedEndpoints.length > 0) {
                                  testEndpoint = endpoints.find(ep => key.allowedEndpoints.includes(ep.id));
                                } else {
                                  testEndpoint = endpoints.find(ep => ep.method === 'GET');
                                }

                                if (!testEndpoint) {
                                  setTestResult({
                                    keyId: key.id,
                                    success: false,
                                    message: 'No endpoints available to test with. Create a GET endpoint first!'
                                  });
                                  setTestingKey(null);
                                  return;
                                }

                                try {
                                  // Build headers with database info
                                  const headers: any = {
                                    'Authorization': `Bearer ${key.key}`,
                                    'Content-Type': 'application/json'
                                  };
                                  
                                  // Add database headers if endpoint has database info
                                  if (testEndpoint.database) {
                                    headers['x-db-type'] = testEndpoint.database.type;
                                    if (testEndpoint.database.connectionString) {
                                      headers['x-db-connection'] = testEndpoint.database.connectionString;
                                    }
                                    if (testEndpoint.database.filePath && testEndpoint.database.type === 'sqlite') {
                                      // Get SQLite file data from IndexedDB
                                      const dbData = await getDatabaseFile(testEndpoint.database.filePath);
                                      if (dbData) {
                                        const base64 = btoa(String.fromCharCode(...dbData));
                                        headers['x-db-file'] = base64;
                                      }
                                    }
                                  }
                                  
                                  const response = await fetch(`${window.location.origin}${testEndpoint.path}`, {
                                    method: testEndpoint.method,
                                    headers
                                  });

                                  if (response.ok) {
                                    setTestResult({
                                      keyId: key.id,
                                      success: true,
                                      message: `✓ Key works! Tested ${testEndpoint.method} ${testEndpoint.path} - Status ${response.status}`
                                    });
                                  } else {
                                    setTestResult({
                                      keyId: key.id,
                                      success: false,
                                      message: `Key test returned status ${response.status}. The key may not have proper access.`
                                    });
                                  }
                                } catch (error: any) {
                                  setTestResult({
                                    keyId: key.id,
                                    success: false,
                                    message: `Test failed: ${error.message}`
                                  });
                                }
                                setTestingKey(null);
                              }}
                              disabled={testingKey === key.id}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors font-medium disabled:opacity-50"
                              title="Test this API key"
                            >
                              {testingKey === key.id ? 'Testing...' : 'Test Key'}
                            </button>
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <p>
                              Created {new Date(key.createdAt).toLocaleDateString()} at {new Date(key.createdAt).toLocaleTimeString()}
                              {key.lastUsed && ` • Last used ${new Date(key.lastUsed).toLocaleDateString()}`}
                            </p>
                            <p>
                              <span className="font-medium">Access:</span>{' '}
                              {key.allowedEndpoints ? 
                                `${key.allowedEndpoints.length} specific endpoint${key.allowedEndpoints.length !== 1 ? 's' : ''}` : 
                                'All endpoints'
                              }
                            </p>
                          </div>

                          {/* Test Result Display */}
                          {testResult && testResult.keyId === key.id && (
                            <div className={`mt-3 p-3 rounded-lg border ${
                              testResult.success 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-red-50 border-red-200'
                            }`}>
                              <div className="flex items-start gap-2">
                                {testResult.success ? (
                                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                ) : (
                                  <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                  <p className={`text-sm font-medium ${
                                    testResult.success ? 'text-green-900' : 'text-red-900'
                                  }`}>
                                    {testResult.success ? 'Key Verified ✓' : 'Test Failed'}
                                  </p>
                                  <p className={`text-xs mt-1 ${
                                    testResult.success ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                    {testResult.message}
                                  </p>
                                </div>
                                <button
                                  onClick={() => setTestResult(null)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`Revoke "${key.name}"?\n\nThis cannot be undone and any services using this key will stop working.`)) {
                              const stored = localStorage.getItem('api_keys') || '[]';
                              const keys = JSON.parse(stored);
                              const updated = keys.filter((k: any) => k.id !== key.id);
                              localStorage.setItem('api_keys', JSON.stringify(updated));
                              setApiKeys(updated);
                            }
                          }}
                          className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Revoke key"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📘 How to use API Keys</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li>Include your API key in the <code className="bg-blue-100 px-1 rounded">Authorization</code> header</li>
                <li>Format: <code className="bg-blue-100 px-1 rounded">Authorization: Bearer YOUR_API_KEY</code></li>
                <li>Test with external tools like <strong>Postman</strong> or <strong>Insomnia</strong></li>
                <li>Use the "Test Key" button to verify it works with your endpoints</li>
                <li>Keep your keys secure - don't share them publicly or commit to git</li>
              </ul>
            </div>
          </div>
        );
      case 'tester':
        return <APITester key={testerKey} />;
      case 'docs':
        return <Documentation endpoints={endpoints} />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard 
          databases={databases} 
          endpoints={endpoints} 
          user={user} 
          onViewChange={(view: string) => setCurrentView(view as ViewType)} 
        />;
    }
  };

  const handleLogout = async () => {
    // Clear saved view on logout for security
    localStorage.removeItem('dashboardView');
    await logout();
    router.push('/landing');
  };

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            
            <img 
              src="/logo.png" 
              alt="APIFlow" 
              className="h-12 w-auto object-contain"
            />
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-700">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-16 h-full w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-4">
          <nav className="space-y-2">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id as ViewType);
                  localStorage.setItem('dashboardView', item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentView === item.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 pt-16">
        <main className="p-6">
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
}
