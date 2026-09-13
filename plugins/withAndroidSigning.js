const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

module.exports = function withAndroidSigning(config) {
  config = withAppBuildGradle(config, (result) => {
    if (result.modResults.language !== 'groovy') return result;
    let source = result.modResults.contents;
    const signingMarker = 'signingConfigs {\n        debug {';
    if (source.includes(signingMarker) && !source.includes('RASTRO_UPLOAD_STORE_FILE')) {
      source = source.replace(
        signingMarker,
        `signingConfigs {
        release {
            if (project.hasProperty('RASTRO_UPLOAD_STORE_FILE')) {
                storeFile file(RASTRO_UPLOAD_STORE_FILE)
                storePassword RASTRO_UPLOAD_STORE_PASSWORD
                keyAlias RASTRO_UPLOAD_KEY_ALIAS
                keyPassword RASTRO_UPLOAD_KEY_PASSWORD
            }
        }
        debug {`,
      );
      const buildTypesIndex = source.indexOf('buildTypes {');
      if (buildTypesIndex >= 0) {
        const beforeBuildTypes = source.slice(0, buildTypesIndex);
        const buildTypes = source
          .slice(buildTypesIndex)
          .replace(
            /(release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
            `$1signingConfig project.hasProperty('RASTRO_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`,
          );
        source = beforeBuildTypes + buildTypes;
      }
    }
    result.modResults.contents = source;
    return result;
  });
  return withGradleProperties(config, (result) => {
    if (
      !result.modResults.some(
        (item) => item.type === 'property' && item.key === 'android.overridePathCheck',
      )
    ) {
      result.modResults.push({ type: 'property', key: 'android.overridePathCheck', value: 'true' });
    }
    return result;
  });
};
