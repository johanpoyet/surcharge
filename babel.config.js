module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // Migrations Drizzle : les fichiers .sql sont embarqués comme chaînes.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
