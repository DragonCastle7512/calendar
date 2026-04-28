const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * 빌드 시 assets/icons/settings.xml 파일을 
 * android/app/src/main/res/drawable/ic_settings.xml로 복사하는 플러그인
 */
module.exports = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const { projectRoot } = config.modRequest;
      
      // 안드로이드 drawable 폴더 경로
      const resDir = path.join(projectRoot, 'android/app/src/main/res/drawable');
      
      // 폴더가 없으면 생성
      if (!fs.existsSync(resDir)) {
        fs.mkdirSync(resDir, { recursive: true });
      }

      const srcFile = path.join(projectRoot, 'assets/icons/settings.xml');
      const destFile = path.join(resDir, 'ic_settings.xml');

      // 파일 복사
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, destFile);
        console.log(`[withWidgetIcon] Successfully copied settings.xml to Android resources.`);
      } else {
        console.warn(`[withWidgetIcon] Warning: Source icon not found at ${srcFile}`);
      }

      return config;
    },
  ]);
};
