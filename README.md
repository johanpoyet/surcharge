# Surcharge

App iOS / Android de suivi de musculation : noter chaque série en quelques secondes et voir sa
progression. Spécification complète : [SPEC.md](SPEC.md). Choix d'implémentation :
[docs/DECISIONS.md](docs/DECISIONS.md).

Expo SDK 57 · React Native · TypeScript strict · Expo Router · NativeWind · SQLite (Drizzle) ·
Supabase (Postgres, Auth, Storage, Edge Functions).

## Installation

```bash
npm install
cp .env.example .env        # URL et clé « publishable » du projet Supabase
npx expo prebuild --platform ios --clean
npm run ios                 # simulateur (development build, pas Expo Go)
npx expo run:ios --device   # iPhone branché
```

Commandes : `npm run typecheck`, `npm run lint`, `npm test`, `npm run format`,
`npm run db:generate` (migrations SQLite après une modification de `src/db/schema.ts`).

## Base de données Supabase

Migrations dans `supabase/migrations/`, testées sur Postgres local (PGlite) avant d'être appliquées :

```bash
npx supabase login
npx supabase link --project-ref <ref du projet>
npx supabase db push
```

Réglages Auth : fournisseur Email actif, « Confirm email » désactivé, Site URL `surcharge://`,
Redirect URLs `surcharge://**`.

## Ordre de déploiement

Quand une évolution touche plusieurs systèmes, déployer dans cet ordre :

1. **Migrations SQL** : `npx supabase db push` (l'ancienne version de l'app doit continuer à marcher).
2. **Edge Functions** : `npx supabase functions deploy delete-account --use-api`
   (la clé service role est fournie automatiquement par Supabase, jamais dans l'app).
3. **Variables EAS** (builds cloud : le `.env` local n'est pas envoyé) :
   `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` dans les environnements
   `development`, `preview` et `production` (`eas env:create`).
4. **App** : build EAS (`eas build --profile preview --platform ios` pour TestFlight), ou mise à
   jour OTA si seul le JavaScript change.

## Builds EAS

Profils dans `eas.json` : `development` (client de dev), `development-simulator`, `preview`
(TestFlight / test interne), `production`. Prérequis : compte Expo (`eas login`, `eas init`), compte
Apple Developer, puis `eas build` et `eas submit`.

## APK Android (testeurs)

Prérequis : Android Studio (SDK), `brew install openjdk@17`, clé `~/surcharge-release.keystore` et
`SURCHARGE_STORE_FILE`, `SURCHARGE_STORE_PASSWORD`, `SURCHARGE_KEY_ALIAS`,
`SURCHARGE_KEY_PASSWORD` dans `~/.gradle/gradle.properties`.

```bash
export JAVA_HOME=$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=$HOME/Library/Android/sdk
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
# → android/app/build/outputs/apk/release/app-release.apk
```

Augmenter `android.versionCode` dans `app.json` à chaque nouvel APK.

## Mises à jour OTA (EAS Update)

Correctif **JavaScript uniquement** (textes, écrans, logique) : pas de nouveau build ni de
vérification Apple.

```bash
npm run update:prod -- "fix(planning): description"
```

Le script publie pour iOS puis Android sur le canal `production` (environnement EAS `production`) puis envoie les source
maps à Sentry. Seuls les builds de la **même version** (`runtimeVersion` = `version` d'`app.json`)
reçoivent la mise à jour, téléchargée au lancement et appliquée au lancement suivant. Tout
changement natif (module, permission, plugin, icône) demande un build et une nouvelle version.

## Sentry (rapports de plantage)

Organisation `johan-ea`, projet `surcharge`, région UE (`de.sentry.io`). Actif uniquement dans les
builds Release. Les source maps et symboles sont envoyés pendant le build Release ; il faut un jeton
d'organisation Sentry (secret, jamais commité) :

- build local : fichier `.env.sentry-build-plugin` à la racine, `SENTRY_AUTH_TOKEN=…` ;
- build EAS : `eas env:create --name SENTRY_AUTH_TOKEN --visibility secret`.

Sans jeton, les builds Debug passent ; un build Release échoue (ou `SENTRY_DISABLE_AUTO_UPLOAD=true`).

## Structure

```
app/               écrans (Expo Router)
src/components     design system (ui) et graphiques (charts)
src/features       logique par domaine : exercises, templates, workout, planning, stats, profile…
src/db             schéma Drizzle, migrations SQLite, seed
src/sync           outbox, push, pull, photos
supabase/          migrations Postgres, Edge Function delete-account
plugins/           plugins de configuration Expo locaux
```

## Pages publiques (johanpoyet.fr/surcharge)

Politique de confidentialité, conditions d'utilisation et assistance, exigées par l'App Store.
Sources : `docs/legal/*.md` ; pages générées dans `website/surcharge/`, servies par nginx sur le
VPS (`website/nginx/johanpoyet.fr.conf`, HTTPS Let's Encrypt renouvelé automatiquement).

```bash
npm i --no-save marked@15 && node website/build.mjs      # régénérer les pages
rsync -avz --delete -e "ssh -i ~/.ssh/planify_vps_ed25519" \
  website/surcharge ubuntu@51.210.180.130:/home/ubuntu/sites/johanpoyet.fr/   # publier
```

La racine `johanpoyet.fr` redirige vers l'assistance en attendant le portfolio.
