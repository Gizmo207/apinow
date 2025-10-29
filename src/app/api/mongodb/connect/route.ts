import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

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

    console.log('[MongoDB Connect] Attempting connection...');

    // Create MongoDB client
    const client = new MongoClient(connectionString, {
      serverSelectionTimeoutMS: 5000,
    });

    // Connect to MongoDB
    await client.connect();

    // Get database name from connection string or use default
    const db = client.db();
    const dbName = db.databaseName;

    console.log('[MongoDB Connect] Connected to database:', dbName);

    // List all collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log('[MongoDB Connect] Found collections:', collectionNames);

    // Get schema for each collection (sample documents)
    const schema: Record<string, any[]> = {};

    for (const collectionName of collectionNames) {
      const collection = db.collection(collectionName);
      
      // Get a sample document to infer schema
      const sampleDoc = await collection.findOne({});
      
      if (sampleDoc) {
        // Extract field names and types from sample document
        const fields = Object.keys(sampleDoc).map(key => ({
          name: key,
          type: typeof sampleDoc[key] === 'object' && sampleDoc[key] !== null
            ? (Array.isArray(sampleDoc[key]) ? 'array' : 'object')
            : typeof sampleDoc[key],
          nullable: true, // MongoDB fields are always optional
        }));
        
        schema[collectionName] = fields;
      } else {
        schema[collectionName] = [];
      }
    }

    // Close connection
    await client.close();

    console.log('[MongoDB Connect] Connection closed successfully');

    return NextResponse.json({
      success: true,
      database: dbName,
      tables: collectionNames, // Using "tables" for consistency with SQL
      schema,
    });
  } catch (error: any) {
    console.error('[MongoDB Connect] Error:', error.message);
    return NextResponse.json(
      {
        error: 'Failed to connect to MongoDB',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
