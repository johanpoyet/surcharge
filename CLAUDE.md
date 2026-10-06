# Surcharge — règles de travail

App mobile de musculation (Expo + React Native + TypeScript strict). **La référence
complète est [SPEC.md](SPEC.md)** : stack imposée, tokens, modèle de données, écrans,
logique métier et plan par phases. Les maquettes sont dans `docs/design/` (HTML = valeurs
exactes, PNG = rendu). Les choix faits quand le SPEC ne tranche pas : `docs/DECISIONS.md`.
Notes Expo générales : [AGENTS.md](AGENTS.md).
Installation, déploiement, builds et site : [README.md](README.md). Textes App Store :
`docs/app-store/` ; pages légales : `docs/legal/` (publiées sur johanpoyet.fr).

## Commandes

```bash
npm start            # serveur Metro (development build, pas Expo Go)
npm run ios          # build de dev iOS local
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint (ESLint flat config)
npm test             # Jest (jest-expo + Testing Library)
npm run format       # Prettier (+ tri des classes Tailwind)
npx expo install <pkg>   # toujours, pour des versions compatibles avec le SDK
npm run db:generate  # migration SQLite locale (drizzle-kit) après changement de src/db/schema.ts
npm run update:prod -- "fix(x): …"   # mise à jour OTA iOS + Android (canal production)
npx expo prebuild --platform ios --clean   # après TOUT changement d'app.json / plugins
```

Shell non interactif : Homebrew n'est pas dans le PATH → `export PATH=/opt/homebrew/bin:$PATH`
(CocoaPods, JDK 17) et `LANG=en_US.UTF-8` pour `pod install`.

Fin de phase : `typecheck`, `lint` et `test` passent, puis on s'arrête pour validation.

## Conventions

- Tout texte d'interface en français, dans `src/i18n/fr.ts` (jamais en dur dans un écran).
- Aucune couleur ni taille en dur : classes NativeWind générées depuis
  `src/theme/tokens.ts` (`bg-volt`, `text-60`, `font-display`, `rounded-card`, `px-screen`…).
  Pour une valeur brute (SVG, graphiques), importer `colors` depuis `@/theme/tokens`.
- `inlineRem: 16` : les classes Tailwind standard correspondent aux pixels (p-5 = 20 px).
- Polices : `font-display` (Barlow Condensed 800 italique), `font-body`,
  `font-body-medium`, `font-body-semibold`, `font-body-bold`.
- Pas de `any`, composants fonctionnels et hooks. Alias `@/` → `src/`.
- Pas de nouvelle dépendance hors SPEC section 2 sans demander.

## Arborescence

```
app/               routes Expo Router ((auth), (tabs), workout, templates, exercises)
src/components/ui  design system          src/db        Drizzle + SQLite
src/features/<domaine>/repository.ts, hooks.ts
src/sync           outbox, push, pull      src/stores    Zustand
src/theme          tokens + preset Tailwind  src/i18n    fr.ts
supabase/          migrations SQL, edge functions, templates (e-mail), demo (seed compte démo)
src/monitoring     Sentry                  plugins/      config plugins locaux (Expo)
scripts/           update-production.sh    website/      pages légales (build + nginx)
```

## Git

- **Une branche par fonctionnalité ou correctif**, jamais de commit direct sur `main`.
  Nom de branche : `domaine/description-courte` (ex : `setup/phase-0`, `seance/stepper`).
- Messages en français, format `type(scope): message` (ex. `feat(seance): stepper de charge`).
- **Ne jamais mentionner Claude ou une IA dans les commits ou les PR** : pas de
  ligne d'attribution ("Co-Authored-By", "Generated with", etc.), pas de mention
  dans le message. Les commits doivent avoir l'air d'avoir été écrits par Johan.
- **Demander confirmation avant de merger ou pousser sur `main`** — jamais
  automatique, même quand la branche est prête et testée.
- Tout changement SQL testé sur un vrai Postgres local (ex : PGlite) avant d'écrire la
  migration définitive dans `supabase/migrations/`.

## État du projet (06/10/2026)

- V1 (SPEC.md, phases 0 à 10) terminée. **iOS** : 1.0.0 publiée sur l'App Store ; 1.1.0
  (build 7 : Live Activity, EAS Update, correctifs) soumise, sortie automatique après validation.
  **Android** : APK signé distribué à quelques amis (pas de Play Store).
- Les mises à jour JavaScript passent par EAS Update (`runtimeVersion` = version d'app.json :
  seuls les builds de la même version les reçoivent). Tout changement natif (module, plugin,
  permission, icône, app.json) = nouvelle version + build + vérification Apple + nouvel APK.

## Comptes et identifiants (publics)

- Bundle / package `fr.johanpoyet.surcharge`, Apple Team `R7GAYTSBWH` (compte payant), App Store
  Connect app `6817838918`, nom « Surcharge : carnet de muscu ».
- EAS `@johanpoyet/surcharge` (projectId dans app.json), canal `production`.
- Supabase prod `myabomycwxyyorrxozbv` (Paris), organisation en Pro ; clés dans `.env.production`
  (ignoré, **ne pas lire**). Supabase **dev** `bmstymcjxpustfzyjxpy` : `.env` et CLI liée. Règles de
  protection de la prod : SPEC_V2.md §0.1. Expo charge `.env.production` pour tout bundle de
  production (Release, TestFlight, `eas update`) : un build Release de la V2 vise donc la prod
  sauf si les variables de `.env` sont exportées dans le shell.
- Sentry org `johan-ea`, projet `surcharge` (UE) ; Google OAuth iOS / Web dans `src/config.ts`,
  client Android lié à la SHA-1 de la clé de release.
- Contact public `surcharge@johanpoyet.fr` (redirection OVH ; ne jamais exposer l'adresse
  personnelle). Compte de démo Apple : `demo.surcharge@johanpoyet.fr` (mot de passe connu de
  Johan seulement, ne pas le modifier pendant une vérification Apple).

## Secrets : jamais dans le dépôt, jamais demandés à Johan

Johan les saisit lui-même. Clé `service_role` / secret Supabase (Edge Functions uniquement),
secret du client OAuth Web (Supabase), clé API Resend (SMTP Supabase), jeton Sentry
(`.env.sentry-build-plugin`), clé Android `~/surcharge-release.keystore` + mots de passe
(`~/.gradle/gradle.properties`, `SURCHARGE_*`), mots de passe Apple / trousseau / base.

## Livraison

- **TestFlight** : pas d'EAS Build (file gratuite trop lente). Prebuild, puis `CFBundleVersion`
  = N dans `ios/Surcharge/Info.plist` **et** `ios/ExpoWidgetsTarget/Info.plist` (N > dernier
  build), `xcodebuild archive` puis `-exportArchive` (method `app-store-connect`, destination
  `upload`, team `R7GAYTSBWH`). Dernier build envoyé : **7**. Prévoir ~25 min (l'envoi des
  symboles à Sentry attend le traitement serveur ~12 min : ce n'est pas un blocage).
- **APK Android** : voir README (JDK 17 obligatoire, `-PreactNativeArchitectures=arm64-v8a`,
  incrémenter `android.versionCode`, actuellement 1).
- **Supabase** : migrations `npx supabase db push` (ou SQL Editor) après test PGlite ; derniers
  numéros : `0005`. Réglages faits dans le tableau de bord (non versionnés) : Confirm email
  désactivé, Skip nonce checks (Google), SMTP Resend + modèle « Reset Password »
  (`supabase/templates/recovery.html`), longueur min. du mot de passe 8, Redirect URLs
  `surcharge://**`.
- **Pages légales** : modifier `docs/legal/*.md`, régénérer et publier (README) à chaque nouveau
  service tiers ou nouvelle donnée collectée ; mettre aussi à jour le questionnaire de
  confidentialité App Store (`docs/app-store/fiche.md`).

## Pièges connus

- Toute modification d'app.json ou d'un plugin exige `expo prebuild --clean` (sinon autorisations
  manquantes → crash, ex. appareil photo). Vérifier ensuite qu'`aps-environment` est absent des
  entitlements (`plugins/withoutPushEntitlement.js`).
- Après un build Release, erreurs de link ou crash natif en Debug : réinstaller `ios/Pods`.
  Simulateur sans `libSystem` : redémarrer CoreSimulator.
- Tester le hors-ligne en build **Release** (le build de dev dépend de Metro). Sur simulateur :
  `SENTRY_DISABLE_AUTO_UPLOAD=true npx expo run:ios --configuration Release --no-bundler`.
- Xcode 27 : l'app Simulator est remplacée par **DeviceHub** (pas de glisser-déposer) ; utiliser
  `xcrun simctl io <id> screenshot`, `simctl addmedia`, `simctl status_bar … override`.
- « Account credentials have expired » à l'export : rouvrir Xcode → Settings → Accounts.
- Écrans en modale plein écran : utiliser `FullScreen` (marges prises sur la fenêtre), pas
  `SafeAreaView` (marges parfois à 0 pendant l'animation d'ouverture).
- Couleur d'un `Heading` : passer `tone`, pas une classe de couleur dans `className`.
- macOS ne distingue pas la casse : pas deux fichiers dont le nom ne diffère que par une
  majuscule (`restActivity.ts` / `RestActivity.tsx`).
- Jest : un module qui ouvre la base (`@/db/client`) ou un SDK natif (Sentry) casse le test qui
  l'importe → isoler la logique pure dans un fichier à part ou `jest.mock`.
- Code d'un composant `'widget'` (Live Activity) : isolé, rien d'importable ; couleurs et textes
  passés en props.
- `eas update --platform all` échoue (pas de version web) : le script publie iOS puis Android.
- Gradle avec le JDK 25 d'Android Studio : échec CMake (« restricted method ») → JDK 17 Homebrew.
- `npm audit` : alertes surtout dans l'outillage (Metro, Jest) ; corrections liées aux mises à
  jour d'Expo, pas de `npm audit fix --force`.
