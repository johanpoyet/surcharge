// Retire l'autorisation « notifications push » (aps-environment) ajoutée par expo-notifications.
// L'app n'utilise que des notifications locales (fin de repos, rappels), qui n'en ont pas besoin ;
// et une Personal Team Apple gratuite ne peut pas signer une app qui la déclare.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
};
