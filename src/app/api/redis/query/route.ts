import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { connectionString, operation, key, value, pattern, limit } = await request.json();

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Connection string is required' },
        { status: 400 }
      );
    }

    console.log('[Redis Query] Operation:', operation || 'get');

    // Create Redis client
    const client = createClient({
      url: connectionString,
      socket: {
        connectTimeout: 5000,
      },
    });

    await client.connect();

    let result: any;

    // Handle different operations
    switch (operation) {
      case 'get':
        // Get value by key
        if (!key) {
          await client.disconnect();
          return NextResponse.json({ error: 'Key is required for GET operation' }, { status: 400 });
        }
        const getValue = await client.get(key);
        result = { key, value: getValue, type: await client.type(key) };
        break;

      case 'set':
        // Set key-value
        if (!key || value === undefined) {
          await client.disconnect();
          return NextResponse.json({ error: 'Key and value are required for SET operation' }, { status: 400 });
        }
        await client.set(key, value);
        result = { success: true, key, value };
        break;

      case 'delete':
      case 'del':
        // Delete key
        if (!key) {
          await client.disconnect();
          return NextResponse.json({ error: 'Key is required for DELETE operation' }, { status: 400 });
        }
        const delCount = await client.del(key);
        result = { success: true, deleted: delCount };
        break;

      case 'keys':
      case 'scan':
        // Get all keys matching pattern
        const searchPattern = pattern || '*';
        const allKeys = await client.keys(searchPattern);
        const limitKeys = limit ? allKeys.slice(0, limit) : allKeys.slice(0, 100);
        
        // Get values for each key
        const keysData = [];
        for (const k of limitKeys) {
          const type = await client.type(k);
          const ttl = await client.ttl(k);
          let val;
          
          if (type === 'string') {
            val = await client.get(k);
          } else if (type === 'list') {
            val = await client.lRange(k, 0, -1);
          } else if (type === 'set') {
            val = await client.sMembers(k);
          } else if (type === 'hash') {
            val = await client.hGetAll(k);
          } else {
            val = `<${type}>`;
          }
          
          keysData.push({
            key: k,
            value: val,
            type,
            ttl: ttl === -1 ? null : ttl,
          });
        }
        
        result = keysData;
        break;

      case 'info':
        // Get Redis server info
        const info = await client.info();
        result = { info };
        break;

      default:
        // Default: list keys (same as 'keys')
        const defaultKeys = await client.keys(pattern || '*');
        const defaultLimit = defaultKeys.slice(0, limit || 100);
        
        const defaultData = [];
        for (const k of defaultLimit) {
          const type = await client.type(k);
          const ttl = await client.ttl(k);
          let val;
          
          if (type === 'string') {
            val = await client.get(k);
          } else {
            val = `<${type}>`;
          }
          
          defaultData.push({
            key: k,
            value: val,
            type,
            ttl: ttl === -1 ? null : ttl,
          });
        }
        
        result = defaultData;
    }

    await client.disconnect();

    console.log('[Redis Query] Operation successful');

    return NextResponse.json({
      success: true,
      data: result,
      count: Array.isArray(result) ? result.length : 1,
    });
  } catch (error: any) {
    console.error('[Redis Query] Error:', error.message);
    return NextResponse.json(
      {
        error: 'Failed to execute Redis operation',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
