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

## Phase 1

- **`react-native-svg`** (hors liste section 2) : dépendance obligatoire de `lucide-react-native`
  (seule lib d'icônes autorisée) ; sert aussi au logo et au filigrane.
- **`expo-image` et `expo-haptics` installés dès la Phase 1** (prévus section 2) : utilisés par
  PhotoSlot et par le Stepper / DifficultyPicker.
- **Tokens ajoutés depuis les maquettes** : `lineStrong` `#3A3A3A` (bordures pointillées),
  opacités du volt (`volt-subtle` / `volt-soft` / `volt-border`) et du noir sur volt,
  tailles 56 / 40 / 32 / 24 / 18 / 10, rayons 7 (badge) et 16, espacements de lettres en px
  (React Native n'a pas d'unité em).
- **Button `secondary`** : fond transparent + bordure `line` comme les maquettes (Apple / Google,
  « Modifier ») plutôt que fond `surface` du SPEC. Variantes `dark` / `darkOutline` ajoutées pour
  la carte volt « Séance du jour ».
- **Switch 48×28** (SPEC) ; les maquettes montrent 46×28. État désactivé : piste `line`,
  pastille `muted` (absent des maquettes).
- **TabBar présentationnelle** : elle reçoit onglets, onglet actif et callbacks ; le branchement
  sur la navigation Expo Router se fera avec le layout `(tabs)` en Phase 2.
- **Composants en plus de la section 5** : `Heading`, `StackedTitle` (titre multi-lignes serré
  sans rogner les accents), `Overline`, `Logo`, `BrandWatermark`, `Checkbox` (CGU) et
  `ProgressSegments` (séance, inscription).
- **Écran `/_dev/components`** : redirige vers `/` hors mode développement.
- **Tests** : Lucide est résolu vers son build CommonJS dans Jest (le build React Native est en
  `.mjs`) ; safe area et haptique sont simulés dans `jest.setup.ts`.

## Phase 2

- **Création du profil par trigger** (`0002_profil_auto.sql`) : `on_auth_user_created` insère la
  ligne `profiles` avec le prénom des métadonnées d'inscription (ou `given_name` pour
  Apple / Google, sinon le début de l'e-mail). Fonctionne pour tous les modes de connexion.
- **Migrations testées sur PGlite** avec une simulation minimale des schémas Supabase (`auth`,
  `storage`, `moddatetime`) : trigger profil, RLS lecture / écriture, `updated_at`, contraintes.
- **CLI Supabase via `npx supabase`** (non ajoutée au `package.json`) : l'installation Homebrew
  exige des Command Line Tools à jour.
- **« Confirm email » désactivé** dans Supabase : l'inscription enchaîne directement sur
  l'onboarding. Si le réglage est réactivé, l'app affiche un message au lieu de planter.
- **Onboarding enregistré directement dans Supabase** (profil + première pesée) : il suit
  l'inscription, donc en ligne. Passage par SQLite + outbox en Phase 3, avec le seed.
- **Onboarding en cours = état en mémoire** (`onboardingPending`) : si l'app est tuée pendant
  l'étape 2, on arrive sur l'accueil (comme « Passer cette étape »). Retour depuis l'étape 2 =
  déconnexion (le compte est déjà créé).
- **Mot de passe oublié** : le lien est demandé depuis l'écran de connexion avec l'e-mail saisi
  (pas d'écran dédié) ; flux PKCE, le lien rouvre `surcharge://reset-password?code=…`.
- **Apple et Google** : boutons présents mais inactifs (toast « bientôt disponible »). Il faut le
  compte Apple Developer payant (la capacité Sign in with Apple empêche de signer avec une
  Personal Team gratuite) et des identifiants OAuth Google.
- **`zodResolver` maison** (`src/lib/zodResolver.ts`) plutôt que `@hookform/resolvers`, pour ne
  pas ajouter de dépendance.
- **Types Supabase écrits à la main** (`database.types.ts`, tables utilisées seulement) ; à
  régénérer avec `npx supabase gen types` une fois le projet lié.
- **Onglets et accueil provisoires** : TabBar branchée sur Expo Router, écrans vides sauf
  l'en-tête d'accueil et la déconnexion dans le Profil.
