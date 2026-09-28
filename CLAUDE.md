# Notre Carnet — règles de travail

## Git

- **Une branche par fonctionnalité ou correctif**, jamais de commit direct sur `main`.
  Nom de branche : `domaine/description-courte` (ex : `securite/rls-et-pin`,
  `question-du-jour/tirage-et-concurrence`, `listes/annuler-suppression`).
- **Ne jamais mentionner Claude ou une IA dans les commits ou les PR** : pas de
  ligne d'attribution ("Co-Authored-By", "Generated with", etc.), pas de mention
  dans le message. Les commits doivent avoir l'air d'avoir été écrits par Johan.
- **Demander confirmation avant de merger ou pousser sur `main`** — jamais
  automatique, même quand la branche est prête et testée.
- **Tester avant de merger** :
  - `npm run build` à chaque fois, au minimum.
  - Tout changement SQL testé sur un vrai Postgres local (ex : PGlite) avant
    d'écrire la migration définitive — pas de confiance aveugle sur la syntaxe.

## Base de données

- Toute migration incrémentale va dans `supabase/migrations/` (nommée
  `AAAAMMJJ_sujet.sql`) **et** est reportée à la fin de `supabase.sql`
  (l'installation "from scratch"), pour que les deux restent cohérents.
- Si une mise à jour touche plusieurs systèmes (SQL, edge function, secrets
  GitHub, front), documenter l'ordre de déploiement dans le README.

## Langue et style

- Commentaires de code, messages de commit, et tout texte affiché dans l'app :
  en français.
- Suivre le style déjà en place dans le fichier édité plutôt que d'imposer un
  style différent.
