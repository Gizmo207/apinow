import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(request: NextRequest) {
  try {
    const { connectionString } = await request.json();

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Connection string is required' },
        { status: 400 }
      );
    }

    // Parse connection string and handle SSL
    let connectionConfig: any;
    
    if (connectionString.includes('ssl-mode=REQUIRED')) {
      const cleanUrl = connectionString.replace('?ssl-mode=REQUIRED', '');
      const urlMatch = cleanUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
      
      if (urlMatch) {
        connectionConfig = {
          host: urlMatch[3],
          port: parseInt(urlMatch[4]),
          user: urlMatch[1],
          password: urlMatch[2],
          database: urlMatch[5],
          ssl: {
            rejectUnauthorized: false
          }
        };
      } else {
        connectionConfig = cleanUrl;
      }
    } else {
      connectionConfig = connectionString;
    }

    const connection = await mysql.createConnection(connectionConfig);

    try {
      // Drop table if exists (for clean setup)
      await connection.query('DROP TABLE IF EXISTS users');

      // Create users table
      await connection.query(`
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert test data
      await connection.query(`
        INSERT INTO users (name, email) VALUES 
          ('John Doe', 'john@example.com'),
          ('Jane Smith', 'jane@example.com'),
          ('Bob Johnson', 'bob@example.com')
      `);

      // Get the data to confirm
      const [users] = await connection.query('SELECT * FROM users');

      await connection.end();

      return NextResponse.json({
        success: true,
        message: 'Table created and data inserted successfully!',
        users: users,
      });
    } catch (error: any) {
      await connection.end();
      throw error;
    }
  } catch (error: any) {
    console.error('MySQL setup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to setup database' },
      { status: 500 }
    );
  }
}
