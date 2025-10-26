/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle these server-side modules for the client
      config.resolve.fallback = { 
        ...config.resolve.fallback,
        fs: false, 
        path: false,
        crypto: false,
        dns: false,
        net: false,
        tls: false,
        child_process: false,
        // Database drivers
        pg: false,
        mysql2: false,
        mongodb: false,
        mssql: false,
        oracledb: false,
        'ioredis': false,
        'cassandra-driver': false,
      };
    }
    return config;
  },
  // Mark database packages as external for server components
  serverComponentsExternalPackages: [
    'pg',
    'mysql2', 
    'mongodb',
    'mssql',
    'oracledb',
    'ioredis',
    'cassandra-driver'
  ],
};

module.exports = nextConfig;
