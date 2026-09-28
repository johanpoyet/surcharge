// Design tokens « Surcharge » (SPEC section 4). Source unique : le preset Tailwind et le code
// qui a besoin de valeurs brutes (SVG, icônes, graphiques…) lisent tous ce fichier.

export const colors = {
  volt: '#D7FF3A',
  onVolt: '#0A0A0A',
  bg: '#0A0A0A',
  surface: '#151515',
  surface2: '#1F1F1F',
  line: '#2A2A2A',
  // Bordures en pointillé (emplacements photo, « + Ajouter une série ») : présent dans les maquettes
  lineStrong: '#3A3A3A',
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

// Tailles de police en px. SPEC + tailles relevées dans les maquettes (56, 40, 32, 24, 18, 10).
export const fontSizes = {
  display: [60, 56, 48, 40, 34, 32, 30, 26, 24, 22, 20],
  body: [18, 17, 16, 15, 14, 13, 12, 11, 10],
} as const;

export const radii = {
  tag: 6,
  badge: 7,
  sm: 8,
  button: 10,
  input: 12,
  cta: 14,
  tile: 14,
  cardSm: 16,
  card: 18,
  hero: 20,
} as const;

export const spacing = {
  screen: 20,
  auth: 24,
  block: 16,
  touch: 44,
} as const;

// En px (React Native n'a pas d'unité em) : 0,14 em d'un sur-titre de 13 px,
// 0,1 em d'un en-tête de tableau ou libellé de champ de 11-12 px.
export const letterSpacings = {
  overline: 1.8,
  wide: 1.2,
} as const;

// Opacités du volt utilisées sur fond sombre (bandeau de conseil, pastilles, fond d'emplacement photo)
export const voltAlpha = {
  subtle: 'rgba(215,255,58,0.06)',
  soft: 'rgba(215,255,58,0.12)',
  border: 'rgba(215,255,58,0.35)',
} as const;

// Noir transparent sur fond volt (filigrane et tag de la carte « Séance du jour »)
export const onVoltAlpha = {
  watermark: 'rgba(10,10,10,0.1)',
  tag: 'rgba(10,10,10,0.12)',
} as const;

// Tailles d'icône (Lucide, trait 2 px)
export const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export type ColorToken = keyof typeof colors;
