const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

// Config Expo + identifiants de debug Sentry (rattachement des source maps).
const config = getSentryExpoConfig(__dirname);

// Migrations Drizzle (.sql) importées par src/db/migrations/migrations.js.
config.resolver.sourceExts.push('sql');

// inlineRem : 16 pour que les classes Tailwind correspondent aux pixels des maquettes (p-5 = 20 px).
module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
