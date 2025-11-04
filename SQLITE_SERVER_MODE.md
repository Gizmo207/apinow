# Server-Side SQLite Support

## Overview
SQLite databases can now be uploaded to server storage, enabling **production-ready APIs** that work on deployed environments (not just localhost).

## Two Modes

### 🖥️ **Browser Mode (Existing)**
- ✅ Fast local development
- ✅ No upload needed
- ❌ **Does NOT work in production** (browser storage not accessible by server)
- ❌ APIs only work on `localhost`

### ☁️ **Server Mode (NEW)**
- ✅ **Works in production!**
- ✅ Real REST APIs accessible from anywhere
- ✅ Persistent storage via Vercel Blob
- ✅ Secure (user-scoped uploads)
- ⚠️ Requires file upload (max 50MB)

## How It Works

### 1. **Upload Endpoint** (`/api/sqlite/upload`)
- Accepts `.db`, `.sqlite`, or `.sqlite3` files
- Validates file type and size (max 50MB)
- Stores in Vercel Blob at `sqlite/{userId}/{timestamp}_{filename}`
- Returns `blobUrl` for querying

### 2. **Query Endpoints** (Updated)
Both `/api/sqlite/query` and `/api/sqlite/introspect` now support **three modes**:

```typescript
// Server mode (NEW)
{
  "blobUrl": "https://blob.vercel-storage.com/...",
  "query": "SELECT * FROM users LIMIT 10"
}

// Browser mode (existing)
{
  "fileData": "base64-encoded-db-file",
  "query": "SELECT * FROM users"
}

// Localhost mode (legacy)
{
  "filePath": "path/to/local.db",
  "query": "SELECT * FROM users"
}
```

## Security Features

- ✅ User authentication required for upload
- ✅ Files scoped to user ID
- ✅ File type validation (`.db`, `.sqlite`, `.sqlite3` only)
- ✅ Size limit (50MB max)
- ✅ Temporary file cleanup after queries
- ✅ Read-only database access

## Usage

### Upload a Database
```typescript
const formData = new FormData();
formData.append('file', dbFile);

const response = await fetch('/api/sqlite/upload', {
  method: 'POST',
  body: formData,
});

const { blobUrl } = await response.json();
```

### Query Server Database
```typescript
const response = await fetch('/api/sqlite/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    blobUrl: 'https://blob.vercel-storage.com/...',
    query: 'SELECT * FROM users',
  }),
});

const { data } = await response.json();
```

## Environment Variables Required

Add to `.env.local` and Vercel project settings:

```bash
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

Get this from: Vercel Dashboard → Storage → Create Blob Store

## What's NOT Changed

✅ Existing browser-based SQLite still works
✅ All other database engines unchanged
✅ Schema explorer works for both modes
✅ API builder works for both modes
✅ No breaking changes to existing functionality

## Benefits

1. **Production-Ready**: Upload once, query forever
2. **Shareable**: Anyone can access the generated API
3. **Persistent**: Files stored reliably in Vercel Blob
4. **Secure**: User-scoped access control
5. **Simple UX**: Drag, drop, done!

## Next Steps

- [ ] Add UI toggle for browser vs server mode
- [ ] Show badge indicating which mode is active
- [ ] Support for write operations (INSERT/UPDATE/DELETE)
- [ ] Blob management UI (list/delete uploaded files)
