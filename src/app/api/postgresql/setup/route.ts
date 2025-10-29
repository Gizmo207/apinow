import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST(request: NextRequest) {
  try {
    const { connectionString } = await request.json();

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Connection string is required' },
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

      // Drop table if exists (for clean setup)
      await client.query('DROP TABLE IF EXISTS users');

      // Create users table
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert test data
      await client.query(`
        INSERT INTO users (name, email) VALUES 
          ('John Doe', 'john@example.com'),
          ('Jane Smith', 'jane@example.com'),
          ('Bob Johnson', 'bob@example.com')
      `);

      // Get the data to confirm
      const result = await client.query('SELECT * FROM users');

      await client.end();

      return NextResponse.json({
        success: true,
        message: 'Table created and data inserted successfully!',
        users: result.rows,
      });
    } catch (error: any) {
      await client.end();
      throw error;
    }
  } catch (error: any) {
    console.error('PostgreSQL setup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to setup database' },
      { status: 500 }
    );
  }
}
