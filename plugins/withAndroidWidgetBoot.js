const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

function withAndroidWidgetBoot(config) {
  return withAndroidManifest(config, async (manifestConfig) => {
    AndroidConfig.Permissions.ensurePermissions(manifestConfig.modResults, [
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ]);

    return manifestConfig;
  });
}

module.exports = withAndroidWidgetBoot;