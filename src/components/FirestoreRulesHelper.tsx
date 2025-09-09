import { useState } from 'react';
import { FIREBASE_KNOWN_COLLECTIONS } from '../utils/database';

interface FirestoreRulesHelperProps {
  collections?: string[];
}

/*
 * Provides a simple UI to generate Firestore rule snippets for read-only or owner based access.
 * This is a lightweight internal helper; can be integrated into onboarding later.
 */
export function FirestoreRulesHelper({ collections }: FirestoreRulesHelperProps) {
  const [mode, setMode] = useState<'readonly' | 'owner' | 'open-dev'>('readonly');
  const [customCollections, setCustomCollections] = useState<string>('');

  const list = (collections && collections.length ? collections : FIREBASE_KNOWN_COLLECTIONS)
    .concat(customCollections.split(',').map(c => c.trim()).filter(Boolean))
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const ruleBody = (() => {
    if (mode === 'open-dev') {
      return `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{db}/documents {\n    match /{document=**} {\n      allow read: if request.auth != null;\n      allow write: if request.auth != null && request.time < timestamp.date(2025, 12, 31);\n    }\n  }\n}`;
    }
    if (mode === 'readonly') {
      return `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{db}/documents {\n${list.map(c => `    match /${c}/{doc} {\n      allow read: if request.auth != null;\n    }`).join('\n')}\n  }\n}`;
    }
    // owner mode
    return `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{db}/documents {\n    function authed() { return request.auth != null; }\n    function own() { return authed() && request.auth.uid == resource.data.userId; }\n    function createOwn() { return authed() && request.auth.uid == request.resource.data.userId; }\n${list.map(c => `    match /${c}/{doc} {\n      allow create: if createOwn();\n      allow read, update, delete: if own();\n    }`).join('\n')}\n  }\n}`;
  })();

  return (
    <div className="space-y-4 bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">Firestore Rules Generator</h3>
        <select
          className="text-sm border-gray-300 rounded"
          value={mode}
          onChange={e => setMode(e.target.value as any)}
          title="Rule Mode"
        >
          <option value="readonly">Read Only (authed)</option>
          <option value="owner">Owner-Based</option>
            <option value="open-dev">Temporary Dev</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-xs text-gray-600">Extra Collections (comma separated)</label>
        <input
          className="w-full text-sm px-2 py-1 border rounded border-gray-300"
          placeholder="extraCollection,anotherOne"
          value={customCollections}
          onChange={e => setCustomCollections(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-gray-600 flex items-center justify-between">
          <span>Generated Rules</span>
          <button
            onClick={() => navigator.clipboard.writeText(ruleBody)}
            className="text-blue-600 hover:text-blue-700 text-xs"
            type="button"
          >Copy</button>
        </label>
        <textarea
          className="w-full h-56 text-xs font-mono p-2 border border-gray-300 rounded resize-none"
          value={ruleBody}
          readOnly
          aria-label="Generated Firestore rules"
        />
        <p className="text-[11px] text-gray-500">Paste into Firestore Rules in the Firebase console. Adjust expiry date for dev mode.</p>
      </div>
    </div>
  );
}
