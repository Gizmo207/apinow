import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST(request: NextRequest) {
  try {
    const { connectionString, query, params } = await request.json();

    if (!connectionString || !query) {
      return NextResponse.json(
        { error: 'Connection string and query are required' },
        { status: 400 }
      );
    }

    // Parse connection string and configure SSL
    let connectionConfig: any;
    
    if (connectionString.includes('sslmode=require') || connectionString.includes('ssl=true')) {
      connectionConfig = {
        connectionString: connectionString,
        ssl: {
          rejectUnauthorized: false
        }
      };
    } else {
      connectionConfig = {
        connectionString: connectionString
      };
    }

    const client = new Client(connectionConfig);

    try {
      await client.connect();

      // Execute query with parameters
      const result = await client.query(query, params || []);

      await client.end();

      return NextResponse.json({
        success: true,
        data: result.rows,
      });
    } catch (error: any) {
      await client.end();
      throw error;
    }
  } catch (error: any) {
    console.error('PostgreSQL query error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute query' },
      { status: 500 }
    );
  }
}
