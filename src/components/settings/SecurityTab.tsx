import React, { useState } from 'react';

interface SecurityTabProps {
  user: any;
}

export function SecurityTab({ user }: SecurityTabProps) {
  const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState(false);
  const [allowedOrigins, setAllowedOrigins] = useState('*');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
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
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('❌ Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
        {saving && <span className="text-sm text-gray-500">Saving...</span>}
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
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {saving ? 'Saving...' : '💾 Save Security Settings'}
        </button>
      </div>
    </div>
  );
}
