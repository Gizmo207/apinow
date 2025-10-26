import React, { useState, useEffect } from 'react';
import { Trash2, ExternalLink, Zap, RefreshCw, Shield, ShieldOff, CheckCircle, XCircle, Globe, Lock } from 'lucide-react';

export function MyAPIs() {
  const [savedEndpoints, setSavedEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);

  useEffect(() => {
    loadSavedEndpoints();
    loadApiKeys();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const loadSavedEndpoints = async () => {
    setLoading(true);
    try {
      const { FirebaseService } = await import('../services/firebaseService');
      const firebaseService = FirebaseService.getInstance();
      const endpoints = await firebaseService.getEndpoints();
      setSavedEndpoints(endpoints);
    } catch (error) {
      console.error('Failed to load endpoints:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeys = async () => {
    try {
      const { auth } = await import('../services/firebaseService');
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch('/api/api-keys', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.apiKeys || []);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  const togglePublic = async (endpointId: string, currentStatus: boolean) => {
    console.log('[MyAPIs] togglePublic called with endpointId:', endpointId, 'currentStatus:', currentStatus);
    
    if (!endpointId) {
      console.error('[MyAPIs] ERROR: endpointId is empty or undefined!');
      showToast('Error: Endpoint ID is missing', 'error');
      return;
    }
    
    setTogglingId(endpointId);
    try {
      const { auth } = await import('../services/firebaseService');
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();
      console.log('[MyAPIs] Toggling endpoint:', endpointId, 'to:', !currentStatus);
      
      const response = await fetch(`/api/endpoints/${endpointId}/toggle-public`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublic: !currentStatus }),
      });

      console.log('[MyAPIs] Response status:', response.status);
      console.log('[MyAPIs] Response content-type:', response.headers.get('content-type'));

      if (!response.ok) {
        const responseText = await response.text();
        console.error('[MyAPIs] Error response text:', responseText);
        
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.error || 'Failed to toggle endpoint visibility');
        } catch (e) {
          // Response wasn't JSON
          throw new Error(`Server error (${response.status}): ${responseText.substring(0, 200)}`);
        }
      }

      const result = await response.json();
      console.log('[MyAPIs] Success result:', result);

      // Update local state
      setSavedEndpoints(prev => prev.map(ep => 
        ep.id === endpointId ? { ...ep, isPublic: !currentStatus } : ep
      ));

      showToast(
        `Endpoint is now ${!currentStatus ? 'PUBLIC 🌍' : 'PROTECTED 🔒'}`,
        'success'
      );
    } catch (error: any) {
      console.error('[MyAPIs] Failed to toggle endpoint:', error);
      showToast(error.message || 'Failed to update endpoint', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API endpoint?')) {
      return;
    }

    setDeletingId(id);
    try {
      const { FirebaseService } = await import('../services/firebaseService');
      const firebaseService = FirebaseService.getInstance();
      await firebaseService.deleteEndpoint(id);
      setSavedEndpoints(prev => prev.filter(ep => ep.id !== id));
      showToast('API endpoint deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete endpoint:', error);
      showToast('Failed to delete endpoint', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'POST': return 'text-green-600 bg-green-50 border-green-200';
      case 'PUT': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'DELETE': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'GET': return '📥';
      case 'POST': return '➕';
      case 'PUT': return '✏️';
      case 'DELETE': return '🗑️';
      default: return '📌';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📌 My APIs</h1>
        <p className="text-gray-600 mt-1">
          Manage your saved API endpoints. Create new ones in the API Explorer.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-700">{savedEndpoints.length}</div>
          <div className="text-sm text-blue-600">Total Endpoints</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">
            {savedEndpoints.filter(ep => ep.isActive).length}
          </div>
          <div className="text-sm text-green-600">Active</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-700">
            {savedEndpoints.filter(ep => ep.authRequired).length}
          </div>
          <div className="text-sm text-yellow-600">Authenticated</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-700">
            {new Set(savedEndpoints.map(ep => ep.connectionId)).size}
          </div>
          <div className="text-sm text-purple-600">Databases</div>
        </div>
      </div>

      {/* Endpoints List */}
      {savedEndpoints.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No APIs Yet</h3>
          <p className="text-gray-600 mb-4">
            Go to API Explorer to browse and save auto-generated endpoints
          </p>
          <button
            onClick={() => window.location.hash = '#unified'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to API Explorer
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {savedEndpoints.map((endpoint) => {
            console.log('[MyAPIs] Rendering endpoint:', { id: endpoint.id, name: endpoint.name, path: endpoint.path });
            return (
            <div
              key={endpoint.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Method and Path */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{getMethodIcon(endpoint.method)}</span>
                    <span className={`px-3 py-1 rounded-md text-sm font-semibold border ${getMethodColor(endpoint.method)}`}>
                      {endpoint.method}
                    </span>
                    <code className="text-sm font-mono bg-gray-100 px-3 py-1 rounded border border-gray-200">
                      {endpoint.path}
                    </code>
                  </div>

                  {/* Name and Description */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{endpoint.name}</h3>
                  
                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span className="flex items-center gap-1">
                      📊 Table: <code className="font-mono text-xs bg-gray-100 px-1 rounded">{endpoint.tableName}</code>
                    </span>
                    {!endpoint.isActive && (
                      <span className="text-red-600 text-xs">● Inactive</span>
                    )}
                  </div>

                  {/* Deploy Mode Toggle */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {endpoint.isPublic ? (
                          <>
                            <Globe className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">🌍 Public</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-700">🔒 Protected</span>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => togglePublic(endpoint.id, endpoint.isPublic)}
                        disabled={togglingId === endpoint.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          endpoint.isPublic ? 'bg-green-600' : 'bg-gray-300'
                        } disabled:opacity-50`}
                        title={endpoint.isPublic ? 'Make Protected' : 'Make Public'}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          endpoint.isPublic ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    
                    {endpoint.isPublic ? (
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-start gap-1">
                          <span className="font-medium">Public URL:</span>
                          <code className="flex-1 bg-white px-2 py-1 rounded text-xs break-all">
                            {`${window.location.origin}/api/public${endpoint.path}`}
                          </code>
                        </div>
                        {apiKeys.length > 0 && (
                          <div className="text-xs text-green-700 mt-1">
                            ✓ Add <code className="bg-white px-1 rounded">?key=YOUR_API_KEY</code> to the URL
                          </div>
                        )}
                        {apiKeys.length === 0 && (
                          <div className="text-xs text-yellow-700 mt-1">
                            ⚠️ Generate an API key in Settings to use this endpoint
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600">
                        <div>Protected URL: <code className="bg-white px-1 rounded">{`${window.location.origin}/api/dynamic${endpoint.path}`}</code></div>
                        <div className="text-gray-500 mt-1">Only accessible with Firebase authentication</div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const url = endpoint.isPublic 
                          ? `${window.location.origin}/api/public${endpoint.path}${apiKeys.length > 0 ? `?key=${apiKeys[0].key}` : '?key=YOUR_KEY'}`
                          : `${window.location.origin}/api/dynamic${endpoint.path}`;
                        const success = await copyToClipboard(url);
                        if (success) {
                          showToast(`${endpoint.isPublic ? 'Public' : 'Protected'} URL copied!`, 'success');
                        } else {
                          showToast('Failed to copy URL', 'error');
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {endpoint.isPublic ? 'Copy Public URL' : 'Copy URL'}
                    </button>
                    <a
                      href={`#tester?url=${encodeURIComponent(`http://localhost:3000${endpoint.path}`)}`}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                      Test in API Tester
                    </a>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(endpoint.id)}
                  disabled={deletingId === endpoint.id}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  title="Delete endpoint"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Help Text */}
      {savedEndpoints.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">💡 How to use your APIs:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>Click "Copy URL" to get the full endpoint URL</li>
            <li>Click "Test in API Tester" to try it out immediately</li>
            <li>Use these URLs in your frontend apps or external tools</li>
            <li>Protected endpoints require an Authorization header</li>
          </ul>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg animate-slide-up z-50 ${
          toast.type === 'success' 
            ? 'bg-green-600 text-white' 
            : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
