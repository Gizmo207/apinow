import React, { useState, useEffect } from 'react';

interface GeneralTabProps {
  user: any;
}

export function GeneralTab({ user }: GeneralTabProps) {
  const [orgName, setOrgName] = useState('');
  const [rateLimit, setRateLimit] = useState('100');
  const [authMode, setAuthMode] = useState('required');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('general_settings');
      if (saved) {
        try {
          const settings = JSON.parse(saved);
          setOrgName(settings.orgName || '');
          setRateLimit(settings.rateLimit || '100');
          setAuthMode(settings.authMode || 'required');
        } catch (error) {
          console.error('Failed to parse general settings:', error);
        }
      }
    }
  }, []);

  const handleSave = () => {
    setSaving(true);
    try {
      const settings = {
        orgName,
        rateLimit,
        authMode,
      };
      localStorage.setItem('general_settings', JSON.stringify(settings));
      alert('✅ General settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('❌ Failed to save general settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
        {saving && <span className="text-sm text-gray-500">Saving...</span>}
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
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {saving ? 'Saving...' : '💾 Save General Settings'}
        </button>
      </div>
    </div>
  );
}
