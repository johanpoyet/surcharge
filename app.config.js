// Configuration dynamique autour d'app.json.
//
// SANS_APPLE_SIGNIN=1 : compile sans la capacité « Sign in with Apple », pour installer l'app sur
// un iPhone avec une Personal Team gratuite (qui ne peut pas la signer). Temporaire : à retirer
// quand le compte Apple Developer payant est actif.
const { withEntitlementsPlist } = require('expo/config-plugins');

const withoutAppleSignIn = (config) =>
  withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['com.apple.developer.applesignin'];
    return mod;
  });

module.exports = ({ config }) => {
  if (process.env.SANS_APPLE_SIGNIN !== '1') return config;
  return {
    ...config,
    ios: { ...config.ios, usesAppleSignIn: false },
    // En tête : les plugins s'appliquent du dernier au premier, celui-ci passe après les autres.
    plugins: [withoutAppleSignIn, ...(config.plugins ?? [])],
  };
};
