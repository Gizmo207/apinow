import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface APIExamplesProps {
  endpoint: {
    path: string;
    method: string;
    description: string;
  };
  apiKey?: string;
  dbType?: string;
  connectionString?: string;
  tableName?: string;
}

export function APIExamples({ endpoint, apiKey, dbType, connectionString, tableName }: APIExamplesProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'curl' | 'fetch' | 'axios' | 'python'>('curl');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const fullUrl = `${baseUrl}${endpoint.path}`;

  // Generate examples based on method
  const examples = {
    curl: generateCurlExample(endpoint, fullUrl, apiKey, dbType, connectionString),
    fetch: generateFetchExample(endpoint, fullUrl, apiKey, dbType, connectionString),
    axios: generateAxiosExample(endpoint, fullUrl, apiKey, dbType, connectionString),
    python: generatePythonExample(endpoint, fullUrl, apiKey, dbType, connectionString),
  };

  const tabs = [
    { id: 'curl' as const, label: 'cURL' },
    { id: 'fetch' as const, label: 'JavaScript (fetch)' },
    { id: 'axios' as const, label: 'JavaScript (axios)' },
    { id: 'python' as const, label: 'Python' },
  ];

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">API Usage Examples</h3>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-3 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Code Example */}
      <div className="relative">
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
          <code>{examples[activeTab]}</code>
        </pre>
        <button
          onClick={() => copyToClipboard(examples[activeTab], activeTab)}
          className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          title="Copy to clipboard"
        >
          {copied === activeTab ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>

      {/* Quick Tips */}
      <div className="mt-3 text-xs text-gray-600 space-y-1">
        <p>💡 <strong>Tip:</strong> Replace YOUR_API_KEY with your actual API key from the dashboard</p>
        {dbType && (
          <p>💡 <strong>Database:</strong> This endpoint uses {dbType.toUpperCase()}</p>
        )}
      </div>
    </div>
  );
}

function generateCurlExample(
  endpoint: any,
  url: string,
  apiKey?: string,
  dbType?: string,
  connectionString?: string
): string {
  const method = endpoint.method.toUpperCase();
  const key = apiKey || 'YOUR_API_KEY';

  let example = `curl -X ${method} '${url}' \\\n`;
  example += `  -H 'Authorization: Bearer ${key}' \\\n`;
  example += `  -H 'Content-Type: application/json'`;

  if (method === 'POST' || method === 'PUT') {
    example += ` \\\n  -d '{
    "name": "John Doe",
    "email": "john@example.com"
  }'`;
  }

  return example;
}

function generateFetchExample(
  endpoint: any,
  url: string,
  apiKey?: string,
  dbType?: string,
  connectionString?: string
): string {
  const method = endpoint.method.toUpperCase();
  const key = apiKey || 'YOUR_API_KEY';

  let example = `const response = await fetch('${url}', {
  method: '${method}',
  headers: {
    'Authorization': 'Bearer ${key}',
    'Content-Type': 'application/json'
  }`;

  if (method === 'POST' || method === 'PUT') {
    example += `,
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com'
  })`;
  }

  example += `
});

const data = await response.json();
console.log(data);`;

  return example;
}

function generateAxiosExample(
  endpoint: any,
  url: string,
  apiKey?: string,
  dbType?: string,
  connectionString?: string
): string {
  const method = endpoint.method.toLowerCase();
  const key = apiKey || 'YOUR_API_KEY';

  let example = `import axios from 'axios';

const response = await axios.${method}('${url}'`;

  if (method === 'post' || method === 'put') {
    example += `, {
  name: 'John Doe',
  email: 'john@example.com'
}`;
  }

  example += `, {
  headers: {
    'Authorization': 'Bearer ${key}',
    'Content-Type': 'application/json'
  }
});

console.log(response.data);`;

  return example;
}

function generatePythonExample(
  endpoint: any,
  url: string,
  apiKey?: string,
  dbType?: string,
  connectionString?: string
): string {
  const method = endpoint.method.upper();
  const key = apiKey || 'YOUR_API_KEY';

  let example = `import requests

url = '${url}'
headers = {
    'Authorization': 'Bearer ${key}',
    'Content-Type': 'application/json'
}`;

  if (method === 'POST' || method === 'PUT') {
    example += `
data = {
    'name': 'John Doe',
    'email': 'john@example.com'
}

response = requests.${method.toLowerCase()}(url, headers=headers, json=data)`;
  } else {
    example += `

response = requests.${method.toLowerCase()}(url, headers=headers)`;
  }

  example += `
print(response.json())`;

  return example;
}
