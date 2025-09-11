import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { User, LogOut, Menu, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import { SupabaseService } from './utils/supabase-service';
import { AuthGuard } from './components/auth/AuthGuard';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { PricingPage } from './components/pricing/PricingPage';
import { SuccessPage } from './components/SuccessPage';
import { Dashboard } from './components/Dashboard';
import { DatabaseConnector } from './components/DatabaseConnector';
import { SchemaExplorer } from './components/SchemaExplorer';
import { APIBuilder } from './components/APIBuilder';
import { UnifiedAPIBuilder } from './components/UnifiedAPIBuilder';
import { APITester } from './components/APITester';
import { Documentation } from './components/Documentation';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { ViewType } from './types';

// Landing page component
function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">API</span>
              </div>
              <span className="text-xl font-bold text-gray-900">APIFlow</span>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Turn Your Database Into Powerful APIs
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Generate REST APIs from your database in minutes. No coding required. 
            Connect any database and instantly create production-ready APIs with authentication, documentation, and more.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/signup')}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Get Started Free
            </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-blue-600 text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h3>
            <p className="text-gray-600">Generate APIs in minutes, not hours. Our no-code platform makes it incredibly fast.</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-2xl">🔒</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure by Default</h3>
            <p className="text-gray-600">Built-in authentication, rate limiting, and security best practices out of the box.</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-purple-600 text-2xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Production Ready</h3>
            <p className="text-gray-600">Automatic documentation, monitoring, and analytics for your APIs.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main application component
function MainApp({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [currentView, setCurrentView] = useState<ViewType>('databases');
  const [databases, setDatabases] = useState<any[]>([]);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load data from Supabase on component mount
  useEffect(() => {
    const loadUserData = async () => {
      const supabaseService = SupabaseService.getInstance();
      
      try {
        // Load databases
        const supabaseConnections = await supabaseService.getConnections();
        const formattedDatabases = supabaseConnections.map(conn => ({
          id: conn.id,
          name: conn.name,
          type: conn.type,
          host: conn.host,
          port: conn.port,
          database: conn.database_name,
          username: conn.username,
          password: conn.encrypted_password,
          projectId: conn.project_id,
          apiKey: conn.api_key,
          authDomain: conn.auth_domain,
          // Firebase Admin SDK fields
          serviceAccountKey: conn.service_account_key,
          adminApiKey: conn.admin_api_key,
          adminAuthDomain: conn.admin_auth_domain,
          databaseURL: conn.database_url,
          storageBucket: conn.storage_bucket,
          connected: conn.status === 'connected',
          createdAt: conn.created_at
        }));
        setDatabases(formattedDatabases);

        // Load endpoints
        const supabaseEndpoints = await supabaseService.getEndpoints();
        setEndpoints(supabaseEndpoints);

        // Try to load user subscription (non-critical, don't break app if it fails)
        try {
          const subscription = await supabaseService.getUserSubscription();
          if (!subscription) {
            await supabaseService.createUserSubscription();
          }
        } catch (subscriptionError) {
          console.log('Failed to load user subscription (non-critical):', subscriptionError);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        
        // Fallback to localStorage for backwards compatibility
        const savedDatabases = localStorage.getItem('apiflow_databases');
        if (savedDatabases) {
          try {
            setDatabases(JSON.parse(savedDatabases));
          } catch (error) {
            console.error('Failed to load saved databases:', error);
          }
        }

        const savedEndpoints = localStorage.getItem('apiflow_endpoints');
        if (savedEndpoints) {
          try {
            setEndpoints(JSON.parse(savedEndpoints));
          } catch (error) {
            console.error('Failed to load saved endpoints:', error);
          }
        }
      }
    };

    loadUserData();
  }, []);

  // Save databases to localStorage whenever they change
  const handleDatabasesChange = (newDatabases: any[]) => {
    setDatabases(newDatabases);
    // Note: Individual save operations are now handled in DatabaseConnector via Supabase
  };

  // Save endpoints to localStorage whenever they change
  const handleEndpointsChange = (newEndpoints: any[]) => {
    setEndpoints(newEndpoints);
    // Note: Individual save operations will be handled via Supabase
  };

  const menuItems = [
    { id: 'databases', label: 'Databases', icon: '🗄️' },
    { id: 'schema', label: 'Schema Explorer', icon: '🔍' },
    { id: 'builder', label: 'API Builder', icon: '🔧' },
    { id: 'unified', label: 'Unified API', icon: '🔗' },
    { id: 'tester', label: 'API Tester', icon: '🧪' },
    { id: 'docs', label: 'Documentation', icon: '📄' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const renderCurrentView = () => {
    switch (currentView) {
      case 'databases':
        return <DatabaseConnector databases={databases} onDatabasesChange={handleDatabasesChange} />;
      case 'schema':
        return <SchemaExplorer databases={databases} currentView={currentView} onViewChange={setCurrentView} endpoints={endpoints} user={user} />;
      case 'builder':
        return <APIBuilder databases={databases} onEndpointsChange={setEndpoints} />;
      case 'unified':
        return <UnifiedAPIBuilder databases={databases} />;
      case 'tester':
        return <APITester />;
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
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">API</span>
              </div>
              <span className="text-xl font-bold text-gray-900">APIFlow</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-700">{user.email}</span>
            </div>
            <button
              onClick={onLogout}
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

// Root App component
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage onSuccess={() => window.location.href = '/'} />} />
        <Route path="/signup" element={<SignupPage onSuccess={() => window.location.href = '/'} />} />
        <Route path="/pricing" element={<PricingPage onSuccess={() => window.location.href = '/'} />} />
        <Route path="/success" element={<SuccessPage onContinue={() => window.location.href = '/'} />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/*" element={
          <AuthGuard
            fallback={<Navigate to="/landing" replace />}
          >
            {(user) => (
              <MainApp 
                user={user} 
                onLogout={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/landing';
                }} 
              />
            )}
          </AuthGuard>
        } />
      </Routes>
    </Router>
  );
}

export default App;