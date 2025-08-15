/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({
      'three/examples/jsm/loaders/OBJLoader': 'commonjs three/examples/jsm/loaders/OBJLoader',
    });
    return config;
  },
  // Increase API body size limit to handle large screenshots
  experimental: {
    serverComponentsExternalPackages: ['three'],
  },
  // Configure API routes with larger body size limits
  async headers() {
    return [
      {
        source: '/api/chat',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
    ];
  },
  // Increase body parser limit for API routes
  async rewrites() {
    return [
      {
        source: '/api/chat',
        destination: '/api/chat',
        has: [
          {
            type: 'header',
            key: 'content-length',
            value: '(?<size>.*)',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
