import type { Config } from 'tailwindcss';

import surchargePreset from './src/theme/tailwind-preset';

export default {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  presets: [require('nativewind/preset'), surchargePreset],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
