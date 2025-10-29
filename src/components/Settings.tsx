import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, Bell, User, Code, CreditCard } from 'lucide-react';
import { BillingTab } from './BillingTab';
import { GeneralTab } from './settings/GeneralTab';
import { SecurityTab } from './settings/SecurityTab';
import { NotificationsTab } from './settings/NotificationsTab';
import { AccountTab } from './settings/AccountTab';
import { DeveloperTab } from './settings/DeveloperTab';

// Mock auth for Settings
const mockAuth = {
  get currentUser() {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('auth_user');
    if (!stored) return null;
    const user = JSON.parse(stored);
    return {
      ...user,
      displayName: user.displayName || user.email?.split('@')[0],
      async getIdToken() {
        return `dev-${user.uid}`;
      },
      async delete() {
        localStorage.removeItem('auth_user');
      }
    };
  }
};

export function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const user = mockAuth.currentUser;
  const email = user?.email || '';

  // Read tab from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const statusParam = params.get('status');
      
      if (tabParam) {
        setActiveTab(tabParam);
      }
      
      if (statusParam === 'success') {
        console.log('[Settings] Payment successful!');
      } else if (statusParam === 'cancelled') {
        console.log('[Settings] Payment cancelled');
      }
    }
  }, []);

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'account', label: 'Account', icon: User },
    { id: 'developer', label: 'Developer', icon: Code },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account and API configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-6">
          {activeTab === 'general' && <GeneralTab user={user} />}
          {activeTab === 'billing' && <BillingTab user={user} />}
          {activeTab === 'security' && <SecurityTab user={user} />}
          {activeTab === 'notifications' && <NotificationsTab user={user} email={email} />}
          {activeTab === 'account' && <AccountTab user={user} />}
          {activeTab === 'developer' && <DeveloperTab user={user} />}
        </div>
      </div>
    </div>
  );
}
