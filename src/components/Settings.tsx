import React, { useState } from 'react';
import { Settings as SettingsIcon, Key, Shield, Bell, User, Code, Copy, Check } from 'lucide-react';
import { auth } from '@/services/firebaseService';

export function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [tokenCopied, setTokenCopied] = useState(false);
  const [token, setToken] = useState('');
  const [gettingToken, setGettingToken] = useState(false);

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'developer', label: 'Developer Tools', icon: Code },
    { id: 'api-keys', label: 'API Keys', icon: Key },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'account', label: 'Account', icon: User },
  ];

  const getMyToken = async () => {
    setGettingToken(true);
    try {
      const user = auth.currentUser;
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
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      defaultValue="Acme Corp"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Rate Limit
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option>100 requests/minute</option>
                      <option>500 requests/minute</option>
                      <option>1000 requests/minute</option>
                      <option>Unlimited</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Default Authentication
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input type="radio" name="auth" value="required" defaultChecked className="mr-2" />
                        <span>Require API key for all endpoints</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="auth" value="optional" className="mr-2" />
                        <span>Make API key optional</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="auth" value="none" className="mr-2" />
                        <span>No authentication required</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'developer' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Developer Tools</h2>
              
              <div className="space-y-6">
                <div className="border border-blue-200 rounded-lg p-6 bg-blue-50">
                  <h3 className="font-medium text-gray-900 mb-2">🔑 Get My Firebase ID Token</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Click the button below to get your Firebase authentication token. This token will be automatically copied to your clipboard.
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    <strong>Use this token to run the analytics test script:</strong>
                  </p>
                  <code className="block bg-gray-900 text-green-400 p-3 rounded-md text-sm mb-4">
                    node test-analytics.js YOUR_TOKEN_HERE
                  </code>
                  
                  <button
                    onClick={getMyToken}
                    disabled={gettingToken}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                  >
                    {tokenCopied ? (
                      <>
                        <Check className="w-5 h-5" />
                        <span>Token Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        <span>{gettingToken ? 'Getting Token...' : 'Get My Token'}</span>
                      </>
                    )}
                  </button>

                  {token && (
                    <div className="mt-4 p-3 bg-white rounded-md border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Your Token (already copied to clipboard):</p>
                      <code className="text-xs text-gray-700 break-all">{token}</code>
                    </div>
                  )}
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-medium text-gray-900 mb-2">📊 Analytics Test Script</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Run the test script to generate 100 API requests and see your analytics in action:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Click "Get My Token" button above</li>
                    <li>Open a terminal in your project root</li>
                    <li>Run: <code className="bg-gray-100 px-2 py-1 rounded">node test-analytics.js [paste-token-here]</code></li>
                    <li>Watch the script make 100 requests</li>
                    <li>Go to Analytics page to see the data!</li>
                  </ol>
                </div>

                <div className="border border-yellow-200 rounded-lg p-6 bg-yellow-50">
                  <h3 className="font-medium text-yellow-900 mb-2">⚠️ Security Note</h3>
                  <p className="text-sm text-yellow-700">
                    Your Firebase ID token is sensitive. Never share it publicly or commit it to version control. 
                    Tokens expire after 1 hour and will be automatically refreshed by Firebase.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api-keys' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Generate New Key
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { name: 'Production Key', key: 'pk_live_xxxxxxxxxxxxxxxx', created: '2024-01-15', lastUsed: '2 minutes ago' },
                  { name: 'Development Key', key: 'pk_test_xxxxxxxxxxxxxxxx', created: '2024-01-10', lastUsed: '1 hour ago' }
                ].map((apiKey, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{apiKey.name}</h3>
                        <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                          {apiKey.key}
                        </code>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-700 text-sm">Copy</button>
                        <button className="text-red-600 hover:text-red-700 text-sm">Revoke</button>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-gray-500">
                      <span>Created: {apiKey.created}</span>
                      <span className="mx-2">•</span>
                      <span>Last used: {apiKey.lastUsed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">IP Whitelisting</h3>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-900">Restrict API access to specific IP addresses</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">CORS Settings</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Allowed Origins
                      </label>
                      <input
                        type="text"
                        defaultValue="*"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://example.com, https://app.example.com"
                      />
                    </div>
                    <p className="text-sm text-gray-500">Use * to allow all origins (not recommended for production)</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">SSL/TLS</h3>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm text-green-900">Force HTTPS for all API endpoints</p>
                      <p className="text-xs text-green-700">All connections are automatically encrypted</p>
                    </div>
                    <div className="bg-green-500 h-6 w-11 rounded-full flex items-center justify-end px-1">
                      <span className="h-4 w-4 bg-white rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
              
              <div className="space-y-4">
                {[
                  { title: 'API Usage Alerts', description: 'Get notified when approaching rate limits', enabled: true },
                  { title: 'Downtime Alerts', description: 'Immediate alerts for API outages', enabled: true },
                  { title: 'Security Alerts', description: 'Notifications for unauthorized access attempts', enabled: true },
                  { title: 'Weekly Reports', description: 'Weekly API usage and performance summaries', enabled: false }
                ].map((notification, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{notification.title}</h3>
                      <p className="text-sm text-gray-600">{notification.description}</p>
                    </div>
                    <button 
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notification.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notification.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Account Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Profile Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        defaultValue="John"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        defaultValue="Doe"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      defaultValue="john@company.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
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
                    <button className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium">
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
                    <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}