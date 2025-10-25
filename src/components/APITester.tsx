import React, { useState } from 'react';
import { Send, Copy, Download, Check } from 'lucide-react';

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

  const handleSendRequest = async () => {
    if (!url) return;

    setLoading(true);
    try {
      const parsedHeaders = JSON.parse(headers);
      const options: RequestInit = {
        method,
        headers: parsedHeaders,
      };

      if (method !== 'GET' && body) {
        options.body = body;
      }

      const res = await fetch(url, options);
      const responseText = await res.text();
      
      setResponse(responseText);
      setResponseStatus(res.status);
    } catch (error) {
      setResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setResponseStatus(null);
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