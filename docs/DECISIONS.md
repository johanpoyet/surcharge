# Décisions

Choix faits quand le SPEC ne tranchait pas (règle 7), du plus ancien au plus récent.

## Phase 0

- **Expo SDK 57** (dernier stable au 28/09/2026), React Native 0.86, React 19.2.
- **NativeWind 4.2.7 + Tailwind 3.4** : la v4 est la version stable ; la v5 est encore en
  release candidate.
- **`react-dom` ajouté** (hors liste section 2) : dépendance paire d'`expo-router`, sans elle
  npm tire React DOM 19.3 qui entre en conflit avec React 19.2.3. Aucun usage direct.
- **`react-native-worklets`** : requis par Reanimated 4 (qui est dans la liste section 2).
- **`babel-preset-expo` en devDependency explicite** : nécessaire pour la config Babel de
  NativeWind.
- **`inlineRem: 16`** dans Metro (NativeWind utilise 14 par défaut) pour que les classes
  Tailwind standard tombent sur les pixels des maquettes.
- **Tokens → Tailwind** : `src/theme/tokens.ts` est la source unique ; `tailwind-preset.ts` en
  dérive les classes. Tailles de police nommées par leur valeur (`text-60`, `text-13`), rayons
  par usage (`rounded-tag`, `rounded-input`, `rounded-cta`, `rounded-card`, `rounded-hero`).
- **Routes dans `app/` à la racine** (et non `src/app/`) comme l'arborescence section 3.
- **Écran de test `app/index.tsx`** : temporaire, remplacé par la garde d'auth en Phase 2.
- **Icône et splash** : ceux du gabarit Expo en attendant la Phase 10 ; fond du splash déjà
  en `#0A0A0A`.
- **Prettier sans `eslint-config-prettier`** : ESLint et Prettier tournent séparément
  (`npm run lint`, `npm run format`) pour ne pas ajouter de dépendance.
- **`expo-build-properties` + `ios.enableSceneSupport: true`** : Xcode 27 (SDK iOS 27) refuse de
  lancer une app sans cycle de vie UIScene. Sur le SDK 57, Expo (≥ 57.0.23) le rend activable
  par cette propriété ; il devient le comportement par défaut en SDK 58 (retirer alors
  l'option). Après changement : `npx expo prebuild --clean`.
- **Interligne des gros titres** : sur iOS, un `lineHeight` inférieur à la taille de police
  (ex. 55 px pour 60 px, comme la maquette de connexion) rogne les accents des majuscules
  (« SOULÈVE »). À traiter dans le composant de titre en Phase 1 (une ligne par `Text`).
