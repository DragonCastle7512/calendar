const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} = require('expo/config-plugins');

const WIDGET_PACKAGE = 'com.dstle.calendar.widget';
const RECEIVER_NAME = '.widget.MidnightWidgetUpdateReceiver';
const WIDGET_RECEIVER_NAME = '.widget.Memo';

function ensurePermission(manifest, name) {
  manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'] || [];
  const has = manifest.manifest['uses-permission'].some((p) => p.$['android:name'] === name);
  if (!has) manifest.manifest['uses-permission'].push({ $: { 'android:name': name } });
}

function ensureReceiver(manifest) {
  const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  app.receiver = app.receiver || [];
  
  // Update MidnightWidgetUpdateReceiver
  let midnightReceiver = app.receiver.find((r) => 
    r.$['android:name'] === RECEIVER_NAME || r.$['android:name'].endsWith(RECEIVER_NAME)
  );
  if (!midnightReceiver) {
    midnightReceiver = {
      $: {
        'android:name': RECEIVER_NAME,
        'android:exported': 'true',
        'android:enabled': 'true',
        'android:directBootAware': 'true',
      },
      'intent-filter': [],
    };
    app.receiver.push(midnightReceiver);
  } else {
    midnightReceiver.$['android:exported'] = 'true';
    midnightReceiver.$['android:enabled'] = 'true';
  }
  
  midnightReceiver['intent-filter'] = [
    {
      $: { 'android:priority': '999' },
      action: [
        { $: { 'android:name': 'com.dstle.calendar.ACTION_MIDNIGHT_WIDGET_UPDATE' } },
        { $: { 'android:name': 'android.intent.action.TIME_SET' } },
        { $: { 'android:name': 'android.intent.action.TIMEZONE_CHANGED' } },
        { $: { 'android:name': 'android.intent.action.USER_PRESENT' } },
        { $: { 'android:name': 'android.intent.action.SCREEN_ON' } },
        { $: { 'android:name': 'android.intent.action.SCREEN_OFF' } },
        { $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } },
      ],
    },
  ];

  // Update Memo (Widget) Receiver to also catch system events
  let memoReceiver = app.receiver.find((r) => 
    r.$['android:name'] === WIDGET_RECEIVER_NAME || r.$['android:name'].endsWith(WIDGET_RECEIVER_NAME)
  );
  if (memoReceiver) {
    if (!memoReceiver['intent-filter']) memoReceiver['intent-filter'] = [];
    
    memoReceiver.$['android:directBootAware'] = 'true';
    memoReceiver.$['android:exported'] = 'true';
    memoReceiver.$['android:enabled'] = 'true';
    
    // Add system actions to existing widget intent-filter or add a new one
    memoReceiver['intent-filter'].push({
      $: { 'android:priority': '999' },
      action: [
        { $: { 'android:name': 'android.intent.action.USER_PRESENT' } },
        { $: { 'android:name': 'android.intent.action.TIME_SET' } },
        { $: { 'android:name': 'android.intent.action.TIMEZONE_CHANGED' } },
        { $: { 'android:name': 'android.intent.action.SCREEN_ON' } },
      ],
    });
  }
}

function writeIfChanged(filePath, content) {
  if (fs.existsSync(filePath)) {
    const current = fs.readFileSync(filePath, 'utf8');
    if (current === content) return;
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

function readTemplate(fileName) {
  const templatePath = path.join(__dirname, '..', 'src', 'native', 'android', 'widget', fileName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }
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
  if (!content.includes('WidgetUpdateScheduler.registerUserPresentReceiver(this)')) {
    content = content.replace(
      'WidgetUpdateScheduler.scheduleNextMidnight(this)',
      'WidgetUpdateScheduler.scheduleNextMidnight(this)\n    WidgetUpdateScheduler.registerUserPresentReceiver(this)'
    );
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

module.exports = function withMidnightWidgetScheduler(config, options = {}) {
  const shouldPatchManifest = options.manifest !== false;
  const shouldCopyNative = options.native !== false;

  if (shouldPatchManifest) {
    config = withAndroidManifest(config, (cfg) => {
      const manifest = cfg.modResults;
      ensurePermission(manifest, 'android.permission.SCHEDULE_EXACT_ALARM');
      ensurePermission(manifest, 'android.permission.WAKE_LOCK');
      ensureReceiver(manifest);
      return cfg;
    });
  }

  if (shouldCopyNative) {
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

        writeIfChanged(path.join(widgetDir, 'WidgetUpdateScheduler.kt'), readTemplate('WidgetUpdateScheduler.kt'));
        writeIfChanged(path.join(widgetDir, 'MidnightWidgetUpdateReceiver.kt'), readTemplate('MidnightWidgetUpdateReceiver.kt'));
        writeIfChanged(path.join(widgetDir, 'Memo.java'), readTemplate('Memo.java'));

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
  }

  return config;
};
