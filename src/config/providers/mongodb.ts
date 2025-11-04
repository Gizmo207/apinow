import { ProviderConfig } from './types';

export const MONGODB_PROVIDERS: ProviderConfig[] = [
  {
    key: 'mongodb-atlas',
    engine: 'mongodb',
    name: 'MongoDB Atlas',
    sslRequired: true,
    connectionStringFormat: 'mongodb+srv://username:PASSWORD@cluster0.xxxxx.mongodb.net/database?retryWrites=true&w=majority',
    docsUrl: 'https://www.mongodb.com/docs/atlas/driver-connection/',
    helpSteps: [
      '📋 STEP 1: Get Connection String',
      '   Atlas → Cluster → "Connect" → "Drivers" → Copy the string',
      '🔑 STEP 2: Get Password',
      '   Security → Database Access → Edit User → Autogenerate Password → Copy it',
      '🗂️ STEP 3: Get Database Name',
      '   Atlas → "Browse Collections" → See database names (e.g., sample_mflix, test)',
    ],
    fields: [
      {
        name: 'connectionString',
        label: '📋 Connection String (from Atlas)',
        type: 'text',
        required: true,
        placeholder: 'mongodb+srv://username:<db_password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0',
        validate: (v) =>
          v.includes('mongodb') && (v.includes('mongodb.net') || v.includes('mongodb+srv://'))
            ? true
            : 'Must be a valid MongoDB connection string',
        helpText: 'Paste exactly as copied from Atlas. Leave <db_password> placeholder unchanged.',
      },
      {
        name: 'password',
        label: '🔑 Database Password (from Database Access)',
        type: 'password',
        required: true,
        placeholder: 'Paste the password you copied',
        helpText: 'The password you just generated in Database Access (not <db_password>)',
      },
      {
        name: 'database',
        label: '🗂️ Database Name (from Browse Collections)',
        type: 'text',
        required: true,
        placeholder: 'sample_mflix',
        helpText: 'The name of the database you want to connect to (visible in Browse Collections)',
      },
    ],
  },
  {
    key: 'mongodb-aws-documentdb',
    engine: 'mongodb',
    name: 'AWS DocumentDB',
    sslRequired: true,
    connectionStringFormat: 'mongodb://username:PASSWORD@docdb-cluster.cluster-xxxxx.us-east-1.docdb.amazonaws.com:27017/database?tls=true&replicaSet=rs0&readPreference=secondaryPreferred',
    docsUrl: 'https://docs.aws.amazon.com/documentdb/latest/developerguide/connect-from-outside-a-vpc.html',
    helpSteps: [
      'Go to DocumentDB in AWS Console',
      'Click on your cluster',
      'Find the cluster endpoint',
      'Build connection string with your credentials',
      'Include ?tls=true for SSL',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mongodb://username:***@docdb-cluster.cluster-xxxxx.us-east-1.docdb.amazonaws.com:27017/database?tls=true',
        validate: (v) =>
          v.includes('docdb.amazonaws.com') ? true : 'Must be an AWS DocumentDB endpoint',
      },
    ],
  },
  {
    key: 'mongodb-azure-cosmos',
    engine: 'mongodb',
    name: 'Azure Cosmos DB (MongoDB API)',
    sslRequired: true,
    connectionStringFormat: 'mongodb://accountname:PASSWORD@accountname.mongo.cosmos.azure.com:10255/database?ssl=true&replicaSet=globaldb&retrywrites=false',
    docsUrl: 'https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/connect-account',
    helpSteps: [
      'Go to your Cosmos DB account in Azure Portal',
      'Select "Connection String" from the menu',
      'Copy the MongoDB connection string',
      'Use the MongoDB API endpoint',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mongodb://accountname:***@accountname.mongo.cosmos.azure.com:10255/database?ssl=true',
        validate: (v) =>
          v.includes('cosmos.azure.com') ? true : 'Must be an Azure Cosmos DB endpoint',
      },
    ],
  },
  {
    key: 'mongodb-digitalocean',
    engine: 'mongodb',
    name: 'DigitalOcean Managed MongoDB',
    sslRequired: true,
    connectionStringFormat: 'mongodb://doadmin:PASSWORD@db-mongodb-nyc1-xxxxx.ondigitalocean.com:27017/admin?tls=true&authSource=admin',
    docsUrl: 'https://docs.digitalocean.com/products/databases/mongodb/how-to/connect/',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mongodb://doadmin:***@db-mongodb-nyc1-xxxxx.ondigitalocean.com:27017/admin?tls=true',
      },
    ],
  },
  {
    key: 'mongodb-railway',
    engine: 'mongodb',
    name: 'Railway',
    connectionStringFormat: 'mongodb://mongo:PASSWORD@containers-us-west-xxx.railway.app:6379',
    docsUrl: 'https://docs.railway.app/databases/mongodb',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mongodb://mongo:***@containers-us-west-xxx.railway.app:6379',
      },
    ],
  },
  {
    key: 'mongodb-other',
    engine: 'mongodb',
    name: 'Other / Self-Hosted',
    connectionStringFormat: 'mongodb://username:password@host:27017/database',
    helpSteps: [
      'MongoDB connection strings follow this format:',
      'mongodb://username:password@hostname:port/database',
      'For replica sets: mongodb://host1:port1,host2:port2/database?replicaSet=mySet',
      'For srv: mongodb+srv://username:password@cluster.mongodb.net/database',
      'Default port is 27017',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mongodb://username:password@localhost:27017/database',
        helpText: 'Any valid MongoDB connection string',
      },
    ],
  },
];
