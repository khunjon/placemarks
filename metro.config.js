const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver for vector icons
config.resolver.alias = {
  ...config.resolver.alias,
  '@expo/vector-icons': '@expo/vector-icons',
};

// Add asset plugins for proper SVG bundling in production
config.transformer = {
  ...config.transformer,
  assetPlugins: ['expo-asset/tools/hashAssetFiles'], // Critical for production builds
};

module.exports = config;