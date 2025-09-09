import { useState, useEffect } from 'react';
import { FIREBASE_KNOWN_COLLECTIONS, DatabaseManager } from '../utils/database';

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
  const [existingRules, setExistingRules] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('apiflow_fire_custom_cols');
    if (saved) setCustomCollections(saved);
  const savedExisting = localStorage.getItem('apiflow_fire_existing_rules');
  if (savedExisting) setExistingRules(savedExisting);
  }, []);

  useEffect(() => {
    localStorage.setItem('apiflow_fire_custom_cols', customCollections);
    const arr = customCollections.split(',').map(c => c.trim()).filter(Boolean);
    DatabaseManager.getInstance().setAdditionalFirestoreCollections(arr);
  }, [customCollections]);

  useEffect(() => {
    localStorage.setItem('apiflow_fire_existing_rules', existingRules);
  }, [existingRules]);

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

  function mergeRules(existing: string, generated: string): string {
    if (!existing.trim()) return generated;
    try {
      const docBlockRegex = /(match\s+\/databases\/\{db\}\/documents\s*\{)([\s\S]*?)(\n\s*\})([\s\S]*?\n\s*\})?/m;
      const genDocBlockMatch = generated.match(docBlockRegex);
      const genDocContent = genDocBlockMatch ? genDocBlockMatch[2] : '';
      if (!genDocContent) return generated;

      const existingMatch = existing.match(docBlockRegex);
      if (!existingMatch) {
        return existing.trimEnd() + `\n\n// --- APIFLOW GENERATED RULES BLOCK START ---\n` + generated + `\n// --- APIFLOW GENERATED RULES BLOCK END ---`;
      }
      const existingDocContent = existingMatch[2];
      const wantedLines = genDocContent
        .split('\n')
        .map(l => l.replace(/\s+$/,''))
        .filter(l => /^(\s*function\s+\w+\(|\s*match\s+\/)/.test(l));
      const existingLower = existingDocContent.toLowerCase();
      const newInsertLines: string[] = [];
      for (const line of wantedLines) {
        const normalized = line.trim().toLowerCase();
        if (!existingLower.includes(normalized)) newInsertLines.push(line);
      }
      if (!newInsertLines.length) return existing;
      const insertionCommentStart = '    // ---- APIFLOW injected rules START ----';
      const insertionCommentEnd = '    // ---- APIFLOW injected rules END ----';
      const injectionBlock = [insertionCommentStart, ...newInsertLines, insertionCommentEnd].join('\n');
      const rebuilt = existing.replace(docBlockRegex, (_m, start, content, close, rest) => {
        const trimmedContent = content.endsWith('\n') ? content : content + '\n';
        return start + trimmedContent + injectionBlock + '\n' + close + (rest || '');
      });
      return rebuilt;
    } catch {
      return generated;
    }
  }

  const mergedRules = mergeRules(existingRules, ruleBody);

  return (
    <div className="space-y-4 bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm flex items-center space-x-2">
          <span>Firestore Rules Generator</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded" title="Generate copy/paste security rules">beta</span>
        </h3>
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
        <label className="text-xs text-gray-600 flex items-center justify-between">
          <span>Extra Collections (comma separated)</span>
          <span className="text-[10px] text-gray-400" title="These will be probed during introspection">used in scan</span>
        </label>
        <input
          className="w-full text-sm px-2 py-1 border rounded border-gray-300"
          placeholder="extraCollection,anotherOne"
          value={customCollections}
          onChange={e => setCustomCollections(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-gray-600 flex items-center justify-between">
          <span>Your Current Rules (paste here - optional)</span>
          <button type="button" className="text-[10px] text-blue-600 hover:text-blue-700" onClick={() => setExistingRules('')}>Clear</button>
        </label>
        <textarea
          className="w-full h-40 text-xs font-mono p-2 border border-gray-300 rounded"
          placeholder="Paste your existing rules_version ... here"
          value={existingRules}
          onChange={e => setExistingRules(e.target.value)}
          aria-label="Existing Firestore rules"
        />
        <p className="text-[10px] text-gray-500">We'll attempt a non-destructive merge: only new match blocks & helpers added.</p>
      </div>
      <div className="space-y-2">
        <label className="text-xs text-gray-600 flex items-center justify-between">
          <span>Mode Snippet</span>
          <button onClick={() => navigator.clipboard.writeText(ruleBody)} className="text-blue-600 hover:text-blue-700 text-xs" type="button">Copy</button>
        </label>
        <textarea
          className="w-full h-40 text-xs font-mono p-2 border border-gray-300 rounded resize-none"
          value={ruleBody}
          readOnly
          aria-label="Generated mode rules snippet"
        />
        <label className="text-xs text-gray-600 flex items-center justify-between mt-3">
          <span>Merged Output (final)</span>
          <button onClick={() => navigator.clipboard.writeText(mergedRules)} className="text-blue-600 hover:text-blue-700 text-xs" type="button">Copy</button>
        </label>
        <textarea
          className="w-full h-56 text-xs font-mono p-2 border border-gray-300 rounded resize-none"
          value={mergedRules}
          readOnly
          aria-label="Merged Firestore rules"
        />
        <p className="text-[11px] text-gray-500">Paste the merged output into the Firebase console. If merge fails, we fallback to full replacement snippet. Adjust expiry date for dev mode.</p>
      </div>
    </div>
  );
}
