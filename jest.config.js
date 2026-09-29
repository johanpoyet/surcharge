module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Premier lancement sans cache : compilation + chargement de sql.js (WebAssembly) peuvent dépasser 5 s.
  testTimeout: 15000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Le build « react-native » de Lucide est en .mjs, que jest-expo ne transforme pas.
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|nativewind|react-native-css-interop|standard-navigation)',
  ],
};
