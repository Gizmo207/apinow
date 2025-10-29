import React, { useState, useEffect } from 'react';

interface AccountTabProps {
  user: any;
}

export function AccountTab({ user }: AccountTabProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  
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
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
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

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    
    try {
      if (!user) throw new Error('No user logged in');

      const { updateProfile } = await import('firebase/auth');
      await updateProfile(user, {
        displayName: displayName,
      });

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
      if (!user) throw new Error('No user logged in');

      await user.delete();
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

  return (
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

      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button 
          onClick={handleSave}
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
    </div>
  );
}
