import React, { useState } from 'react';
import { FileText, Copy, Check, Download } from 'lucide-react';

interface DocumentationProps {
  endpoints: any[];
}

export function Documentation({ endpoints }: DocumentationProps) {
  const [selectedEndpoint, setSelectedEndpoint] = useState('');
  const [copied, setCopied] = useState(false);

  const selectedEndpointData = endpoints.find(ep => ep.id === selectedEndpoint);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateCodeExample = (language: string) => {
    if (!selectedEndpointData) return '';
    
    const url = `https://api.apiflow.com${selectedEndpointData.path}`;
    const method = selectedEndpointData.method;
    
    switch (language) {
      case 'javascript':
        return `// JavaScript (fetch)
const response = await fetch('${url}', {
  method: '${method}',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }${method !== 'GET' ? ',\n  body: JSON.stringify(data)' : ''}
});

const result = await response.json();
console.log(result);`;

      case 'python':
        return `# Python (requests)
import requests

url = '${url}'
headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
}

response = requests.${method.toLowerCase()}(url, headers=headers${method !== 'GET' ? ', json=data' : ''})
result = response.json()
print(result)`;

      case 'curl':
        return `# cURL
curl -X ${method} "${url}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"${method !== 'GET' ? ' \\\n  -d \'{"key": "value"}\'' : ''}`;

      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
          <p className="text-gray-600">Complete documentation for all your APIs</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Endpoints List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Endpoints ({endpoints.length})</h2>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {endpoints.map(endpoint => (
                <button
                  key={endpoint.id}
                  onClick={() => setSelectedEndpoint(endpoint.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedEndpoint === endpoint.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                      endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                      endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {endpoint.method}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900">{endpoint.name}</p>
                  <code className="text-xs text-gray-600">{endpoint.path}</code>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Documentation Content */}
        <div className="lg:col-span-2">
          {selectedEndpointData ? (
            <div className="space-y-6">
              {/* Endpoint Overview */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <span className={`px-3 py-1 text-sm font-medium rounded ${
                    selectedEndpointData.method === 'GET' ? 'bg-green-100 text-green-800' :
                    selectedEndpointData.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                    selectedEndpointData.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedEndpointData.method}
                  </span>
                  <code className="text-lg text-gray-700">
                    https://api.apiflow.com{selectedEndpointData.path}
                  </code>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {selectedEndpointData.name}
                </h2>
                <p className="text-gray-600">
                  {selectedEndpointData.method === 'GET' ? 'Retrieve data from' :
                   selectedEndpointData.method === 'POST' ? 'Create new record in' :
                   selectedEndpointData.method === 'PUT' ? 'Update record in' :
                   'Delete record from'} the {selectedEndpointData.table} table.
                </p>
              </div>

              {/* Authentication */}
              {selectedEndpointData.authentication && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Authentication</h3>
                  <p className="text-gray-600 mb-3">
                    This endpoint requires API key authentication. Include your API key in the Authorization header.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <code className="text-sm text-gray-700">
                      Authorization: Bearer YOUR_API_KEY
                    </code>
                  </div>
                </div>
              )}

              {/* Parameters */}
              {selectedEndpointData.filters.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Parameters</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 text-gray-700">Parameter</th>
                          <th className="text-left py-2 text-gray-700">Type</th>
                          <th className="text-left py-2 text-gray-700">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEndpointData.filters.map((filter: any, index: number) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-2 font-mono text-blue-600">{filter.field}</td>
                            <td className="py-2 text-gray-600">string</td>
                            <td className="py-2 text-gray-600">Filter by {filter.field} ({filter.operator})</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Code Examples */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Code Examples</h3>
                <div className="space-y-4">
                  {['javascript', 'python', 'curl'].map(language => (
                    <div key={language}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-700 capitalize">{language}</h4>
                        <button
                          onClick={() => copyToClipboard(generateCodeExample(language))}
                          className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          <span>{copied ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-sm">{generateCodeExample(language)}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Response Examples */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Response Examples</h3>
                
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">Success Response (200)</h4>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm">{JSON.stringify({
                      status: 'success',
                      data: selectedEndpointData.method === 'GET' ? [
                        { id: 1, name: 'Example Record' }
                      ] : { id: 1, message: 'Operation successful' }
                    }, null, 2)}</pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Error Response (400)</h4>
                  <div className="bg-gray-900 text-red-400 p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm">{JSON.stringify({
                      status: 'error',
                      message: 'Invalid request parameters',
                      code: 400
                    }, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Select an Endpoint</h3>
                <p className="text-gray-600">Choose an endpoint from the left to view its documentation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}