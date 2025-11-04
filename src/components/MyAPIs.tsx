import React, { useState, useEffect } from 'react';
import { Trash2, ExternalLink, Zap, RefreshCw } from 'lucide-react';

interface MyAPIsProps {
  onNavigateToTester?: () => void;
}

export function MyAPIs({ onNavigateToTester }: MyAPIsProps = {}) {
  const [savedEndpoints, setSavedEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadSavedEndpoints();
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
      const endpoints = JSON.parse(localStorage.getItem('saved_endpoints') || '[]');
      setSavedEndpoints(endpoints);
    } catch (error) {
      console.error('Failed to load endpoints:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteEndpoint = async (id: string) => {
    setDeletingId(id);
    try {
      const endpoints = JSON.parse(localStorage.getItem('saved_endpoints') || '[]');
      const updated = endpoints.filter((e: any) => e.id !== id);
      localStorage.setItem('saved_endpoints', JSON.stringify(updated));
      window.dispatchEvent(new Event('endpointsSaved'));
      setSavedEndpoints(updated);
      showToast('Endpoint deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete endpoint:', error);
      showToast('Failed to delete endpoint', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const deleteAllEndpoints = async () => {
    if (!confirm('Are you sure you want to delete ALL saved endpoints? This cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    try {
      localStorage.setItem('saved_endpoints', '[]');
      window.dispatchEvent(new Event('endpointsSaved'));
      setSavedEndpoints([]);
      showToast('All endpoints deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete all endpoints:', error);
      showToast('Failed to delete endpoints', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy:', error);
      return false;
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
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📌 My Endpoints</h1>
          <p className="text-gray-600 mt-1">
            Manage your saved API endpoints.
          </p>
        </div>
        {savedEndpoints.length > 0 && (
          <button
            onClick={deleteAllEndpoints}
            className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete All
          </button>
        )}
      </div>

      {/* Empty State */}
      {savedEndpoints.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No saved endpoints yet</h3>
          <p className="text-gray-600 mb-4">
            Go to the API Builder to create endpoints from your database tables
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {savedEndpoints.map((endpoint) => (
            <div key={endpoint.id} className="bg-white rounded-lg border p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Endpoint Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 text-sm font-medium rounded ${
                      endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                      endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                      endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {endpoint.method}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900">{endpoint.name}</h3>
                  </div>

                  {/* Endpoint Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Path:</span>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">{endpoint.path}</code>
                    </div>
                    {endpoint.description && (
                      <p className="text-sm text-gray-600">{endpoint.description}</p>
                    )}
                    {endpoint.table && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Table:</span>
                        <span className="text-sm font-medium text-gray-900">{endpoint.table}</span>
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      URL: <code className="bg-gray-100 px-2 py-1 rounded">{`${window.location.origin}${endpoint.path}`}</code>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={async () => {
                        const url = `${window.location.origin}${endpoint.path}`;
                        const success = await copyToClipboard(url);
                        if (success) {
                          showToast('URL copied!', 'success');
                        } else {
                          showToast('Failed to copy URL', 'error');
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Copy URL
                    </button>
                    <button
                      onClick={() => {
                        localStorage.setItem('tester_prefill', JSON.stringify({
                          url: `${window.location.origin}${endpoint.path}`,
                          method: endpoint.method,
                          endpointId: endpoint.id
                        }));
                        if (onNavigateToTester) {
                          onNavigateToTester();
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                      Test in Endpoint Tester
                    </button>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => deleteEndpoint(endpoint.id)}
                  disabled={deletingId === endpoint.id}
                  className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  title="Delete endpoint"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      {savedEndpoints.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold mb-1">💡 How to use your endpoints:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
            <li>Click "Copy URL" to get the full endpoint URL</li>
            <li>Click "Test in Endpoint Tester" to try it out immediately</li>
            <li>Use these URLs in your frontend apps or external tools</li>
          </ul>
        </div>
      )}
    </div>
  );
}
