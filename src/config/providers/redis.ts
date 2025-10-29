import { ProviderConfig } from './types';

export const REDIS_PROVIDERS: ProviderConfig[] = [
  {
    key: 'redis-upstash',
    engine: 'redis',
    name: 'Upstash',
    sslRequired: true,
    connectionStringFormat: 'rediss://default:PASSWORD@global-xxx-12345.upstash.io:6379',
    docsUrl: 'https://docs.upstash.com/redis/overall/getstarted',
    helpSteps: [
      'Go to Upstash Console',
      'Select your Redis database',
      'Copy the connection string from the dashboard',
      'Use the TLS/SSL endpoint (rediss://)',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'rediss://default:***@global-xxx-12345.upstash.io:6379',
        validate: (v) =>
          v.includes('upstash.io') ? true : 'Must be an Upstash Redis connection string',
      },
    ],
  },
  {
    key: 'redis-cloud',
    engine: 'redis',
    name: 'Redis Cloud',
    sslRequired: true,
    connectionStringFormat: 'rediss://default:PASSWORD@redis-12345.cloud.redislabs.com:12345',
    docsUrl: 'https://redis.io/docs/stack/get-started/cloud/',
    helpSteps: [
      'Go to Redis Cloud Console',
      'Select your database',
      'Click "Connect"',
      'Copy the connection string',
      'Use the SSL endpoint',
    ],
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'rediss://default:***@redis-12345.cloud.redislabs.com:12345',
        validate: (v) =>
          v.includes('redislabs.com') || v.includes('redis.cloud')
            ? true
            : 'Must be a Redis Cloud connection string',
      },
    ],
  },
  {
    key: 'redis-aws-elasticache',
    engine: 'redis',
    name: 'AWS ElastiCache',
    connectionStringFormat: 'redis://master.xxx.cache.amazonaws.com:6379',
    docsUrl: 'https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/GettingStarted.html',
    helpSteps: [
      'Go to ElastiCache in AWS Console',
      'Click on your Redis cluster',
      'Find the "Primary Endpoint" or "Configuration Endpoint"',
      'Use endpoint as hostname',
      'Default port is 6379',
    ],
    fields: [
      {
        name: 'host',
        label: 'Endpoint',
        type: 'text',
        required: true,
        placeholder: 'master.xxx.cache.amazonaws.com',
        helpText: 'Primary or Configuration endpoint',
      },
      {
        name: 'port',
        label: 'Port',
        type: 'number',
        required: true,
        placeholder: '6379',
      },
      {
        name: 'password',
        label: 'Password (if AUTH enabled)',
        type: 'password',
        helpText: 'Leave empty if AUTH is not enabled',
      },
    ],
    normalize: (values) => ({
      connectionString: values.password
        ? `redis://:${values.password}@${values.host}:${values.port}`
        : `redis://${values.host}:${values.port}`
    }),
  },
  {
    key: 'redis-azure-cache',
    engine: 'redis',
    name: 'Azure Cache for Redis',
    sslRequired: true,
    connectionStringFormat: 'rediss://:PASSWORD@cachename.redis.cache.windows.net:6380',
    docsUrl: 'https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-nodejs-get-started',
    fields: [
      {
        name: 'host',
        label: 'Host Name',
        type: 'text',
        required: true,
        placeholder: 'cachename.redis.cache.windows.net',
        helpText: 'From Azure Portal → Properties',
      },
      {
        name: 'password',
        label: 'Access Key',
        type: 'password',
        required: true,
        helpText: 'Primary or Secondary access key',
      },
    ],
    normalize: (values) => ({
      connectionString: `rediss://:${values.password}@${values.host}:6380`
    }),
  },
  {
    key: 'redis-railway',
    engine: 'redis',
    name: 'Railway',
    connectionStringFormat: 'redis://default:PASSWORD@containers-us-west-xxx.railway.app:6379',
    docsUrl: 'https://docs.railway.app/databases/redis',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'redis://default:***@containers-us-west-xxx.railway.app:6379',
        helpText: 'Get from Railway → Redis → Connect',
      },
    ],
  },
  {
    key: 'redis-render',
    engine: 'redis',
    name: 'Render',
    sslRequired: true,
    connectionStringFormat: 'rediss://red-xxx:PASSWORD@oregon-redis.render.com:6379',
    docsUrl: 'https://render.com/docs/redis',
    fields: [
      {
        name: 'connectionString',
        label: 'Connection String',
        type: 'text',
        required: true,
        placeholder: 'rediss://red-xxx:***@oregon-redis.render.com:6379',
      },
    ],
  },
  {
    key: 'redis-other',
    engine: 'redis',
    name: 'Other / Self-Hosted',
    connectionStringFormat: 'redis://localhost:6379',
    helpSteps: [
      'Redis connection strings follow this format:',
      'redis://hostname:port (no auth)',
      'redis://:password@hostname:port (with password)',
      'rediss:// for SSL/TLS connections',
      'Default port is 6379',
    ],
    fields: [
      {
        name: 'host',
        label: 'Host',
        type: 'text',
        required: true,
        placeholder: 'localhost',
      },
      {
        name: 'port',
        label: 'Port',
        type: 'number',
        required: true,
        placeholder: '6379',
      },
      {
        name: 'password',
        label: 'Password (optional)',
        type: 'password',
        helpText: 'Leave empty if no password',
      },
      {
        name: 'ssl',
        label: 'Use SSL/TLS',
        type: 'checkbox',
        helpText: 'Use rediss:// protocol',
      },
    ],
    normalize: (values) => {
      const protocol = values.ssl ? 'rediss' : 'redis';
      const auth = values.password ? `:${values.password}@` : '';
      return {
        connectionString: `${protocol}://${auth}${values.host}:${values.port}`
      };
    },
  },
];
