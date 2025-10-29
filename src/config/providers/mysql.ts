import { ProviderConfig } from './types';

export const MYSQL_PROVIDERS: ProviderConfig[] = [
  {
    key: 'mysql-aiven',
    engine: 'mysql',
    name: 'Aiven',
    sslRequired: true,
    connectionStringFormat: 'mysql://avnadmin:PASS@mysql-xxx.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED',
    docsUrl: 'https://docs.aiven.io/docs/products/mysql/howto/connect-with-mysql-cli',
    helpSteps: [
      'Go to your service in Aiven Console',
      'Click on "Overview" tab',
      'Scroll to "Connection information"',
      'Copy the "Service URI"',
      'Make sure to include ?ssl-mode=REQUIRED at the end',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mysql://avnadmin:***@mysql-xxx.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED',
        validate: (v) => 
          v.includes('aivencloud.com') && /ssl-mode=REQUIRED/i.test(v)
            ? true
            : 'Must include aivencloud.com and ?ssl-mode=REQUIRED',
      },
    ],
  },
  {
    key: 'mysql-planetscale',
    engine: 'mysql',
    name: 'PlanetScale',
    sslRequired: true,
    connectionStringFormat: 'mysql://username:pscale_pw_PASS@aws.connect.psdb.cloud/database?sslaccept=strict',
    docsUrl: 'https://planetscale.com/docs/tutorials/connect-any-application',
    helpSteps: [
      'Go to your database dashboard',
      'Click "Connect" button',
      'Select "General" or your framework',
      'Copy the connection string shown',
      'Note: Passwords are generated per connection',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mysql://username:pscale_pw_***@aws.connect.psdb.cloud/database?sslaccept=strict',
        validate: (v) =>
          v.includes('psdb.cloud') ? true : 'Must be a PlanetScale connection string',
      },
    ],
  },
  {
    key: 'mysql-aws-rds',
    engine: 'mysql',
    name: 'AWS RDS',
    connectionStringFormat: 'mysql://admin:password@database.xxx.us-east-1.rds.amazonaws.com:3306/mydb',
    docsUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ConnectToInstance.html',
    helpSteps: [
      'Go to RDS Dashboard in AWS Console',
      'Click on your database instance',
      'Find the "Endpoint" in Connectivity & security',
      'Build connection string: mysql://user:pass@endpoint:3306/dbname',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mysql://admin:password@database.xxx.us-east-1.rds.amazonaws.com:3306/mydb',
        validate: (v) =>
          v.includes('rds.amazonaws.com') ? true : 'Must be an AWS RDS endpoint',
      },
    ],
  },
  {
    key: 'mysql-digitalocean',
    engine: 'mysql',
    name: 'DigitalOcean Managed Database',
    sslRequired: true,
    connectionStringFormat: 'mysql://doadmin:PASS@db-mysql-nyc-xxx.ondigitalocean.com:25060/defaultdb?ssl-mode=REQUIRED',
    docsUrl: 'https://docs.digitalocean.com/products/databases/mysql/how-to/connect/',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mysql://doadmin:***@db-mysql-nyc-xxx.ondigitalocean.com:25060/defaultdb?ssl-mode=REQUIRED',
      },
    ],
  },
  {
    key: 'mysql-railway',
    engine: 'mysql',
    name: 'Railway',
    connectionStringFormat: 'mysql://root:PASS@containers-us-west-xxx.railway.app:6969/railway',
    docsUrl: 'https://docs.railway.app/databases/mysql',
    helpSteps: [
      'Go to your project in Railway',
      'Click on your database service',
      'Go to "Connect" tab',
      'Copy the "DATABASE_URL" or "MySQL Connection URL"',
      'The port may vary (not always 3306)',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mysql://root:***@containers-us-west-xxx.railway.app:6969/railway',
      },
    ],
  },
  {
    key: 'mysql-google-cloud-sql',
    engine: 'mysql',
    name: 'Google Cloud SQL',
    connectionStringFormat: 'mysql://root:PASS@35.xxx.xxx.xxx:3306/database',
    docsUrl: 'https://cloud.google.com/sql/docs/mysql/connect-overview',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mysql://root:***@35.xxx.xxx.xxx:3306/database',
      },
    ],
  },
  {
    key: 'mysql-azure-database',
    engine: 'mysql',
    name: 'Azure Database for MySQL',
    sslRequired: true,
    connectionStringFormat: 'mysql://username@servername:PASS@servername.mysql.database.azure.com:3306/database?ssl=true',
    docsUrl: 'https://learn.microsoft.com/en-us/azure/mysql/single-server/how-to-connection-string',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mysql://username@servername:***@servername.mysql.database.azure.com:3306/database?ssl=true',
      },
    ],
  },
  {
    key: 'mysql-render',
    engine: 'mysql',
    name: 'Render',
    connectionStringFormat: 'mysql://user:PASS@dpg-xxx-a.oregon-postgres.render.com:3306/database',
    docsUrl: 'https://render.com/docs/databases',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mysql://user:***@dpg-xxx-a.oregon-postgres.render.com:3306/database',
      },
    ],
  },
  {
    key: 'mysql-fly-io',
    engine: 'mysql',
    name: 'Fly.io',
    connectionStringFormat: 'mysql://user:PASS@myapp.fly.dev:3306/database',
    docsUrl: 'https://fly.io/docs/reference/mysql/',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mysql://user:***@myapp.fly.dev:3306/database',
      },
    ],
  },
  {
    key: 'mysql-other',
    engine: 'mysql',
    name: 'Other / Self-Hosted',
    connectionStringFormat: 'mysql://user:password@host:3306/database',
    helpSteps: [
      'MySQL connection strings follow this format:',
      'mysql://username:password@hostname:port/database',
      'Default port is 3306',
      'Add ?ssl=true if SSL is required',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mysql://user:password@localhost:3306/database',
        helpText: 'Any valid MySQL connection string',
      },
    ],
  },
];
