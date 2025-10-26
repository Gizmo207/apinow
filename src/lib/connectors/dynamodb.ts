import { DatabaseAdapter } from './types';

// Dynamic import to avoid bundling for client
let DynamoDBClient: any;
let DynamoDBDocumentClient: any;
let ScanCommand: any;
let GetCommand: any;
let PutCommand: any;
let UpdateCommand: any;
let DeleteCommand: any;

export class DynamoDBAdapter implements DatabaseAdapter {
  type = 'dynamodb';
  private client: any = null;
  private docClient: any = null;
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // Only import AWS SDK on server side
    if (typeof window === 'undefined' && !DynamoDBClient) {
      const clientDDB = await import('@aws-sdk/client-dynamodb');
      const libDDB = await import('@aws-sdk/lib-dynamodb');
      
      DynamoDBClient = clientDDB.DynamoDBClient;
      ScanCommand = clientDDB.ScanCommand;
      
      DynamoDBDocumentClient = libDDB.DynamoDBDocumentClient;
      GetCommand = libDDB.GetCommand;
      PutCommand = libDDB.PutCommand;
      UpdateCommand = libDDB.UpdateCommand;
      DeleteCommand = libDDB.DeleteCommand;
    }

    if (!DynamoDBClient) {
      throw new Error('DynamoDB can only be used on the server side');
    }

    try {
      this.client = new DynamoDBClient({
        region: this.config.awsRegion || this.config.region || 'us-east-1',
        credentials: this.config.awsAccessKey && this.config.awsSecretKey ? {
          accessKeyId: this.config.awsAccessKey,
          secretAccessKey: this.config.awsSecretKey,
        } : undefined,
      });

      this.docClient = DynamoDBDocumentClient.from(this.client);
      
      console.log(`✅ Connected to DynamoDB in region: ${this.config.awsRegion || 'us-east-1'}`);
    } catch (error) {
      console.error('❌ DynamoDB connection failed:', error);
      throw new Error(`DynamoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this.docClient = null;
      console.log('✅ Disconnected from DynamoDB');
    }
  }

  async listCollections(): Promise<string[]> {
    if (!this.client) throw new Error('Not connected to database');

    try {
      const { ListTablesCommand } = await import('@aws-sdk/client-dynamodb');
      const command = new ListTablesCommand({});
      const response = await this.client.send(command);
      
      return response.TableNames || [];
    } catch (error) {
      console.error('Failed to list tables:', error);
      throw error;
    }
  }

  async listDocuments(collection: string, limit: number = 100): Promise<any[]> {
    if (!this.docClient) throw new Error('Not connected to database');

    try {
      const command = new ScanCommand({
        TableName: collection,
        Limit: limit,
      });
      
      const response = await this.client.send(command);
      
      // Convert DynamoDB format to standard format
      return response.Items?.map((item: any) => this.unmarshallItem(item)) || [];
    } catch (error) {
      console.error(`Failed to list documents from ${collection}:`, error);
      throw error;
    }
  }

  async create(collection: string, id: string | undefined, data: any): Promise<any> {
    if (!this.docClient) throw new Error('Not connected to database');

    try {
      const docId = id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const item = { id: docId, ...data };
      
      const command = new PutCommand({
        TableName: collection,
        Item: item,
      });
      
      await this.docClient.send(command);
      
      return item;
    } catch (error) {
      console.error(`Failed to create document in ${collection}:`, error);
      throw error;
    }
  }

  async read(collection: string, id: string): Promise<any> {
    if (!this.docClient) throw new Error('Not connected to database');

    try {
      const command = new GetCommand({
        TableName: collection,
        Key: { id },
      });
      
      const response = await this.docClient.send(command);
      
      if (!response.Item) {
        throw new Error(`Document not found: ${id}`);
      }
      
      return response.Item;
    } catch (error) {
      console.error(`Failed to read document ${id} from ${collection}:`, error);
      throw error;
    }
  }

  async update(collection: string, id: string, data: any): Promise<any> {
    if (!this.docClient) throw new Error('Not connected to database');

    try {
      // Remove id from update data
      const { id: _, ...updateData } = data;
      
      // Build update expression
      const updateExpressions: string[] = [];
      const expressionAttributeNames: any = {};
      const expressionAttributeValues: any = {};
      
      Object.keys(updateData).forEach((key, index) => {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpressions.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = updateData[key];
      });
      
      const command = new UpdateCommand({
        TableName: collection,
        Key: { id },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      });
      
      const response = await this.docClient.send(command);
      
      return response.Attributes;
    } catch (error) {
      console.error(`Failed to update document ${id} in ${collection}:`, error);
      throw error;
    }
  }

  async delete(collection: string, id: string): Promise<{ success: boolean }> {
    if (!this.docClient) throw new Error('Not connected to database');

    try {
      const command = new DeleteCommand({
        TableName: collection,
        Key: { id },
        ReturnValues: 'ALL_OLD',
      });
      
      const response = await this.docClient.send(command);
      
      if (!response.Attributes) {
        throw new Error(`Document not found: ${id}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete document ${id} from ${collection}:`, error);
      throw error;
    }
  }

  private unmarshallItem(item: any): any {
    // Convert DynamoDB format to regular object
    const result: any = {};
    for (const [key, value] of Object.entries(item)) {
      if (typeof value === 'object' && value !== null) {
        const typeKey = Object.keys(value)[0];
        result[key] = (value as any)[typeKey];
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
