// URLs externes (SPEC section 11).
export const config = {
  termsUrl: 'https://johanpoyet.fr/surcharge/cgu',
  privacyUrl: 'https://johanpoyet.fr/surcharge/confidentialite',
  // Fiche App Store (écran de mise à jour obligatoire).
  appStoreUrl: 'https://apps.apple.com/app/id6817838918',
  // Identifiants OAuth Google (publics). Le secret du client Web n'est que dans Supabase.
  googleIosClientId: '785547112745-1a6oh9j6d5ri3980hkulptrkvlrlqghd.apps.googleusercontent.com',
  googleWebClientId: '785547112745-if40jslo9kbr4i60q6oquq2aquco1ioi.apps.googleusercontent.com',
} as const;
