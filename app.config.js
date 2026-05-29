// Polyfill Array.prototype.toReversed for older Node.js versions in the Docker container
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function() {
    return [...this].reverse();
  };
}

const appJson = require('./app.json');

module.exports = ({ config }) => {
  const base = appJson.expo || {};
  const pluginName = './plugins/with-midnight-widget-scheduler';
  const basePlugins = (base.plugins || []).filter((p) =>
    Array.isArray(p) ? p[0] !== pluginName : p !== pluginName
  );
  const widgetPluginIndex = basePlugins.findIndex((p) =>
    Array.isArray(p) ? p[0] === 'react-native-android-widget' : p === 'react-native-android-widget'
  );
  const nativePlugin = [pluginName, { manifest: false, native: true }];
  const manifestPlugin = [pluginName, { manifest: true, native: false }];
  const plugins = [...basePlugins];

  if (widgetPluginIndex >= 0) {
    plugins.splice(widgetPluginIndex, 0, nativePlugin);
    plugins.splice(widgetPluginIndex + 2, 0, manifestPlugin);
  } else {
    plugins.push(nativePlugin, manifestPlugin);
  }

  return {
    ...config,
    ...base,
    plugins,
  };
};
