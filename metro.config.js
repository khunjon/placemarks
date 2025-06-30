const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver for vector icons
config.resolver.alias = {
  ...config.resolver.alias,
  '@expo/vector-icons': '@expo/vector-icons',
};

module.exports = config;