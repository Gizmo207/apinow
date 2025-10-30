import React, { useState, useEffect } from 'react';

interface NotificationsTabProps {
  user: any;
  email: string;
}

export function NotificationsTab({ user, email }: NotificationsTabProps) {
  const [notificationPrefs, setNotificationPrefs] = useState({
    apiUsageAlerts: true,
    downtimeAlerts: true,
    securityAlerts: true,
    weeklyReports: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notification_prefs');
      if (saved) {
        try {
          setNotificationPrefs(JSON.parse(saved));
        } catch (error) {
          console.error('Failed to parse notification preferences:', error);
        }
      }
    }
  }, []);

  const toggleNotification = (key: keyof typeof notificationPrefs) => {
    const newPrefs = {
      ...notificationPrefs,
      [key]: !notificationPrefs[key],
    };
    setNotificationPrefs(newPrefs);
    
    setSaving(true);
    try {
      localStorage.setItem('notification_prefs', JSON.stringify(newPrefs));
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setNotificationPrefs(notificationPrefs);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
        {saving && <span className="text-sm text-gray-500">Saving...</span>}
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
  );
}
