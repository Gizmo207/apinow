/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle sql.js on the server (client-only)
      config.externals = [...(config.externals || []), 'sql.js'];
    }
    return config;
  },
};

export default nextConfig;
