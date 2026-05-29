const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
  withGradleProperties,
} = require('expo/config-plugins');

const MIDNIGHT_RECEIVER_NAME = 'com.dstle.calendar.widget.MidnightWidgetUpdateReceiver';
const WIDGET_PACKAGE = 'com.dstle.calendar.widget';

function ensurePermission(manifest, name) {
  manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'] || [];
  const has = manifest.manifest['uses-permission'].some((p) => p.$['android:name'] === name);
  if (!has) manifest.manifest['uses-permission'].push({ $: { 'android:name': name } });
}

function ensureMidnightReceiver(manifest) {
  const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  app.receiver = app.receiver || [];
  
  // Find if it already exists
  let midnightReceiver = app.receiver.find((r) => 
    r.$['android:name'] === MIDNIGHT_RECEIVER_NAME || 
    r.$['android:name'] === '.widget.MidnightWidgetUpdateReceiver'
  );
  
  if (!midnightReceiver) {
    midnightReceiver = {
      $: {
        'android:name': MIDNIGHT_RECEIVER_NAME,
        'android:exported': 'true',
        'android:enabled': 'true',
        'android:directBootAware': 'true',
      },
      'intent-filter': [
        {
          $: { 'android:priority': '999' },
          action: [
            { $: { 'android:name': 'com.dstle.calendar.ACTION_MIDNIGHT_WIDGET_UPDATE' } },
            { $: { 'android:name': 'android.intent.action.TIME_SET' } },
            { $: { 'android:name': 'android.intent.action.TIMEZONE_CHANGED' } },
            { $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } },
          ],
        },
      ],
    };
    app.receiver.push(midnightReceiver);
  } else {
    // Ensure it uses the full package name
    midnightReceiver.$['android:name'] = MIDNIGHT_RECEIVER_NAME;
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
  
  // Imports
  if (!content.includes('import com.dstle.calendar.widget.WidgetUpdateScheduler')) {
    // Remove old imports if they exist (from previous versions of this plugin)
    content = content.replace('import com.dstle.calendar.WidgetUpdateScheduler\n', '');
    content = content.replace('import com.dstle.calendar.WidgetPackage\n', '');

    content = content.replace(
      'import com.facebook.react.defaults.DefaultReactNativeHost',
      'import com.facebook.react.defaults.DefaultReactNativeHost\nimport com.dstle.calendar.widget.WidgetUpdateScheduler\nimport com.dstle.calendar.widget.WidgetPackage'
    );
  }
  
  // Register package
  if (!content.includes('add(WidgetPackage())')) {
    content = content.replace(
      '// add(MyReactNativePackage())',
      '// add(MyReactNativePackage())\n              add(WidgetPackage())'
    );
  }

  // Lifecycle calls
  if (!content.includes('WidgetUpdateScheduler.scheduleNextMidnight(this)')) {
    content = content.replace(
      'ApplicationLifecycleDispatcher.onApplicationCreate(this)',
      'ApplicationLifecycleDispatcher.onApplicationCreate(this)\n    WidgetUpdateScheduler.scheduleNextMidnight(this)'
    );
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
}

module.exports = function withMidnightWidgetScheduler(config, options = {}) {
  const shouldPatchManifest = options.manifest !== false;
  const shouldCopyNative = options.native !== false;

  config = withGradleProperties(config, (cfg) => {
    const jvmArgsKey = 'org.gradle.jvmargs';
    const jvmArgsValue = '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError';
    
    const existingIndex = cfg.modResults.findIndex(item => item.key === jvmArgsKey);
    if (existingIndex >= 0) {
      cfg.modResults[existingIndex].value = jvmArgsValue;
    } else {
      cfg.modResults.push({
        type: 'property',
        key: jvmArgsKey,
        value: jvmArgsValue,
      });
    }

    // Limit active compiled CPU architectures to arm64-v8a in local Docker environments
    // to reduce memory consumption by 75% and prevent WSL 2 / OOM crashes
    if (process.env.LOCAL_BUILD) {
      const archsKey = 'reactNativeArchitectures';
      const archsValue = 'arm64-v8a';
      const archsIndex = cfg.modResults.findIndex(item => item.key === archsKey);
      if (archsIndex >= 0) {
        cfg.modResults[archsIndex].value = archsValue;
      } else {
        cfg.modResults.push({
          type: 'property',
          key: archsKey,
          value: archsValue,
        });
      }
      console.log('[LOCAL BUILD OPTIMIZATION] Restricting reactNativeArchitectures to arm64-v8a');

      // Prevent WSL 2 RAM/CPU exhaustion (OOM crashes & high-load socket EOF errors)
      // by limiting concurrent tasks and disabling parallel execution.
      const parallelKey = 'org.gradle.parallel';
      const parallelIndex = cfg.modResults.findIndex(item => item.key === parallelKey);
      if (parallelIndex >= 0) {
        cfg.modResults[parallelIndex].value = 'false';
      } else {
        cfg.modResults.push({
          type: 'property',
          key: parallelKey,
          value: 'false',
        });
      }

      const workersKey = 'org.gradle.workers.max';
      const workersValue = '2'; // Restricts Gradle to at most 2 worker processes
      const workersIndex = cfg.modResults.findIndex(item => item.key === workersKey);
      if (workersIndex >= 0) {
        cfg.modResults[workersIndex].value = workersValue;
      } else {
        cfg.modResults.push({
          type: 'property',
          key: workersKey,
          value: workersValue,
        });
      }
      console.log('[LOCAL BUILD OPTIMIZATION] Setting org.gradle.parallel=false and org.gradle.workers.max=2');
    }

    return cfg;
  });

  if (shouldPatchManifest) {
    config = withAndroidManifest(config, (cfg) => {
      const manifest = cfg.modResults;
      ensurePermission(manifest, 'android.permission.SCHEDULE_EXACT_ALARM');
      ensurePermission(manifest, 'android.permission.WAKE_LOCK');
      ensureMidnightReceiver(manifest);
      return cfg;
    });
  }

  if (shouldCopyNative) {
    config = withDangerousMod(config, [
      'android',
      async (cfg) => {
        const projectRoot = cfg.modRequest.projectRoot;
        const baseDir = path.join(
          projectRoot,
          'android',
          'app',
          'src',
          'main',
          'java',
          'com', 'dstle', 'calendar'
        );
        const widgetDir = path.join(baseDir, 'widget');
        
        fs.mkdirSync(widgetDir, { recursive: true });

        // Copy everything to widget package com.dstle.calendar.widget
        writeIfChanged(path.join(widgetDir, 'WidgetUpdateScheduler.kt'), readTemplate('WidgetUpdateScheduler.kt'));
        writeIfChanged(path.join(widgetDir, 'MidnightWidgetUpdateReceiver.kt'), readTemplate('MidnightWidgetUpdateReceiver.kt'));
        writeIfChanged(path.join(widgetDir, 'WidgetNativeModule.kt'), readTemplate('WidgetNativeModule.kt'));
        writeIfChanged(path.join(widgetDir, 'WidgetPackage.kt'), readTemplate('WidgetPackage.kt'));
        writeIfChanged(path.join(widgetDir, 'Memo.java'), readTemplate('Memo.java'));

        patchMainApplication(path.join(baseDir, 'MainApplication.kt'));

        return cfg;
      },
    ]);
  }

  return config;
};
