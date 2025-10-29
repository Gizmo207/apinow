import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check if we're in development (use local filesystem) or production (use Vercel Blob)
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      // Development: Save to local filesystem
      const { writeFile, mkdir } = await import('fs/promises');
      const { join } = await import('path');
      const { existsSync } = await import('fs');
      
      const uploadsDir = join(process.cwd(), 'uploads');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      const filename = `${Date.now()}-${file.name}`;
      const filepath = join(uploadsDir, filename);
      
      const bytes = await file.arrayBuffer();
      await writeFile(filepath, Buffer.from(bytes));

      return NextResponse.json({ filePath: filepath, filename });
    } else {
      // Production: Use Vercel Blob
      const filename = `${Date.now()}-${file.name}`;
      const blob = await put(filename, file, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      return NextResponse.json({ 
        filePath: blob.url, 
        filename,
        blobUrl: blob.url 
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
