// Signature Android des builds Release avec la clé de Surcharge (APK envoyé aux testeurs).
// Clé et mots de passe hors du dépôt, dans ~/.gradle/gradle.properties :
//   SURCHARGE_STORE_FILE=/Users/…/surcharge-release.keystore
//   SURCHARGE_STORE_PASSWORD=…   SURCHARGE_KEY_ALIAS=surcharge   SURCHARGE_KEY_PASSWORD=…
// Sans ces propriétés, le build Release reste signé avec la clé de debug (tests sur émulateur).
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_CONFIG = `
        release {
            if (project.hasProperty('SURCHARGE_STORE_FILE')) {
                storeFile file(SURCHARGE_STORE_FILE)
                storePassword SURCHARGE_STORE_PASSWORD
                keyAlias SURCHARGE_KEY_ALIAS
                keyPassword SURCHARGE_KEY_PASSWORD
            }
        }`;

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;
    if (!gradle.includes('SURCHARGE_STORE_FILE')) {
      gradle = gradle.replace(
        /(signingConfigs\s*\{[\s\S]*?keyPassword 'android'\s*\n\s*\})/,
        `$1${RELEASE_CONFIG}`,
      );
      gradle = gradle.replace(
        /(release\s*\{\s*\n(?:\s*\/\/.*\n)*\s*)signingConfig signingConfigs\.debug/,
        "$1signingConfig project.hasProperty('SURCHARGE_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
      );
    }
    mod.modResults.contents = gradle;
    return mod;
  });
};
