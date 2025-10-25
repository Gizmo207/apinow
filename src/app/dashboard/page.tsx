'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { FirebaseService } from '@/services/firebaseService';
import { Dashboard } from '@/components/Dashboard';
import { DatabaseConnector } from '@/components/DatabaseConnector';
import { SchemaExplorer } from '@/components/SchemaExplorer';
import { MyAPIs } from '@/components/MyAPIs';
import { UnifiedAPIBuilder } from '@/components/UnifiedAPIBuilder';
import { APITester } from '@/components/APITester';
import { Documentation } from '@/components/Documentation';
import { Analytics } from '@/components/Analytics';
import { Settings } from '@/components/Settings';

type ViewType = 'dashboard' | 'databases' | 'schema' | 'builder' | 'unified' | 'tester' | 'docs' | 'analytics' | 'settings';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboardView');
      return (saved as ViewType) || 'databases';
    }
    return 'databases';
  });
  const [databases, setDatabases] = useState<any[]>([]);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Persist current view to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboardView', currentView);
    }
  }, [currentView]);

  useEffect(() => {
    if (!user) {
      router.push('/landing');
      return;
    }

    const loadUserData = async () => {
      const firebaseService = FirebaseService.getInstance();
      
      try {
        const connections = await firebaseService.getConnections();
        const formattedDatabases = connections.map(conn => ({
          id: conn.id,
          name: conn.name,
          type: conn.type,
          host: conn.host,
          port: conn.port,
          database: conn.databaseName,
          username: conn.username,
          password: conn.encryptedPassword,
          projectId: conn.projectId,
          apiKey: conn.apiKey,
          authDomain: conn.authDomain,
          serviceAccountKey: conn.serviceAccountKey,
          adminApiKey: conn.adminApiKey,
          adminAuthDomain: conn.adminAuthDomain,
          databaseURL: conn.databaseURL,
          storageBucket: conn.storageBucket,
          connected: conn.status === 'connected',
          createdAt: conn.createdAt
        }));
        setDatabases(formattedDatabases);

        const apiEndpoints = await firebaseService.getEndpoints();
        setEndpoints(apiEndpoints);

        try {
          const subscription = await firebaseService.getUserSubscription();
          if (!subscription) {
            await firebaseService.createUserSubscription();
          }
        } catch (subscriptionError) {
          console.log('Failed to load user subscription (non-critical):', subscriptionError);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };

    loadUserData();
  }, [user, router]);

  const handleAddDatabase = async (db: any) => {
    const firebaseService = FirebaseService.getInstance();
    try {
      await firebaseService.saveConnection(db);
      const connections = await firebaseService.getConnections();
      const formatted = connections.map(conn => ({
        id: conn.id,
        name: conn.name,
        type: conn.type,
        host: conn.host,
        port: conn.port,
        database: conn.databaseName,
        username: conn.username,
        password: conn.encryptedPassword,
        projectId: conn.projectId,
        apiKey: conn.apiKey,
        authDomain: conn.authDomain,
        serviceAccountKey: conn.serviceAccountKey,
        adminApiKey: conn.adminApiKey,
        adminAuthDomain: conn.adminAuthDomain,
        databaseURL: conn.databaseURL,
        storageBucket: conn.storageBucket,
        connected: conn.status === 'connected',
        createdAt: conn.createdAt
      }));
      setDatabases(formatted);
    } catch (error) {
      console.error('Failed to add database:', error);
      throw error;
    }
  };

  const handleDeleteDatabase = async (id: string) => {
    const firebaseService = FirebaseService.getInstance();
    try {
      await firebaseService.deleteConnection(id);
      setDatabases(prev => prev.filter(db => db.id !== id));
    } catch (error) {
      console.error('Failed to delete database:', error);
      throw error;
    }
  };

  const handleTestDatabase = async (db: any) => {
    // Test connection logic
    console.log('Testing database connection:', db);
  };

  const handleEndpointsChange = (newEndpoints: any[]) => {
    setEndpoints(newEndpoints);
  };

  const menuItems = [
    { id: 'databases', label: 'Databases', icon: '🗄️' },
    { id: 'schema', label: 'Schema Explorer', icon: '🔍' },
    { id: 'builder', label: 'My APIs', icon: '📌' },
    { id: 'unified', label: 'API Explorer', icon: '🔍' },
    { id: 'tester', label: 'API Tester', icon: '🧪' },
    { id: 'docs', label: 'Documentation', icon: '📄' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const renderCurrentView = () => {
    switch (currentView) {
      case 'databases':
        return <DatabaseConnector databases={databases} onAdd={handleAddDatabase} onDelete={handleDeleteDatabase} onTest={handleTestDatabase} />;
      case 'schema':
        return <SchemaExplorer databases={databases} currentView={currentView} onViewChange={setCurrentView} endpoints={endpoints} user={user} />;
      case 'builder':
        return <MyAPIs />;
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

  const handleLogout = async () => {
    await logout();
    router.push('/landing');
  };

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
