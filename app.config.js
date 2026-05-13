const appJson = require('./app.json');

module.exports = ({ config }) => {
  const base = appJson.expo || {};
  const plugins = [...(base.plugins || [])];
  const hasPlugin = plugins.some((p) =>
    Array.isArray(p) ? p[0] === './plugins/with-midnight-widget-scheduler' : p === './plugins/with-midnight-widget-scheduler'
  );

  if (!hasPlugin) {
    plugins.push('./plugins/with-midnight-widget-scheduler');
  }

  return {
    ...config,
    ...base,
    plugins,
  };
};
