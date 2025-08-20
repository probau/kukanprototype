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
  // Add PostHog rewrites and preserve existing ones
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
      {
        source: '/ingest/flags',
        destination: 'https://eu.i.posthog.com/flags',
      },
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
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;
