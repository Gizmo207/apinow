import { useState } from 'react';
import { HelpCircle, Zap, CheckCircle, XCircle } from 'lucide-react';
import { getProvider } from '@/config/providers';

interface DynamicProviderFormProps {
  providerKey: string;
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void;
  onCancel: () => void;
}

export function DynamicProviderForm({
  providerKey,
  initialValues = {},
  onSubmit,
  onCancel
}: DynamicProviderFormProps) {
  const provider = getProvider(providerKey);
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  if (!provider) {
    return <div className="text-red-600">Provider configuration not found</div>;
  }

  const validateAll = () => {
    const newErrors: Record<string, string> = {};
    
    for (const field of provider.fields) {
      const value = values[field.name];
      
      // Required validation
      if (field.required && !value) {
        newErrors[field.name] = `${field.label} is required`;
        continue;
      }
      
      // Pattern validation
      if (value && field.pattern && !field.pattern.test(value)) {
        newErrors[field.name] = `Invalid ${field.label} format`;
        continue;
      }
      
      // Custom validation
      if (value && field.validate) {
        const result = field.validate(value);
        if (result !== true) {
          newErrors[field.name] = result;
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAll()) {
      return;
    }
    
    // Apply normalize function if provider has one
    const normalized = provider.normalize ? provider.normalize(values) : {};
    onSubmit({ ...values, ...normalized });
  };

  const updateValue = (fieldName: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
    // Clear test result when values change
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Apply normalize function if provider has one
      const normalized = provider.normalize ? provider.normalize(values) : {};
      const testData = { ...values, ...normalized };

      const response = await fetch('/api/database/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: provider.engine,
          connectionString: testData.connectionString,
          providerKey: provider.key,
        }),
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error: any) {
      setTestResult({
        status: 'error',
        error: error.message,
        errorType: 'network_error',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Render each field */}
      {provider.fields.map(field => (
        <div key={field.name}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-600 ml-1">*</span>}
          </label>
          
          {field.type === 'select' ? (
            <select
              value={values[field.name] || ''}
              onChange={e => updateValue(field.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={field.required}
            >
              <option value="">Select...</option>
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea
              value={values[field.name] || ''}
              onChange={e => updateValue(field.name, e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              rows={3}
              required={field.required}
            />
          ) : field.type === 'file' ? (
            <>
              <input
                type="file"
                accept={field.accept}
                onChange={e => updateValue(field.name, e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required={field.required}
              />
              {values[field.name] && (
                <p className="mt-2 text-sm text-green-600">✓ {values[field.name].name}</p>
              )}
            </>
          ) : field.type === 'checkbox' ? (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={values[field.name] || false}
                onChange={e => updateValue(field.name, e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{field.helpText || 'Enable'}</span>
            </label>
          ) : field.type === 'password' ? (
            <input
              type="password"
              value={values[field.name] || ''}
              onChange={e => updateValue(field.name, e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              required={field.required}
            />
          ) : (
            <input
              type={field.type === 'number' ? 'number' : 'text'}
              value={values[field.name] || ''}
              onChange={e => updateValue(field.name, e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              required={field.required}
            />
          )}
          
          {field.helpText && (
            <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
          )}
          
          {errors[field.name] && (
            <p className="mt-1 text-xs text-red-600">{errors[field.name]}</p>
          )}
        </div>
      ))}

      {/* Provider help section */}
      {(provider.helpSteps || provider.connectionStringFormat) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">
                How to connect {provider.name}
              </h4>
              {provider.helpSteps && (
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 mb-3">
                  {provider.helpSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              )}
              {provider.connectionStringFormat && (
                <div className="text-sm">
                  <span className="text-blue-700 font-medium">Expected format:</span>
                  <code className="block mt-1 bg-blue-100 text-blue-900 p-2 rounded text-xs break-all">
                    {provider.connectionStringFormat}
                  </code>
                </div>
              )}
              {provider.docsUrl && (
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  View official documentation →
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Test Connection Result */}
      {testResult && (
        <div className={`rounded-lg border p-4 ${
          testResult.status === 'ok' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-2">
            {testResult.status === 'ok' ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h4 className={`font-semibold ${
                testResult.status === 'ok' ? 'text-green-900' : 'text-red-900'
              }`}>
                {testResult.status === 'ok' ? '✓ Connection Successful' : '✗ Connection Failed'}
              </h4>
              <p className={`text-sm mt-1 ${
                testResult.status === 'ok' ? 'text-green-700' : 'text-red-700'
              }`}>
                {testResult.message || testResult.error}
              </p>
              {testResult.latency && (
                <p className="text-xs text-gray-600 mt-1">Latency: {testResult.latency}</p>
              )}
              {testResult.suggestions && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-red-800">Suggestions:</p>
                  <ul className="text-sm text-red-700 mt-1 space-y-1">
                    {testResult.suggestions.map((suggestion: string, i: number) => (
                      <li key={i}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testing}
          className="px-4 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect Database
          </button>
        </div>
      </div>
    </form>
  );
}
