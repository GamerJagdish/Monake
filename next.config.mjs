import webpack from 'webpack';

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude the problematic Safe-related modules
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@safe-global\/safe-apps-(sdk|provider)$/,
      })
    );

    // Also ignore the safe connector specifically
    config.resolve.alias = {
      ...config.resolve.alias,
      '@wagmi/connectors/dist/esm/safe': false,
    };

    return config;
  },
};

export default nextConfig;