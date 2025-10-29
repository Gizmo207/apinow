import { ProviderConfig } from './types';

export const MSSQL_PROVIDERS: ProviderConfig[] = [
  {
    key: 'mssql-azure-sql',
    engine: 'mssql',
    name: 'Azure SQL Database',
    sslRequired: true,
    connectionStringFormat: 'Server=tcp:servername.database.windows.net,1433;Database=mydb;User ID=username;Password=password;Encrypt=true;TrustServerCertificate=false;',
    docsUrl: 'https://learn.microsoft.com/en-us/azure/azure-sql/database/connect-query-nodejs',
    helpSteps: [
      'Go to your Azure SQL Database in Azure Portal',
      'Click "Connection strings" in the left menu',
      'Copy the ADO.NET connection string',
      'Replace {your_password} with your actual password',
      'Keep Encrypt=true for security',
    ],
    fields: [
      {
        name: 'server',
        label: 'Server',
        type: 'text',
        required: true,
        placeholder: 'servername.database.windows.net',
        helpText: 'Azure SQL server name (without tcp: or port)',
      },
      {
        name: 'database',
        label: 'Database',
        type: 'text',
        required: true,
        placeholder: 'mydb',
      },
      {
        name: 'user',
        label: 'Username',
        type: 'text',
        required: true,
        placeholder: 'username@servername',
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
      },
    ],
    normalize: (values) => ({
      connectionString: `Server=tcp:${values.server},1433;Database=${values.database};User ID=${values.user};Password=${values.password};Encrypt=true;TrustServerCertificate=false;`
    }),
  },
  {
    key: 'mssql-aws-rds',
    engine: 'mssql',
    name: 'AWS RDS for SQL Server',
    connectionStringFormat: 'Server=database.xxx.us-east-1.rds.amazonaws.com,1433;Database=mydb;User ID=admin;Password=password;Encrypt=false;',
    docsUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ConnectToMicrosoftSQLServerInstance.html',
    helpSteps: [
      'Go to RDS Dashboard in AWS Console',
      'Click on your SQL Server instance',
      'Find the "Endpoint" in Connectivity & security',
      'Use endpoint as server name',
      'Default port is 1433',
    ],
    fields: [
      {
        name: 'server',
        label: 'Server (Endpoint)',
        type: 'text',
        required: true,
        placeholder: 'database.xxx.us-east-1.rds.amazonaws.com',
      },
      {
        name: 'database',
        label: 'Database',
        type: 'text',
        required: true,
        placeholder: 'mydb',
      },
      {
        name: 'user',
        label: 'Username',
        type: 'text',
        required: true,
        placeholder: 'admin',
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
      },
    ],
    normalize: (values) => ({
      connectionString: `Server=${values.server},1433;Database=${values.database};User ID=${values.user};Password=${values.password};Encrypt=false;`
    }),
  },
  {
    key: 'mssql-google-cloud-sql',
    engine: 'mssql',
    name: 'Google Cloud SQL',
    connectionStringFormat: 'Server=35.xxx.xxx.xxx,1433;Database=mydb;User ID=sqlserver;Password=password;Encrypt=false;',
    docsUrl: 'https://cloud.google.com/sql/docs/sqlserver/connect-overview',
    fields: [
      {
        name: 'server',
        label: 'Server (Public IP)',
        type: 'text',
        required: true,
        placeholder: '35.xxx.xxx.xxx',
        helpText: 'Use the Public IP address from Cloud SQL',
      },
      {
        name: 'database',
        label: 'Database',
        type: 'text',
        required: true,
        placeholder: 'mydb',
      },
      {
        name: 'user',
        label: 'Username',
        type: 'text',
        required: true,
        placeholder: 'sqlserver',
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
      },
    ],
    normalize: (values) => ({
      connectionString: `Server=${values.server},1433;Database=${values.database};User ID=${values.user};Password=${values.password};Encrypt=false;`
    }),
  },
  {
    key: 'mssql-other',
    engine: 'mssql',
    name: 'Other / Self-Hosted',
    connectionStringFormat: 'Server=hostname,1433;Database=mydb;User ID=sa;Password=password;Encrypt=false;',
    helpSteps: [
      'SQL Server connection requires: Server, Database, User ID, Password',
      'Default port is 1433',
      'For Windows Authentication, omit User ID and Password',
      'Set Encrypt=true for SSL connections',
    ],
    fields: [
      {
        name: 'server',
        label: 'Server',
        type: 'text',
        required: true,
        placeholder: 'localhost or hostname',
      },
      {
        name: 'database',
        label: 'Database',
        type: 'text',
        required: true,
        placeholder: 'mydb',
      },
      {
        name: 'user',
        label: 'Username',
        type: 'text',
        required: true,
        placeholder: 'sa',
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
      },
      {
        name: 'encrypt',
        label: 'Use SSL/TLS',
        type: 'checkbox',
        helpText: 'Enable encryption for secure connections',
      },
    ],
    normalize: (values) => ({
      connectionString: `Server=${values.server},1433;Database=${values.database};User ID=${values.user};Password=${values.password};Encrypt=${values.encrypt ? 'true' : 'false'};`
    }),
  },
];
