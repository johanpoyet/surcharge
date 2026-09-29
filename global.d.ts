// Import de global.css (NativeWind) depuis app/_layout.tsx.
declare module '*.css';

// Migrations Drizzle embarquées par babel-plugin-inline-import.
declare module '*.sql' {
  const content: string;
  export default content;
}
