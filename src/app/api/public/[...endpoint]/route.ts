import { NextRequest, NextResponse } from 'next/server';

// Public API endpoint - placeholder for future implementation
export async function GET(
  request: NextRequest,
  { params }: { params: { endpoint: string[] } }
) {
  return NextResponse.json(
    { error: 'Not implemented' },
    { status: 501 }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { endpoint: string[] } }
) {
  return NextResponse.json(
    { error: 'Not implemented' },
    { status: 501 }
  );
}
