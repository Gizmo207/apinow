import React, { useState, useEffect } from 'react';
import { Send, Copy, Download, Check } from 'lucide-react';
import { getAuthHeaders } from '@/lib/clientAuth';

export function APITester() {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty');
  const [copied, setCopied] = useState(false);
  const [useAuth, setUseAuth] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [savedEndpoints, setSavedEndpoints] = useState<any[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('');

  // Load saved endpoints
  useEffect(() => {
    loadSavedEndpoints();
  }, []);

  // Parse URL params on mount and listen for hash changes
  useEffect(() => {
    const loadFromHash = () => {
      const params = new URLSearchParams(window.location.hash.split('?')[1]);
      const urlParam = params.get('url');
      const methodParam = params.get('method');
      
      if (urlParam) {
        setUrl(urlParam);
        
        // Auto-select matching endpoint from dropdown
        const matchingEndpoint = savedEndpoints.find(ep => {
          const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
          const fullPath = `${origin}${ep.path}`;
          return fullPath === urlParam && ep.method === (methodParam || method);
        });
        
        if (matchingEndpoint) {
          setSelectedEndpoint(matchingEndpoint.id);
        }
      }
      if (methodParam) {
        setMethod(methodParam);
      }
    };

    loadFromHash();
    window.addEventListener('hashchange', loadFromHash);
    return () => window.removeEventListener('hashchange', loadFromHash);
  }, [savedEndpoints, method]);

  const loadSavedEndpoints = async () => {
    try {
      const { FirebaseService } = await import('../services/firebaseService');
      const firebaseService = FirebaseService.getInstance();
      const endpoints = await firebaseService.getEndpoints();
      setSavedEndpoints(endpoints);
    } catch (error) {
      console.error('Failed to load endpoints:', error);
    }
  };

  const handleEndpointSelect = (endpointId: string) => {
    setSelectedEndpoint(endpointId);
    const endpoint = savedEndpoints.find(ep => ep.id === endpointId);
    if (endpoint) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      setUrl(`${origin}${endpoint.path}`);
      setMethod(endpoint.method);
      
      // Auto-fill body for POST requests
      if (endpoint.method === 'POST') {
        setBody(JSON.stringify({
          name: "Test Document",
          description: "Created via API Tester",
          createdAt: new Date().toISOString()
        }, null, 2));
      } else {
        setBody('');
      }
    }
  };

  const handleSendRequest = async () => {
    if (!url) return;

    setLoading(true);
    setDebugInfo('');
    let debugLog = '';
    
    console.log('=== API TESTER DEBUG START ===');
    console.log('useAuth state:', useAuth);
    console.log('URL:', url);
    console.log('URL includes localhost:', url.includes('localhost'));
    
    try {
      let parsedHeaders = JSON.parse(headers);
      console.log('Initial headers:', parsedHeaders);
      
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const isSameOrigin = url.startsWith(currentOrigin) || url.includes('localhost') || url.startsWith('/');
      
      debugLog += `useAuth: ${useAuth}\n`;
      debugLog += `URL: ${url}\n`;
      debugLog += `Current origin: ${currentOrigin}\n`;
      debugLog += `Same origin: ${isSameOrigin}\n`;
      
      // Add auth token if enabled and URL is same origin
      if (useAuth && isSameOrigin) {
        console.log('[API Tester] ✅ Auth is ENABLED and URL is same-origin');
        console.log('[API Tester] Getting auth headers...');
        debugLog += '✅ Getting auth headers...\n';
        
        const authHeaders = await getAuthHeaders();
        console.log('[API Tester] Auth headers received:', JSON.stringify(authHeaders, null, 2));
        debugLog += `Auth headers: ${JSON.stringify(authHeaders, null, 2)}\n`;
        
        parsedHeaders = {
          ...parsedHeaders,
          ...authHeaders
        };
      } else {
        console.log('[API Tester] ❌ Auth disabled or not same-origin URL');
        console.log('  - useAuth:', useAuth);
        console.log('  - isSameOrigin:', isSameOrigin);
        debugLog += '❌ Auth NOT added\n';
      }
      
      debugLog += `Final headers: ${JSON.stringify(parsedHeaders, null, 2)}\n`;
      console.log('[API Tester] Final headers to send:', JSON.stringify(parsedHeaders, null, 2));
      
      setDebugInfo(debugLog);
      
      const options: RequestInit = {
        method,
        headers: parsedHeaders,
      };

      if (method !== 'GET' && body) {
        options.body = body;
      }

      console.log('[API Tester] Sending request to:', url);
      const res = await fetch(url, options);
      const responseText = await res.text();
      console.log('[API Tester] Response status:', res.status);
      console.log('=== API TESTER DEBUG END ===');
      
      setResponse(responseText);
      setResponseStatus(res.status);
    } catch (error) {
      console.error('[API Tester] Request failed:', error);
      setResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setResponseStatus(null);
      setDebugInfo(debugLog + `\n❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatValue = (value: any): string => {
    // Handle Firestore timestamps
    if (typeof value === 'object' && value !== null) {
      if (value.seconds !== undefined && value.nanoseconds !== undefined) {
        const date = new Date(value.seconds * 1000);
        return date.toLocaleString();
      }
      if (value._seconds !== undefined) {
        const date = new Date(value._seconds * 1000);
        return date.toLocaleString();
      }
    }
    
    // Handle other types
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const renderPrettyView = () => {
    try {
      const data = JSON.parse(response);
      
      // Extract the actual data if it's wrapped in a response object
      const actualData = data.data || data;
      
      // Case 1: Array of objects - render as table
      if (Array.isArray(actualData) && actualData.length > 0) {
        const headers = Object.keys(actualData[0] || {});
        
        return (
          <div className="overflow-auto max-h-96">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  {headers.map(header => (
                    <th key={header} className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actualData.map((row: any, rowIndex: number) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {headers.map(header => (
                      <td key={header} className="border border-gray-300 px-3 py-2 text-sm text-gray-600">
                        {formatValue(row[header])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      
      // Case 2: Single object - render as key-value pairs
      if (typeof actualData === 'object' && actualData !== null) {
        return (
          <div className="overflow-auto max-h-96 space-y-2 p-3">
            {Object.entries(actualData).map(([key, value]) => (
              <div key={key} className="flex border-b border-gray-200 pb-2">
                <span className="font-semibold text-gray-700 w-1/3">{key}:</span>
                <span className="text-gray-600 w-2/3 break-all">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        );
      }
      
      // Fallback: render as formatted JSON
      return (
        <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto max-h-96 text-gray-800">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
    } catch (error) {
      // If not valid JSON, show as plain text
      return (
        <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto max-h-96 text-gray-800 whitespace-pre-wrap">
          {response}
        </pre>
      );
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">API Tester</h1>
        <p className="text-gray-600">Test your API endpoints with custom requests</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Panel */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Request</h2>
          
          {/* Endpoint Selector */}
          {savedEndpoints.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Saved Endpoint (Optional)
              </label>
              <select
                value={selectedEndpoint}
                onChange={(e) => handleEndpointSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select an endpoint --</option>
                {savedEndpoints
                  .filter(ep => !ep.path.includes(':id')) // Only show testable endpoints
                  .map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.method} - {ep.name} ({ep.path})
                    </option>
                  ))}
              </select>
            </div>
          )}
          
          {/* URL and Method */}
          <div className="flex gap-2 mb-4">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter API endpoint URL..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Headers */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Headers (JSON)</label>
            <textarea
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder='{"Content-Type": "application/json"}'
            />
          </div>

          {/* Body (for POST/PUT requests) */}
          {method !== 'GET' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Request Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder='{"key": "value"}'
              />
            </div>
          )}

          {/* Authentication Toggle */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="useAuth"
              checked={useAuth}
              onChange={(e) => setUseAuth(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="useAuth" className="text-sm text-gray-700">
              Include authentication (auto-adds Bearer token for same-origin requests)
            </label>
          </div>

          {/* Debug Info */}
          {debugInfo && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="text-xs font-semibold text-yellow-800 mb-1">Debug Info:</div>
              <pre className="text-xs text-yellow-900 whitespace-pre-wrap font-mono">{debugInfo}</pre>
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSendRequest}
            disabled={loading || !url}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Sending...' : 'Send Request'}
          </button>
        </div>

        {/* Response Panel */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Response</h2>
            {response && (
              <div className="flex gap-2">
                <button
                  onClick={handleCopyResponse}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  title="Copy response"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([response], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'api-response.json';
                    a.click();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Download response"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Status Code */}
          {responseStatus && (
            <div className="mb-3">
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                responseStatus >= 200 && responseStatus < 300 
                  ? 'bg-green-100 text-green-800'
                  : responseStatus >= 400
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                Status: {responseStatus}
              </span>
            </div>
          )}

          {/* Pretty/Raw Toggle */}
          {response && (
            <div className="flex gap-2 mb-3 bg-gray-100 p-2 rounded-md">
              <button
                onClick={() => setViewMode('pretty')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'pretty'
                    ? 'bg-white font-semibold text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pretty
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'raw'
                    ? 'bg-white font-semibold text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Raw
              </button>
            </div>
          )}

          {/* Response Body */}
          <div className="border border-gray-200 rounded-md bg-gray-50">
            {response ? (
              viewMode === 'pretty' ? (
                renderPrettyView()
              ) : (
                <pre className="p-3 text-sm overflow-auto max-h-96 text-gray-800 font-mono">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(response), null, 2);
                    } catch {
                      return response;
                    }
                  })()}
                </pre>
              )
            ) : (
              <div className="p-6 text-center text-gray-500">
                No response yet. Send a request to see the result.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}