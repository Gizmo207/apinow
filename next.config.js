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
        'better-sqlite3': false
      };
    }
    return config;
  },
  // Mark database packages as external for server components
  serverExternalPackages: [
    'better-sqlite3'
  ],
};

module.exports = nextConfig;
