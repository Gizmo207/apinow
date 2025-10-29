import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface DeveloperTabProps {
  user: any;
}

export function DeveloperTab({ user }: DeveloperTabProps) {
  const [token, setToken] = useState('');
  const [tokenCopied, setTokenCopied] = useState(false);
  const [gettingToken, setGettingToken] = useState(false);

  const getMyToken = async () => {
    setGettingToken(true);
    try {
      if (user) {
        const idToken = await user.getIdToken();
        setToken(idToken);
        navigator.clipboard.writeText(idToken);
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 3000);
      }
    } catch (error) {
      console.error('Failed to get token:', error);
    } finally {
      setGettingToken(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Developer Tools</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="font-medium text-gray-900 mb-3">🔑 Get ID Token</h3>
          <p className="text-sm text-gray-600 mb-4">
            Get your Firebase ID token for testing API endpoints manually or in external tools.
          </p>
          <button
            onClick={getMyToken}
            disabled={gettingToken}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {tokenCopied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>{gettingToken ? 'Getting Token...' : 'Copy ID Token'}</span>
              </>
            )}
          </button>
        </div>

        {token && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your ID Token (Click to copy)
            </label>
            <textarea
              value={token}
              readOnly
              onClick={() => {
                navigator.clipboard.writeText(token);
                setTokenCopied(true);
                setTimeout(() => setTokenCopied(false), 3000);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs bg-gray-50 cursor-pointer hover:bg-gray-100"
              rows={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              This token expires after 1 hour. Click the text area to copy.
            </p>
          </div>
        )}

        <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
          <h4 className="font-medium text-yellow-900 mb-2">⚠️ Security Warning</h4>
          <p className="text-sm text-yellow-800">
            Never share your ID token publicly or commit it to version control. 
            This token provides full access to your account.
          </p>
        </div>
      </div>
    </div>
  );
}
