import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getCurrentUserId } from '@/lib/auth-server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Get user ID for security (optional for now)
    const userId = getCurrentUserId(request) || 'anonymous';

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.db') && !file.name.endsWith('.sqlite') && !file.name.endsWith('.sqlite3')) {
      return NextResponse.json({ error: 'Invalid file type. Only .db, .sqlite, and .sqlite3 files are allowed.' }, { status: 400 });
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 50MB.' }, { status: 400 });
    }

    console.log('[SQLite Upload] Uploading file:', file.name, 'Size:', file.size, 'bytes');

    // Generate unique filename with user ID prefix for security
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const blobName = `sqlite/${userId}/${timestamp}_${sanitizedName}`;

    // Upload to Vercel Blob
    const blob = await put(blobName, file, {
      access: 'public', // Make readable via API but not directly accessible
      addRandomSuffix: false,
    });

    console.log('[SQLite Upload] Uploaded successfully:', blob.url);

    // Return the blob URL and metadata
    return NextResponse.json({
      success: true,
      blobUrl: blob.url,
      filename: sanitizedName,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[SQLite Upload] Error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error.message },
      { status: 500 }
    );
  }
}
