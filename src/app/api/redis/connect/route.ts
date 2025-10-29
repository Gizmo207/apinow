import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { connectionString } = await request.json();

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Connection string is required' },
        { status: 400 }
      );
    }

    console.log('[Redis Connect] Attempting connection...');

    // Create Redis client
    const client = createClient({
      url: connectionString,
      socket: {
        connectTimeout: 5000,
      },
    });

    client.on('error', (err) => console.error('Redis Client Error', err));

    await client.connect();

    console.log('[Redis Connect] Connected successfully');

    // Get Redis info
    const info = await client.info('server');
    const dbSize = await client.dbSize();
    
    // Get sample keys (up to 100)
    const keys = await client.keys('*');
    const sampleKeys = keys.slice(0, 100);

    // Get key types
    const keyTypes: Record<string, any> = {};
    for (const key of sampleKeys.slice(0, 20)) { // Only check first 20 for performance
      const type = await client.type(key);
      const ttl = await client.ttl(key);
      keyTypes[key] = { type, ttl: ttl === -1 ? 'no expiry' : `${ttl}s` };
    }

    await client.disconnect();

    console.log('[Redis Connect] Connection closed, found', dbSize, 'keys');

    // For Redis, we return keys as "tables" for consistency with other databases
    return NextResponse.json({
      success: true,
      database: '0', // Redis default database
      dbSize,
      totalKeys: keys.length,
      sampleKeys,
      keyTypes,
      // Return empty tables array since Redis doesn't have tables
      // But we can use this to show key patterns
      tables: ['keys'], // Single "collection" representing all keys
      schema: {
        keys: [
          { name: 'key', type: 'string', nullable: false },
          { name: 'value', type: 'any', nullable: false },
          { name: 'type', type: 'string', nullable: false },
          { name: 'ttl', type: 'number', nullable: true },
        ],
      },
    });
  } catch (error: any) {
    console.error('[Redis Connect] Error:', error.message);
    return NextResponse.json(
      {
        error: 'Failed to connect to Redis',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
