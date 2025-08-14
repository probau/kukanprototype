/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({
      'three/examples/jsm/loaders/OBJLoader': 'commonjs three/examples/jsm/loaders/OBJLoader',
    });
    return config;
  },
}

module.exports = nextConfig
