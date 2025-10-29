import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(request: NextRequest) {
  try {
    const { connectionString, query, params } = await request.json();

    if (!connectionString || !query) {
      return NextResponse.json(
        { error: 'Connection string and query are required' },
        { status: 400 }
      );
    }

    // Parse connection string and handle SSL
    let connectionConfig: any;
    
    if (connectionString.includes('ssl-mode=REQUIRED')) {
      // Aiven format - parse and configure SSL properly
      const cleanUrl = connectionString.replace('?ssl-mode=REQUIRED', '');
      
      // Parse the connection string manually
      const urlMatch = cleanUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
      
      if (urlMatch) {
        connectionConfig = {
          host: urlMatch[3],
          port: parseInt(urlMatch[4]),
          user: urlMatch[1],
          password: urlMatch[2],
          database: urlMatch[5],
          ssl: {
            rejectUnauthorized: false // Aiven uses self-signed certs
          }
        };
      } else {
        connectionConfig = cleanUrl;
      }
    } else {
      connectionConfig = connectionString;
    }

    // Create connection
    const connection = await mysql.createConnection(connectionConfig);

    try {
      // Execute query with parameters
      const [results] = await connection.execute(query, params || []);

      await connection.end();

      return NextResponse.json({
        success: true,
        data: results,
      });
    } catch (error: any) {
      await connection.end();
      throw error;
    }
  } catch (error: any) {
    console.error('MySQL query error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute query' },
      { status: 500 }
    );
  }
}
