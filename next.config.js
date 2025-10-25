/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.resolve.fallback = { 
      fs: false, 
      path: false,
      crypto: false
    };
    return config;
  }
};

module.exports = nextConfig;
