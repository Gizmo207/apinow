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
      // Support either {db} or {database} placeholder names
      const docBlockRegex = /(match\s+\/databases\/\{(?:db|database)\}\/documents\s*\{)([\s\S]*?)(\n\s*\})([\s\S]*?\n\s*\})?/m;
      const genDocBlockMatch = generated.match(docBlockRegex);
      const genDocContent = genDocBlockMatch ? genDocBlockMatch[2] : '';
      if (!genDocContent) return generated;

      const existingMatch = existing.match(docBlockRegex);
      if (!existingMatch) {
        // Instead of appending full generated (which would duplicate rules_version) try appending only document block contents
        const generatedOnlyDocuments = genDocBlockMatch ? genDocBlockMatch[1] + genDocBlockMatch[2] + genDocBlockMatch[3] : generated;
        const appended = existing.trimEnd() + `\n\n// --- APIFLOW GENERATED RULES BLOCK START ---\n` + generatedOnlyDocuments + `\n// --- APIFLOW GENERATED RULES BLOCK END ---`;
        return dedupeRulesVersion(appended);
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
      return dedupeRulesVersion(rebuilt);
    } catch {
      return generated;
    }
  }

  const mergedRules = mergeRules(existingRules, ruleBody);

  // Validation + reconstruction fallback to prevent malformed multiple service blocks.
  function needsReconstruct(content: string): boolean {
    const serviceCount = (content.match(/service\s+cloud\.firestore/g) || []).length;
    if (serviceCount > 1) return true;
    if (/--- APIFLOW GENERATED RULES BLOCK START ---/.test(content)) return true;
    if (/^\s*\d+\s*$/m.test(content)) return true; // stray numeric lines
    if (/APIFLOW injected rules START/.test(content) && /service\s+cloud\.firestore[\s\S]+service\s+cloud\.firestore/.test(content)) return true;
    return false;
  }

  function reconstructRules(existing: string, placeholder: string): string {
    // Determine placeholder style
    const ph = /\/databases\/\{database\}\//.test(existing) ? '{database}' : placeholder;
    const ownerCollections = ['classes','recordings','studyPlans','notes'];
    const openWriteCollections = ['transcripts','lectures'];
    const readOnlyCollections = ['mail','licenses','payments','users'];
    const publicCollections = ['public'];

    return [
      "rules_version = '2';",
      'service cloud.firestore {',
      `  match /databases/${ph}/documents {`,
      '    function authed() { return request.auth != null; }',
      '    function isOwner() { return authed() && request.auth.uid == resource.data.userId; }',
      '    function creatingOwn() { return authed() && request.resource.data.userId != null && request.auth.uid == request.resource.data.userId; }',
      '',
      ...ownerCollections.map(c => `    match /${c}/{doc} {\n      allow create: if creatingOwn();\n      allow read, update, delete: if isOwner();\n    }`),
      '',
      ...openWriteCollections.map(c => `    match /${c}/{doc} {\n      allow read: if authed();\n      allow create, update, delete: if true;\n    }`),
      '',
      ...readOnlyCollections.map(c => `    match /${c}/{doc} { allow read: if authed(); }`),
      '',
      ...publicCollections.map(c => `    match /${c}/{doc} { allow read: if true; }`),
      '',
      '    match /{document=**} {',
      '      allow read, write: if false;',
      '    }',
      '  }',
      '}'
    ].join('\n');
  }

  const finalRules = needsReconstruct(mergedRules) ? reconstructRules(existingRules, '{db}') : mergedRules;

  function dedupeRulesVersion(source: string): string {
    const lines = source.split('\n');
    let seen = false;
    const out: string[] = [];
    for (const line of lines) {
      if (line.trim().startsWith('rules_version')) {
        if (seen) continue; // skip duplicates
        seen = true;
      }
      out.push(line);
    }
    return out.join('\n');
  }

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
          <span>{needsReconstruct(mergedRules) ? 'Reconstructed Output (final)' : 'Merged Output (final)'}</span>
          <button onClick={() => navigator.clipboard.writeText(finalRules)} className="text-blue-600 hover:text-blue-700 text-xs" type="button">Copy</button>
        </label>
        <textarea
          className="w-full h-56 text-xs font-mono p-2 border border-gray-300 rounded resize-none"
          value={finalRules}
          readOnly
          aria-label="Final Firestore rules"
        />
        <p className="text-[11px] text-gray-500">{needsReconstruct(mergedRules) ? 'Auto-reconstructed to avoid duplicate service blocks.' : 'Merged non-destructively.'} Review before publishing.</p>
      </div>
    </div>
  );
}
