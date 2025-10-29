import React, { useState } from 'react';
import { Settings as SettingsIcon, Key, Shield, Bell, User, Code, Copy, Check, CreditCard } from 'lucide-react';
import { BillingTab } from './BillingTab';

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
  const [tokenCopied, setTokenCopied] = useState(false);
  const [token, setToken] = useState('');
  const [gettingToken, setGettingToken] = useState(false);

  // Read tab from URL on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const statusParam = params.get('status');
      
      if (tabParam) {
        setActiveTab(tabParam);
      }
      
      // Log Stripe return status
      if (statusParam === 'success') {
        console.log('[Settings] Payment successful!');
      } else if (statusParam === 'cancelled') {
        console.log('[Settings] Payment cancelled');
      }
    }
  }, []);
  
  // Account settings state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  
  // Theme and preferences state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });
  const [timezone, setTimezone] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    return 'UTC';
  });
  
  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    apiUsageAlerts: true,
    downtimeAlerts: true,
    securityAlerts: true,
    weeklyReports: false,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [showTestReport, setShowTestReport] = useState(false);

  // Security settings state
  const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState(false);
  const [allowedOrigins, setAllowedOrigins] = useState('*');
  const [savingSecurity, setSavingSecurity] = useState(false);


  // General settings state
  const [orgName, setOrgName] = useState('');
  const [rateLimit, setRateLimit] = useState('100');
  const [authMode, setAuthMode] = useState('required');
  const [savingGeneral, setSavingGeneral] = useState(false);

  // Load user data and notification preferences on mount
  React.useEffect(() => {
    const loadUserData = async () => {
      const user = mockAuth.currentUser;
      if (user) {
        setDisplayName(user.displayName || '');
        setEmail(user.email || '');

        // Load notification preferences from API
        try {
          const token = await user.getIdToken();
          const response = await fetch('/api/notifications/preferences', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            setNotificationPrefs(data.notificationPrefs);
          }
        } catch (error) {
          console.error('Failed to load notification preferences:', error);
        }

        // Load general settings
        try {
          const token = await user.getIdToken();
          const response = await fetch('/api/settings/general', {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (response.ok) {
            const data = await response.json();
            const settings = data.generalSettings;
            setOrgName(settings.orgName || '');
            setRateLimit(settings.rateLimit || '100');
            setAuthMode(settings.authMode || 'required');
          }
        } catch (error) {
          console.error('Failed to load general settings:', error);
        }
      }
    };

    loadUserData();
  }, []);

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'account', label: 'Account', icon: User },
    { id: 'developer', label: 'Developer', icon: Code },
  ];

  const getMyToken = async () => {
    setGettingToken(true);
    try {
      const user = mockAuth.currentUser;
      if (user) {
        const idToken = await user.getIdToken();
        setToken(idToken);
        navigator.clipboard.writeText(idToken);
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 3000);
      }
    } catch (error) {
      console.error('Failed to get token:', error);
    } finally {
      setGettingToken(false);
    }
  };

  const saveAccountSettings = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    
    try {
      const user = mockAuth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      // Update display name in Firebase Auth
      const { updateProfile } = await import('firebase/auth');
      await updateProfile(user, {
        displayName: displayName,
      });

      // Note: Email changes require re-authentication in Firebase
      // For now, we'll just update the display name
      if (email !== user.email) {
        setSaveError('Email changes require re-authentication. Display name updated successfully.');
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    setDeleting(true);
    try {
      const user = mockAuth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      // Delete user from Firebase Auth
      await user.delete();
      
      // Redirect to login page
      window.location.href = '/';
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      if (error.code === 'auth/requires-recent-login') {
        alert('For security, please log out and log back in, then try deleting your account again.');
      } else {
        alert('Failed to delete account: ' + (error.message || 'Unknown error'));
      }
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleManageSubscription = () => {
    alert('💳 Subscription management coming soon!\n\nThis will integrate with Stripe to let you:\n• Upgrade/downgrade plans\n• Update payment methods\n• View billing history\n• Cancel subscription');
  };

  const saveSecuritySettings = async () => {
    setSavingSecurity(true);
    try {
      const user = mockAuth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();
      const response = await fetch('/api/security/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ipWhitelistEnabled,
          allowedOrigins: allowedOrigins.split(',').map(o => o.trim()).filter(Boolean),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save security settings');
      }

      alert('✅ Security settings saved successfully!');
      console.log('[Security] Settings saved successfully');
    } catch (error) {
      console.error('[Security] Failed to save settings:', error);
      alert('❌ Failed to save security settings');
    } finally {
      setSavingSecurity(false);
    }
  };

  const saveGeneralSettings = async () => {
    setSavingGeneral(true);
    try {
      const user = mockAuth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();
      const response = await fetch('/api/settings/general', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgName,
          rateLimit,
          authMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save general settings');
      }

      alert('✅ General settings saved successfully!');
      console.log('[General] Settings saved successfully');
    } catch (error) {
      console.error('[General] Failed to save settings:', error);
      alert('❌ Failed to save general settings');
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    // Apply theme to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleTimezoneChange = (newTimezone: string) => {
    setTimezone(newTimezone);
    localStorage.setItem('timezone', newTimezone);
  };

  const handleExportAllData = () => {
    // Gather all user data from localStorage
    const allData = {
      profile: {
        displayName,
        email,
        theme,
        timezone,
      },
      databases: JSON.parse(localStorage.getItem('sqlite_databases') || '[]'),
      endpoints: JSON.parse(localStorage.getItem('saved_endpoints') || '[]'),
      apiKeys: JSON.parse(localStorage.getItem('api_keys') || '[]'),
      analytics: JSON.parse(localStorage.getItem('api_analytics') || '[]'),
      exportedAt: new Date().toISOString(),
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apinow-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleNotification = async (key: keyof typeof notificationPrefs) => {
    const newPrefs = {
      ...notificationPrefs,
      [key]: !notificationPrefs[key],
    };
    setNotificationPrefs(newPrefs);
    
    // Auto-save to Firestore
    setSavingNotifications(true);
    try {
      const user = mockAuth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationPrefs: newPrefs }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      console.log('[Notifications] Preferences saved successfully');
    } catch (error) {
      console.error('[Notifications] Failed to save preferences:', error);
      // Revert on error
      setNotificationPrefs(notificationPrefs);
    } finally {
      setSavingNotifications(false);
    }
  };

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
          {activeTab === 'billing' && (
            <BillingTab user={mockAuth.currentUser} />
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
                {savingGeneral && (
                  <span className="text-sm text-gray-500">Saving...</span>
                )}
              </div>
                
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Enter your organization name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">This will be displayed in your API documentation</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Rate Limit
                  </label>
                  <select 
                    value={rateLimit}
                    onChange={(e) => setRateLimit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="100">100 requests/minute</option>
                    <option value="500">500 requests/minute</option>
                    <option value="1000">1000 requests/minute</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Applied to all new API endpoints by default</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Default Authentication
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="auth" 
                        value="required" 
                        checked={authMode === 'required'}
                        onChange={(e) => setAuthMode(e.target.value)}
                        className="mr-2" 
                      />
                      <span>Require API key for all endpoints</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="auth" 
                        value="optional" 
                        checked={authMode === 'optional'}
                        onChange={(e) => setAuthMode(e.target.value)}
                        className="mr-2" 
                      />
                      <span>Make API key optional</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="auth" 
                        value="none" 
                        checked={authMode === 'none'}
                        onChange={(e) => setAuthMode(e.target.value)}
                        className="mr-2" 
                      />
                      <span>No authentication required</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">You can override this for individual endpoints</p>
                </div>

                <button
                  onClick={saveGeneralSettings}
                  disabled={savingGeneral}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {savingGeneral ? 'Saving...' : '💾 Save General Settings'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
                {savingSecurity && (
                  <span className="text-sm text-gray-500">Saving...</span>
                )}
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">🛡️ IP Whitelisting</h3>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
                    <div>
                      <p className="text-sm text-gray-900 font-medium">Restrict API access to specific IP addresses</p>
                      <p className="text-xs text-gray-600 mt-1">Only whitelisted IPs can call your API endpoints</p>
                    </div>
                    <button 
                      onClick={() => setIpWhitelistEnabled(!ipWhitelistEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        ipWhitelistEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        ipWhitelistEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  {ipWhitelistEnabled && (
                    <div className="border border-gray-200 rounded-lg p-4 bg-white">
                      <p className="text-sm text-gray-700 mb-2">
                        ⚠️ <strong>IP Whitelisting is ENABLED</strong>. Only requests from your current IP will be allowed.
                      </p>
                      <p className="text-xs text-gray-600">
                        Your IP will be automatically detected and whitelisted when you save.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">🌐 CORS Settings</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Allowed Origins
                      </label>
                      <input
                        type="text"
                        value={allowedOrigins}
                        onChange={(e) => setAllowedOrigins(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://example.com, https://app.example.com"
                      />
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        <strong>*</strong> = Allow all origins (not secure for production)
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        For production, specify your domains: <code className="bg-yellow-100 px-1">https://yourdomain.com</code>
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">🔒 SSL/TLS</h3>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <p className="text-sm text-green-900 font-medium">Force HTTPS for all API endpoints</p>
                      <p className="text-xs text-green-700">All connections are automatically encrypted ✅</p>
                    </div>
                    <div className="bg-green-500 h-6 w-11 rounded-full flex items-center justify-end px-1">
                      <span className="h-4 w-4 bg-white rounded-full" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    SSL/TLS is always enabled and cannot be disabled for security reasons.
                  </p>
                </div>

                <button
                  onClick={saveSecuritySettings}
                  disabled={savingSecurity}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {savingSecurity ? 'Saving...' : '💾 Save Security Settings'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
                {savingNotifications && (
                  <span className="text-sm text-gray-500">Saving...</span>
                )}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  📧 <strong>Email notifications</strong> will be sent to: <strong>{email}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Change your email in the Account tab to receive notifications at a different address.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">API Usage Alerts</h3>
                    <p className="text-sm text-gray-600">Get notified when approaching rate limits</p>
                  </div>
                  <button 
                    onClick={() => toggleNotification('apiUsageAlerts')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notificationPrefs.apiUsageAlerts ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationPrefs.apiUsageAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">Downtime Alerts</h3>
                    <p className="text-sm text-gray-600">Immediate alerts for API outages</p>
                  </div>
                  <button 
                    onClick={() => toggleNotification('downtimeAlerts')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notificationPrefs.downtimeAlerts ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationPrefs.downtimeAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">Security Alerts</h3>
                    <p className="text-sm text-gray-600">Notifications for unauthorized access attempts</p>
                  </div>
                  <button 
                    onClick={() => toggleNotification('securityAlerts')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notificationPrefs.securityAlerts ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationPrefs.securityAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">Weekly Reports</h3>
                    <p className="text-sm text-gray-600">Weekly API usage and performance summaries</p>
                  </div>
                  <button 
                    onClick={() => toggleNotification('weeklyReports')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notificationPrefs.weeklyReports ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationPrefs.weeklyReports ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="font-medium text-gray-900 mb-2">📨 How Notifications Work:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>API Usage Alerts:</strong> Triggered at 80% and 95% of rate limit</li>
                  <li>• <strong>Downtime Alerts:</strong> Instant notification if API goes down</li>
                  <li>• <strong>Security Alerts:</strong> Notified of failed auth attempts or suspicious activity</li>
                  <li>• <strong>Weekly Reports:</strong> Every Monday at 9 AM with usage stats</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Account Settings</h2>
              
              {saveSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">✓ Settings saved successfully!</p>
                </div>
              )}
              
              {saveError && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">{saveError}</p>
                </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Profile Information</h3>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">Email changes require re-authentication for security</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Preferences</h3>
                  
                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">Theme</h4>
                      <p className="text-sm text-gray-600">Choose between light and dark mode</p>
                    </div>
                    <button 
                      onClick={handleThemeToggle}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  {/* Timezone Selector */}
                  <div className="p-4 border border-gray-200 rounded-lg mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => handleTimezoneChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Europe/Paris">Central European (CET)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Asia/Shanghai">Shanghai (CST)</option>
                      <option value="Australia/Sydney">Sydney (AEDT)</option>
                      <option value="UTC">UTC</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Used for timestamps in analytics and logs</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Data Management</h3>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium text-gray-900 mb-2">Export All Data</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Download all your data including databases, endpoints, API keys, and analytics in JSON format.
                    </p>
                    <button 
                      onClick={handleExportAllData}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      📥 Export All Data
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Current Plan</h3>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">Pro Plan</h4>
                        <p className="text-sm text-gray-600">Unlimited APIs, advanced features</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">$49</p>
                        <p className="text-sm text-gray-500">/month</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleManageSubscription}
                      className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Manage Subscription
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Danger Zone</h3>
                  <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <h4 className="font-medium text-red-900">Delete Account</h4>
                    <p className="text-sm text-red-700 mb-3">
                      This will permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">⚠️ Delete Account</h3>
                      <p className="text-gray-700 mb-4">
                        This action is <strong>permanent</strong> and cannot be undone. All your data will be deleted:
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-600 mb-4 space-y-1">
                        <li>All API endpoints</li>
                        <li>Database connections</li>
                        <li>Analytics data</li>
                        <li>Account settings</li>
                      </ul>
                      <p className="text-sm text-gray-700 mb-4">
                        Type <strong>DELETE</strong> to confirm:
                      </p>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Type DELETE"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText('');
                          }}
                          disabled={deleting}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleting || deleteConfirmText !== 'DELETE'}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deleting ? 'Deleting...' : 'Delete Forever'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button 
                onClick={saveAccountSettings}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}