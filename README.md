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

## iPhone avec une Personal Team gratuite (temporaire)

Tant que le compte Apple Developer payant n'est pas actif, la capacité « Sign in with Apple » ne
peut pas être signée. Pour installer l'app sur un iPhone malgré tout (sans le bouton Apple) :

```bash
SANS_APPLE_SIGNIN=1 npx expo prebuild --platform ios --clean
SANS_APPLE_SIGNIN=1 npx expo run:ios --device
```
