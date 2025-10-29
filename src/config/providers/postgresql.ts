import { ProviderConfig } from './types';

export const POSTGRES_PROVIDERS: ProviderConfig[] = [
  {
    key: 'postgresql-supabase',
    engine: 'postgresql',
    name: 'Supabase',
    sslRequired: true,
    connectionStringFormat: 'postgresql://postgres.USER:PASS@aws-0-REGION.pooler.supabase.com:5432/postgres',
    docsUrl: 'https://supabase.com/docs/guides/database/connecting-to-postgres',
    helpSteps: [
      'Click the "Connect" button at the top of your project dashboard',
      'Or go to Project Settings → Database (gear icon)',
      'At the very top, click the "Connect" button',
      'A modal will pop up with all your connection info',
      'IMPORTANT: Change Method from "Direct connection" to "Session mode" (fixes IPv4 issues)',
      'Select "URI" format',
      'Copy the connection string (should contain "pooler.supabase.com")',
      'Replace [YOUR-PASSWORD] with your actual database password',
      'If you need to reset your password: Project Settings → Database → Database password → Reset',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String (Session Mode)',
        type: 'text',
        required: true,
        placeholder: 'postgresql://postgres.USER:***@aws-0-us-east-1.pooler.supabase.com:5432/postgres',
        validate: (v) =>
          v.includes('pooler.supabase.com') 
            ? true 
            : 'Use Session Pooler connection (must contain pooler.supabase.com)',
        helpText: 'Must use Session mode (pooler), not Direct connection',
      },
    ],
  },
  {
    key: 'postgresql-neon',
    engine: 'postgresql',
    name: 'Neon',
    sslRequired: true,
    connectionStringFormat: 'postgresql://user:PASS@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require',
    docsUrl: 'https://neon.tech/docs/connect/connect-from-any-app',
    helpSteps: [
      'Go to your Neon project dashboard',
      'Click "Connection Details" or the connection icon',
      'Select "Connection string"',
      'Copy the string shown',
      'Connection pooling is enabled by default',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'postgresql://user:***@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require',
        validate: (v) =>
          v.includes('neon.tech') ? true : 'Must be a Neon connection string',
      },
    ],
  },
  {
    key: 'postgresql-aiven',
    engine: 'postgresql',
    name: 'Aiven',
    sslRequired: true,
    connectionStringFormat: 'postgres://avnadmin:PASS@pg-xxx.aivencloud.com:12345/defaultdb?sslmode=require',
    docsUrl: 'https://docs.aiven.io/docs/products/postgresql/howto/connect-with-psql',
    helpSteps: [
      'Go to your service in Aiven Console',
      'Click on "Overview" tab',
      'Scroll to "Connection information"',
      'Copy the "Service URI"',
      'Make sure to include ?sslmode=require',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'postgres://avnadmin:***@pg-xxx.aivencloud.com:12345/defaultdb?sslmode=require',
        validate: (v) =>
          v.includes('aivencloud.com') && /sslmode=require/i.test(v)
            ? true
            : 'Must include aivencloud.com and ?sslmode=require',
      },
    ],
  },
  {
    key: 'postgresql-aws-rds',
    engine: 'postgresql',
    name: 'AWS RDS',
    connectionStringFormat: 'postgresql://admin:password@database.xxx.us-east-1.rds.amazonaws.com:5432/mydb',
    docsUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ConnectToPostgreSQLInstance.html',
    helpSteps: [
      'Go to RDS Dashboard in AWS Console',
      'Click on your database instance',
      'Find the "Endpoint" in Connectivity & security',
      'Build connection string: postgresql://user:pass@endpoint:5432/dbname',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'postgresql://admin:password@database.xxx.us-east-1.rds.amazonaws.com:5432/mydb',
      },
    ],
  },
  {
    key: 'postgresql-railway',
    engine: 'postgresql',
    name: 'Railway',
    connectionStringFormat: 'postgresql://postgres:PASS@containers-us-west-xxx.railway.app:5432/railway',
    docsUrl: 'https://docs.railway.app/databases/postgresql',
    helpSteps: [
      'Go to your project in Railway',
      'Click on your database service',
      'Go to "Connect" tab',
      'Copy the "DATABASE_URL" or "Postgres Connection URL"',
      'The port may vary',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'postgresql://postgres:***@containers-us-west-xxx.railway.app:5432/railway',
      },
    ],
  },
  {
    key: 'postgresql-heroku',
    engine: 'postgresql',
    name: 'Heroku Postgres',
    sslRequired: true,
    connectionStringFormat: 'postgres://user:PASS@ec2-xxx.compute-1.amazonaws.com:5432/dbname',
    docsUrl: 'https://devcenter.heroku.com/articles/heroku-postgresql',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'postgres://user:***@ec2-xxx.compute-1.amazonaws.com:5432/dbname',
      },
    ],
  },
  {
    key: 'postgresql-digitalocean',
    engine: 'postgresql',
    name: 'DigitalOcean Managed Database',
    sslRequired: true,
    connectionStringFormat: 'postgresql://doadmin:PASS@db-postgresql-nyc-xxx.ondigitalocean.com:25060/defaultdb?sslmode=require',
    docsUrl: 'https://docs.digitalocean.com/products/databases/postgresql/how-to/connect/',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'postgresql://doadmin:***@db-postgresql-nyc-xxx.ondigitalocean.com:25060/defaultdb?sslmode=require',
      },
    ],
  },
  {
    key: 'postgresql-render',
    engine: 'postgresql',
    name: 'Render',
    sslRequired: true,
    connectionStringFormat: 'postgresql://user:PASS@dpg-xxx-a.oregon-postgres.render.com:5432/database',
    docsUrl: 'https://render.com/docs/databases',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'postgresql://user:***@dpg-xxx-a.oregon-postgres.render.com:5432/database',
      },
    ],
  },
  {
    key: 'postgresql-google-cloud-sql',
    engine: 'postgresql',
    name: 'Google Cloud SQL',
    connectionStringFormat: 'postgresql://user:PASS@35.xxx.xxx.xxx:5432/database',
    docsUrl: 'https://cloud.google.com/sql/docs/postgres/connect-overview',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'postgresql://user:***@35.xxx.xxx.xxx:5432/database',
      },
    ],
  },
  {
    key: 'postgresql-azure-database',
    engine: 'postgresql',
    name: 'Azure Database for PostgreSQL',
    sslRequired: true,
    connectionStringFormat: 'postgresql://username@servername:PASS@servername.postgres.database.azure.com:5432/database?sslmode=require',
    docsUrl: 'https://learn.microsoft.com/en-us/azure/postgresql/single-server/how-to-connection-string-powershell',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'postgresql://username@servername:***@servername.postgres.database.azure.com:5432/database?sslmode=require',
      },
    ],
  },
  {
    key: 'postgresql-fly-io',
    engine: 'postgresql',
    name: 'Fly.io',
    connectionStringFormat: 'postgresql://user:PASS@myapp.fly.dev:5432/database',
    docsUrl: 'https://fly.io/docs/reference/postgres/',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'postgresql://user:***@myapp.fly.dev:5432/database',
      },
    ],
  },
  {
    key: 'postgresql-crunchy-data',
    engine: 'postgresql',
    name: 'Crunchy Data',
    sslRequired: true,
    connectionStringFormat: 'postgresql://user:PASS@p.xxx.db.postgresbridge.com:5432/postgres',
    docsUrl: 'https://docs.crunchybridge.com/how-to/connecting/',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'postgresql://user:***@p.xxx.db.postgresbridge.com:5432/postgres',
      },
    ],
  },
  {
    key: 'postgresql-elephantsql',
    engine: 'postgresql',
    name: 'ElephantSQL',
    sslRequired: true,
    connectionStringFormat: 'postgres://user:PASS@raja.db.elephantsql.com/database',
    docsUrl: 'https://www.elephantsql.com/docs/index.html',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'postgres://user:***@raja.db.elephantsql.com/database',
      },
    ],
  },
  {
    key: 'postgresql-other',
    engine: 'postgresql',
    name: 'Other / Self-Hosted',
    connectionStringFormat: 'postgresql://user:password@host:5432/database',
    helpSteps: [
      'PostgreSQL connection strings follow this format:',
      'postgresql://username:password@hostname:port/database',
      'Default port is 5432',
      'Add ?sslmode=require if SSL is required',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'postgresql://user:password@localhost:5432/database',
        helpText: 'Any valid PostgreSQL connection string',
      },
    ],
  },
];
