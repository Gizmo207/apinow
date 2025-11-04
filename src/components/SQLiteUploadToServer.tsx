'use client';

import { useState } from 'react';
import { Upload, Check, AlertCircle, Cloud } from 'lucide-react';

interface SQLiteUploadToServerProps {
  onUploadComplete: (blobUrl: string, filename: string) => void;
}

export function SQLiteUploadToServer({ onUploadComplete }: SQLiteUploadToServerProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/sqlite/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setSuccess(true);
      onUploadComplete(data.blobUrl, data.filename);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-start gap-3">
        <Cloud className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-blue-900 mb-1">
            Upload to Server (Production Mode)
          </h4>
          <p className="text-sm text-blue-700 mb-3">
            Upload your .db file to server storage for production-ready APIs that work everywhere.
          </p>
          
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors">
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Uploading...</span>
              </>
            ) : success ? (
              <>
                <Check className="w-4 h-4" />
                <span>Uploaded!</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Choose File to Upload</span>
              </>
            )}
            <input
              type="file"
              accept=".db,.sqlite,.sqlite3"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
              <Check className="w-4 h-4" />
              <span>File uploaded successfully! Your database is now stored on the server.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
