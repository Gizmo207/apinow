import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  GitBranch, 
  Wrench, 
  TestTube, 
  FileText, 
  BarChart3, 
  Settings 
} from 'lucide-react';
import { ViewType, User } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  databases: any[];
  endpoints: any[];
  user: User;
}

export function Sidebar({ currentView, onViewChange, databases, endpoints, user }: SidebarProps) {
  const menuItems = [
    { id: 'databases', label: 'Databases', icon: Database, count: databases?.length || 0 },
    { id: 'schema', label: 'Schema Explorer', icon: GitBranch, count: null },
    { id: 'builder', label: 'API Builder', icon: Wrench, count: null },
    { id: 'tester', label: 'API Tester', icon: TestTube, count: null },
    { id: 'docs', label: 'Documentation', icon: FileText, count: endpoints?.length || 0 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, count: null },
    { id: 'settings', label: 'Settings', icon: Settings, count: null },
  ];

  return (
    <div className="fixed left-0 top-16 h-full w-64 bg-white border-r border-gray-200">
      <div className="p-4">
        <nav className="space-y-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as ViewType)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                currentView === item.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.count && (
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    
      {user?.plan === 'free' && (
        <div className="mt-auto p-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-lg text-white">
            <h3 className="font-semibold mb-1">Upgrade to Pro</h3>
            <p className="text-sm text-blue-100 mb-3">Unlimited APIs, advanced features</p>
            <button 
              onClick={() => window.location.href = '/pricing'}
              className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;