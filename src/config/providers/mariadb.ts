import { ProviderConfig } from './types';

export const MARIADB_PROVIDERS: ProviderConfig[] = [
  {
    key: 'mariadb-aws-rds',
    engine: 'mariadb',
    name: 'AWS RDS',
    connectionStringFormat: 'mysql://admin:password@mariadb.xxx.us-east-1.rds.amazonaws.com:3306/mydb',
    docsUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_MariaDB.html',
    helpSteps: [
      'Go to RDS Dashboard in AWS Console',
      'Click on your MariaDB instance',
      'Find the "Endpoint" in Connectivity & security',
      'Build connection string: mysql://user:pass@endpoint:3306/dbname',
      'Note: Use mysql:// protocol (MariaDB is MySQL-compatible)',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mysql://admin:password@mariadb.xxx.us-east-1.rds.amazonaws.com:3306/mydb',
        validate: (v) =>
          v.includes('rds.amazonaws.com') ? true : 'Must be an AWS RDS endpoint',
      },
    ],
  },
  {
    key: 'mariadb-digitalocean',
    engine: 'mariadb',
    name: 'DigitalOcean Managed Database',
    sslRequired: true,
    connectionStringFormat: 'mysql://doadmin:PASS@db-mariadb-nyc-xxx.ondigitalocean.com:25060/defaultdb?ssl-mode=REQUIRED',
    docsUrl: 'https://docs.digitalocean.com/products/databases/mariadb/',
    helpSteps: [
      'Go to your DigitalOcean Database cluster',
      'Click "Connection Details"',
      'Select "Connection String"',
      'Copy the connection string',
      'Ensure ?ssl-mode=REQUIRED is included',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mysql://doadmin:***@db-mariadb-nyc-xxx.ondigitalocean.com:25060/defaultdb?ssl-mode=REQUIRED',
        validate: (v) =>
          v.includes('ondigitalocean.com') && /ssl-mode=REQUIRED/i.test(v)
            ? true
            : 'Must include ondigitalocean.com and ?ssl-mode=REQUIRED',
      },
    ],
  },
  {
    key: 'mariadb-google-cloud-sql',
    engine: 'mariadb',
    name: 'Google Cloud SQL',
    connectionStringFormat: 'mysql://root:PASS@35.xxx.xxx.xxx:3306/database',
    docsUrl: 'https://cloud.google.com/sql/docs/mariadb',
    helpSteps: [
      'Go to Cloud SQL in Google Cloud Console',
      'Click on your MariaDB instance',
      'Go to "Connections" tab',
      'Find the Public IP address',
      'Build connection string using IP and credentials',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mysql://root:***@35.xxx.xxx.xxx:3306/database',
        helpText: 'Use the Public IP from Google Cloud Console',
      },
    ],
  },
  {
    key: 'mariadb-azure-database',
    engine: 'mariadb',
    name: 'Azure Database for MariaDB',
    sslRequired: true,
    connectionStringFormat: 'mysql://username@servername:PASS@servername.mariadb.database.azure.com:3306/database?ssl=true',
    docsUrl: 'https://learn.microsoft.com/en-us/azure/mariadb/',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mysql://username@servername:***@servername.mariadb.database.azure.com:3306/database?ssl=true',
        helpText: 'SSL is required for Azure MariaDB',
      },
    ],
  },
  {
    key: 'mariadb-railway',
    engine: 'mariadb',
    name: 'Railway',
    connectionStringFormat: 'mysql://root:PASS@containers-us-west-xxx.railway.app:3306/railway',
    docsUrl: 'https://docs.railway.app/databases/mariadb',
    helpSteps: [
      'Go to your project in Railway',
      'Click on your MariaDB service',
      'Go to "Connect" tab',
      'Copy the "DATABASE_URL" or connection string',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mysql://root:***@containers-us-west-xxx.railway.app:3306/railway',
      },
    ],
  },
  {
    key: 'mariadb-skysql',
    engine: 'mariadb',
    name: 'SkySQL (Official Cloud)',
    sslRequired: true,
    connectionStringFormat: 'mysql://dbuser:PASS@mariadb-xxx.mdb0123456789.db.skysql.net:5001/database?ssl-verify-server-cert=false',
    docsUrl: 'https://mariadb.com/docs/skysql/connect/',
    helpSteps: [
      'Go to SkySQL Portal',
      'Select your database service',
      'Click "Connect"',
      'Copy the connection string',
      'Use the provided credentials',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'mysql://dbuser:***@mariadb-xxx.mdb0123456789.db.skysql.net:5001/database?ssl-verify-server-cert=false',
        validate: (v) =>
          v.includes('skysql.net') ? true : 'Must be a SkySQL connection string',
      },
    ],
  },
  {
    key: 'mariadb-other',
    engine: 'mariadb',
    name: 'Other / Self-Hosted',
    connectionStringFormat: 'mysql://user:password@host:3306/database',
    helpSteps: [
      'MariaDB uses MySQL protocol and connection strings',
      'Format: mysql://username:password@hostname:port/database',
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
        helpText: 'Any valid MariaDB/MySQL connection string',
      },
    ],
  },
];
