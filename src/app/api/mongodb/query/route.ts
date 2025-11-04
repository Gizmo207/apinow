import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { connectionString, connectionId, collection, operation, query, document, limit } = await request.json();

    let finalConnectionString = connectionString;

    // If connectionId provided, fetch connection string securely
    if (connectionId) {
      const { getConnectionConfig } = await import('@/lib/getConnectionConfig');
      const cfg = await getConnectionConfig(connectionId);
      if (!cfg || !cfg.connectionString) {
        return NextResponse.json(
          { error: 'Invalid connectionId or connection not found' },
          { status: 404 }
        );
      }
      finalConnectionString = cfg.connectionString;
    }

    if (!finalConnectionString) {
      return NextResponse.json(
        { error: 'Connection string or connectionId is required' },
        { status: 400 }
      );
    }

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      );
    }

    console.log('[MongoDB Query] Operation:', operation || 'find', 'Collection:', collection);

    // Create MongoDB client
    const client = new MongoClient(finalConnectionString, {
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();

    const db = client.db();
    const coll = db.collection(collection);

    let result: any;

    // Handle different operations
    switch (operation) {
      case 'find':
        // Find documents (default operation)
        const findQuery = query ? JSON.parse(query) : {};
        const findLimit = limit || 100;
        result = await coll.find(findQuery).limit(findLimit).toArray();
        break;

      case 'findOne':
        // Find single document
        const findOneQuery = query ? JSON.parse(query) : {};
        result = await coll.findOne(findOneQuery);
        break;

      case 'insertOne':
        // Insert single document
        if (!document) {
          await client.close();
          return NextResponse.json({ error: 'Document is required for insert' }, { status: 400 });
        }
        const insertDoc = typeof document === 'string' ? JSON.parse(document) : document;
        const insertResult = await coll.insertOne(insertDoc);
        result = {
          acknowledged: insertResult.acknowledged,
          insertedId: insertResult.insertedId,
        };
        break;

      case 'updateOne':
        // Update single document
        if (!query || !document) {
          await client.close();
          return NextResponse.json({ error: 'Query and document are required for update' }, { status: 400 });
        }
        const updateQuery = JSON.parse(query);
        const updateDoc = typeof document === 'string' ? JSON.parse(document) : document;
        const updateResult = await coll.updateOne(updateQuery, { $set: updateDoc });
        result = {
          acknowledged: updateResult.acknowledged,
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount,
        };
        break;

      case 'deleteOne':
        // Delete single document
        if (!query) {
          await client.close();
          return NextResponse.json({ error: 'Query is required for delete' }, { status: 400 });
        }
        const deleteQuery = JSON.parse(query);
        const deleteResult = await coll.deleteOne(deleteQuery);
        result = {
          acknowledged: deleteResult.acknowledged,
          deletedCount: deleteResult.deletedCount,
        };
        break;

      case 'count':
        // Count documents
        const countQuery = query ? JSON.parse(query) : {};
        result = { count: await coll.countDocuments(countQuery) };
        break;

      default:
        // Default to find
        const defaultQuery = query ? JSON.parse(query) : {};
        result = await coll.find(defaultQuery).limit(limit || 100).toArray();
    }

    await client.close();

    console.log('[MongoDB Query] Success, returned', Array.isArray(result) ? result.length : 1, 'items');

    return NextResponse.json({
      success: true,
      data: result,
      count: Array.isArray(result) ? result.length : 1,
    });
  } catch (error: any) {
    console.error('[MongoDB Query] Error:', error.message);
    return NextResponse.json(
      {
        error: 'Failed to execute MongoDB query',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
