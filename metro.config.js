const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// inlineRem : 16 pour que les classes Tailwind correspondent aux pixels des maquettes (p-5 = 20 px).
module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
