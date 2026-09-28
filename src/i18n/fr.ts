// Tous les textes de l'interface (SPEC règle 6). Pas de lib i18n en V1 : un objet typé.
export const fr = {
  app: {
    name: 'Surcharge',
  },
  dev: {
    setupTitle: 'Soulève.\nNote.\nProgresse.',
    setupSubtitle: 'Phase 0 : Expo, NativeWind et les polices Barlow sont en place.',
  },
  units: {
    kg: 'kg',
    lb: 'lb',
  },
} as const;

export type Strings = typeof fr;
