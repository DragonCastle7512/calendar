const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} = require('expo/config-plugins');

const WIDGET_PACKAGE = 'com.dstle.calendar.widget';
const RECEIVER_NAME = '.widget.MidnightWidgetUpdateReceiver';

function ensurePermission(manifest, name) {
  manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'] || [];
  const has = manifest.manifest['uses-permission'].some((p) => p.$['android:name'] === name);
  if (!has) manifest.manifest['uses-permission'].push({ $: { 'android:name': name } });
}

function ensureReceiver(manifest) {
  const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  app.receiver = app.receiver || [];
  const exists = app.receiver.some((r) => r.$['android:name'] === RECEIVER_NAME);
  if (exists) return;
  app.receiver.push({
    $: {
      'android:name': RECEIVER_NAME,
      'android:exported': 'true',
    },
    'intent-filter': [
      {
        action: [
          { $: { 'android:name': 'com.dstle.calendar.ACTION_MIDNIGHT_WIDGET_UPDATE' } },
          { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
          { $: { 'android:name': 'android.intent.action.TIME_SET' } },
          { $: { 'android:name': 'android.intent.action.TIMEZONE_CHANGED' } },
          { $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } },
        ],
      },
    ],
  });
}

function writeIfChanged(filePath, content) {
  if (fs.existsSync(filePath)) {
    const current = fs.readFileSync(filePath, 'utf8');
    if (current === content) return;
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

function readTemplate(projectRoot, fileName) {
  const templatePath = path.join(projectRoot, 'src', 'native', 'android', 'widget', fileName);
  return fs.readFileSync(templatePath, 'utf8');
}

function patchMainApplication(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('import com.dstle.calendar.widget.WidgetUpdateScheduler')) {
    content = content.replace(
      'import com.facebook.react.defaults.DefaultReactNativeHost',
      'import com.facebook.react.defaults.DefaultReactNativeHost\nimport com.dstle.calendar.widget.WidgetUpdateScheduler'
    );
  }
  if (!content.includes('WidgetUpdateScheduler.scheduleNextMidnight(this)')) {
    content = content.replace(
      'ApplicationLifecycleDispatcher.onApplicationCreate(this)',
      'ApplicationLifecycleDispatcher.onApplicationCreate(this)\n    WidgetUpdateScheduler.scheduleNextMidnight(this)'
    );
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

module.exports = function withMidnightWidgetScheduler(config) {
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    ensurePermission(manifest, 'android.permission.RECEIVE_BOOT_COMPLETED');
    ensurePermission(manifest, 'android.permission.SCHEDULE_EXACT_ALARM');
    ensureReceiver(manifest);
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const widgetDir = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        ...WIDGET_PACKAGE.split('.')
      );
      fs.mkdirSync(widgetDir, { recursive: true });

      writeIfChanged(path.join(widgetDir, 'WidgetUpdateScheduler.kt'), readTemplate(projectRoot, 'WidgetUpdateScheduler.kt'));
      writeIfChanged(path.join(widgetDir, 'MidnightWidgetUpdateReceiver.kt'), readTemplate(projectRoot, 'MidnightWidgetUpdateReceiver.kt'));
      writeIfChanged(path.join(widgetDir, 'Memo.java'), readTemplate(projectRoot, 'Memo.java'));

      const mainAppPath = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'dstle',
        'calendar',
        'MainApplication.kt'
      );
      patchMainApplication(mainAppPath);

      return cfg;
    },
  ]);

  return config;
};
