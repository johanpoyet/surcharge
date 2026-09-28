// Design tokens « Surcharge » (SPEC section 4). Source unique : le preset Tailwind et le code
// qui a besoin de valeurs brutes (SVG, graphiques, haptique…) lisent tous ce fichier.

export const colors = {
  volt: '#D7FF3A',
  onVolt: '#0A0A0A',
  bg: '#0A0A0A',
  surface: '#151515',
  surface2: '#1F1F1F',
  line: '#2A2A2A',
  text: '#F5F5F0',
  muted: '#9A9A92',
  faint: '#6B6B65',
  diffEasy: '#D7FF3A',
  diffMedium: '#FFC53D',
  diffHard: '#FF7A2F',
  diffFail: '#FF4D4D',
  danger: '#FF6B6B',
} as const;

export const fonts = {
  // Titres, chiffres clés, boutons principaux
  display: 'BarlowCondensed_800ExtraBold_Italic',
  // Interface et texte
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodySemibold: 'Barlow_600SemiBold',
  bodyBold: 'Barlow_700Bold',
} as const;

// Tailles de police en px (display : Barlow Condensed ; texte : Barlow)
export const fontSizes = {
  display: [60, 48, 34, 30, 26, 22, 20],
  body: [17, 16, 15, 14, 13, 12, 11],
} as const;

export const radii = {
  tag: 6,
  sm: 8,
  button: 10,
  input: 12,
  cta: 14,
  card: 18,
  hero: 20,
} as const;

export const spacing = {
  screen: 20,
  auth: 24,
  block: 16,
  touch: 44,
} as const;

// Sur-titres : ≈ 0,14 em
export const overlineLetterSpacing = 0.14;

export type ColorToken = keyof typeof colors;
