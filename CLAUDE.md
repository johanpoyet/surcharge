# Surcharge — règles de travail

App mobile de musculation (Expo + React Native + TypeScript strict). **La référence
complète est [SPEC.md](SPEC.md)** : stack imposée, tokens, modèle de données, écrans,
logique métier et plan par phases. Les maquettes sont dans `docs/design/` (HTML = valeurs
exactes, PNG = rendu). Les choix faits quand le SPEC ne tranche pas : `docs/DECISIONS.md`.
Notes Expo générales : [AGENTS.md](AGENTS.md).

## Commandes

```bash
npm start            # serveur Metro (development build, pas Expo Go)
npm run ios          # build de dev iOS local
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint (ESLint flat config)
npm test             # Jest (jest-expo + Testing Library)
npm run format       # Prettier (+ tri des classes Tailwind)
npx expo install <pkg>   # toujours, pour des versions compatibles avec le SDK
```

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
supabase/          migrations SQL, edge functions
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
