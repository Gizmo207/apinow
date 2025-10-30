import { NextRequest, NextResponse } from 'next/server';

// Public API endpoint - placeholder for future implementation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ endpoint: string[] }> }
) {
  const { endpoint } = await params;
  return NextResponse.json(
    { error: 'Not implemented', endpoint },
    { status: 501 }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ endpoint: string[] }> }
) {
  const { endpoint } = await params;
  return NextResponse.json(
    { error: 'Not implemented', endpoint },
    { status: 501 }
  );
}
