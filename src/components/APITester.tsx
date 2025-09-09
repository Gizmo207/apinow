import React, { useState } from 'react';
import { Send, Copy, Download } from 'lucide-react';

export function APITester() {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);

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
                  onClick={() => navigator.clipboard.writeText(response)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copy response"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([response], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'api-response.txt';
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

          {/* Response Body */}
          <div className="border border-gray-200 rounded-md">
            <textarea
              value={response || 'No response yet. Send a request to see the result.'}
              readOnly
              className="w-full h-96 px-3 py-2 font-mono text-sm bg-gray-50 border-0 rounded-md resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}