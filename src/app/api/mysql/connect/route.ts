import { NextRequest, NextResponse } from 'next/server';
import * as mysql from 'mysql2/promise';
import { getConnectionConfig } from '@/lib/getConnectionConfig';
import { getCurrentUserId } from '@/lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Force recompile

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const connectionId = body?.connectionId as string | undefined;
    const connectionString = body?.connectionString as string | undefined;

    if (!connectionId && !connectionString) {
      return NextResponse.json(
        { error: 'Missing connectionId or connectionString' },
        { status: 400 }
      );
    }

    // Build connection config from Firestore when connectionId is provided
    let connectionConfig: any;
    if (connectionId) {
      const cfg = await getConnectionConfig(connectionId);
      if (!cfg) return NextResponse.json({ error: 'Invalid connectionId' }, { status: 404 });
      const requesterId = getCurrentUserId(request);
      if (cfg.ownerId && requesterId && cfg.ownerId !== requesterId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      connectionConfig = {
        host: cfg.host,
        port: cfg.port || 3306,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
      };
      
      // Debug logging (remove after fixing)
      console.log('=== MariaDB Connection Debug ===');
      console.log('Host:', cfg.host);
      console.log('Port:', cfg.port);
      console.log('User:', cfg.user);
      console.log('Password length:', cfg.password?.length || 0);
      console.log('Password (first 3 chars):', cfg.password?.substring(0, 3) || '(empty)');
      console.log('Database:', cfg.database);
      console.log('================================');
    } else {
      // Backward compatibility: accept raw connection string
      if (connectionString.includes('ssl-mode=REQUIRED')) {
        // Aiven format - parse and configure SSL properly
        const cleanUrl = connectionString.replace('?ssl-mode=REQUIRED', '');
        const urlMatch = cleanUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
        if (urlMatch) {
          connectionConfig = {
            host: urlMatch[3],
            port: parseInt(urlMatch[4]),
            user: urlMatch[1],
            password: urlMatch[2],
            database: urlMatch[5],
            ssl: { rejectUnauthorized: false },
          };
        } else {
          connectionConfig = cleanUrl;
        }
      } else {
        connectionConfig = connectionString;
      }
    }

    // Create connection
    let connection;
    try {
      connection = await mysql.createConnection(connectionConfig);
      // Test connection
      await connection.ping();
    } catch (authError: any) {
      // Handle MariaDB GSSAPI authentication plugin error
      if (authError.code === 'AUTH_SWITCH_PLUGIN_ERROR' && authError.message?.includes('auth_gssapi_client')) {
        return NextResponse.json({
          error: 'MariaDB Authentication Plugin Not Supported',
          message: 'Your MariaDB server is using the auth_gssapi_client authentication plugin, which is not supported by this application.',
          solution: 'Please run these commands in MariaDB to fix:',
          fixCommands: [
            "ALTER USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('your_password');",
            "FLUSH PRIVILEGES;"
          ],
          helpText: 'Replace your_password with your actual password, or use an empty string PASSWORD(\'\') if you have no password.',
          technicalDetails: authError.message
        }, { status: 400 });
      }
      
      // Handle wrong password / access denied
      if (authError.code === 'ER_ACCESS_DENIED_ERROR') {
        const usingPassword = authError.message?.includes('using password: YES');
        return NextResponse.json({
          error: 'Wrong Password or Access Denied',
          message: usingPassword 
            ? 'The password you entered is incorrect.'
            : 'Access denied. This user may require a password.',
          solution: 'Try one of these solutions:',
          fixCommands: usingPassword ? [
            "1. Delete this connection and create a new one with the correct password",
            "2. Or check your MariaDB password by connecting manually:",
            "   mysql.exe -u root -p",
            "3. Or reset your MariaDB password:",
            "   ALTER USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('newpassword');",
            "   FLUSH PRIVILEGES;"
          ] : [
            "1. Set a password for your MariaDB user:",
            "   ALTER USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('yourpassword');",
            "   FLUSH PRIVILEGES;",
            "2. Or allow no password:",
            "   ALTER USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('');",
            "   FLUSH PRIVILEGES;"
          ],
          helpText: 'Make sure the password in your connection matches what you use when connecting to MariaDB manually.',
          technicalDetails: authError.message
        }, { status: 401 });
      }
      
      throw authError;
    }

    try {

      // Get database name from connection config
      const database = typeof connectionConfig === 'object' ? connectionConfig.database : '';
      
      console.log('Database name:', database);
      
      // First, let's see ALL databases
      const [allDbs] = await connection.query('SHOW DATABASES');
      console.log('All databases:', allDbs);
      
      // Check what database we're currently using
      const [currentDb] = await connection.query('SELECT DATABASE() as db');
      console.log('Current database:', currentDb);

      // Get all tables from current database
      const [tables] = await connection.query('SHOW TABLES');
      
      console.log('Found tables:', tables);
      console.log('Tables count:', (tables as any[]).length);

      // SHOW TABLES returns format like: { 'Tables_in_defaultdb': 'users' }
      const tableNames = (tables as any[]).map((row: any) => {
        const key = Object.keys(row)[0];
        return row[key];
      });
      
      console.log('Table names:', tableNames);

      // Get schema for each table
      const schema: any = {};
      for (const tableName of tableNames) {
        const [columns] = await connection.query(
          'SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
          [database, tableName]
        );

        schema[tableName] = (columns as any[]).map((col: any) => ({
          name: col.COLUMN_NAME,
          type: col.DATA_TYPE,
          nullable: col.IS_NULLABLE === 'YES',
          primaryKey: col.COLUMN_KEY === 'PRI',
        }));
      }

      await connection.end();

      console.log('Returning response:', { tableCount: tableNames.length, tables: tableNames });

      return NextResponse.json({
        success: true,
        message: 'Connected successfully',
        tables: tableNames,
        schema,
      });
    } catch (error: any) {
      await connection.end();
      throw error;
    }
  } catch (error: any) {
    console.error('MySQL connection error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect to MySQL database' },
      { status: 500 }
    );
  }
}
