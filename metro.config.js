// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// three's CommonJS entry (used by @react-three/fiber's require('three')) calls the
// Node-only process.emitWarning and crashes on device. Always use the ES module build,
// which also guarantees a single copy of three in the bundle.
const threeModule = path.resolve(__dirname, 'node_modules/three/build/three.module.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return { type: 'sourceFile', filePath: threeModule };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
