/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('chromadb', 'openai');
    }
    return config;
  },
};

module.exports = nextConfig;
