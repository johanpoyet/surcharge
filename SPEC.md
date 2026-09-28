# SURCHARGE — Spécification de l'application (à destination de Claude Code)

> **Comment utiliser ce fichier**
> Place ce fichier à la racine du dépôt sous le nom `SPEC.md`. Au démarrage, dis à Claude Code :
> *« Lis SPEC.md en entier, puis attaque la Phase 0. Arrête-toi à la fin de chaque phase pour que je valide. »*
> Les maquettes sont dans le canvas « App muscu – Surcharge » (onglet **Surcharge V1**). Exporte chaque écran en PNG dans `docs/design/` (noms indiqués en section 8) pour que Claude Code puisse les regarder.

---

## 0. Règles de travail pour Claude Code

1. **Travaille phase par phase** (section 12). À la fin de chaque phase : l'app compile, `npm run typecheck` et `npm run lint` passent, les tests passent, puis **arrête-toi et résume** ce qui a été fait et ce qu'il faut tester à la main.
2. **Un commit par étape logique**, messages en français, format `type(scope): message` (ex. `feat(seance): stepper de charge`).
3. **Ne rajoute pas de dépendance** hors de la liste de la section 2 sans me demander et sans expliquer pourquoi.
4. **TypeScript strict**, pas de `any`. Composants fonctionnels, hooks.
5. **Respecte les maquettes** (section 8) et les tokens (section 4) : aucune couleur ou taille « en dur » dans les écrans, tout passe par le thème.
6. **Tout le texte de l'interface est en français**, centralisé dans `src/i18n/fr.ts` (pas de lib i18n en V1, juste un objet typé).
7. Quand une information manque, **choisis l'option la plus simple**, note-la dans `docs/DECISIONS.md` et continue.
8. En Phase 0, crée un `CLAUDE.md` court (commandes, conventions, arborescence) qui renvoie vers ce `SPEC.md`.

---

## 1. Le produit

**Surcharge** est une app mobile (iOS d'abord, Android ensuite) pour les gens qui font de la musculation. Promesse : *noter chaque série en quelques secondes et voir clairement sa progression.*

Fonctionnalités V1 :
- Créer ses **exercices** (nom, muscle, équipement, **photo** pour reconnaître la machine, pas des boutons + / −).
- Créer ses **séances types** (liste d'exercices avec nombre de séries, reps cibles, repos).
- **Planifier** sa semaine / son mois : l'app sait quelle séance faire le jour où on l'ouvre.
- **Séance en cours** : pour chaque série, charge et reps via boutons + / −, et **ressenti** (facile / moyen / difficile / échec). Affichage de la séance précédente pour comparer. Chrono de repos automatique.
- **Stats et graphiques** : progression par exercice (charge max, volume, reps), poids corporel, jours à la salle, nombre de séances, régularité, records.
- **Conseil de charge** basé sur le ressenti de la séance précédente.

Contraintes clés :
- **Offline-first** : le réseau est souvent mauvais en salle. Aucune action pendant une séance ne doit attendre le réseau.
- **Rapidité de saisie** : valider une série = 1 à 3 taps.
- Publication **App Store** puis **Google Play**.

---

## 2. Stack technique (imposée)

| Besoin | Choix |
|---|---|
| Framework | **Expo** (dernier SDK stable) + **React Native** + **TypeScript strict** |
| Navigation | **Expo Router** (routes par fichiers, groupes `(auth)` / `(tabs)`) |
| Build / store | **EAS Build**, **EAS Submit**, **EAS Update** ; development builds (pas Expo Go, car Apple/Google Sign-In) |
| Styles | **NativeWind** (Tailwind) avec tokens section 4 |
| Polices | `@expo-google-fonts/barlow-condensed`, `@expo-google-fonts/barlow` |
| Base locale | **expo-sqlite** + **drizzle-orm** (driver expo-sqlite, migrations `drizzle-kit`, `useLiveQuery`) |
| Backend | **Supabase** : Postgres, Auth, Storage, Edge Functions |
| Client Supabase | `@supabase/supabase-js` + `@react-native-async-storage/async-storage` pour la session |
| Auth sociale | `expo-apple-authentication` ; `@react-native-google-signin/google-signin` → `supabase.auth.signInWithIdToken` |
| État UI | **Zustand** (séance en cours, chrono) |
| Réseau | `@react-native-community/netinfo` (déclencher la synchro) |
| IDs | `expo-crypto` → `randomUUID()` côté client (création offline) |
| Graphiques | **victory-native** (+ `@shopify/react-native-skia`, `react-native-reanimated`, `react-native-gesture-handler`) |
| Photos | `expo-image-picker`, `expo-image-manipulator` (compression), `expo-image` (affichage/cache), `expo-file-system` |
| Notifications | `expo-notifications` (fin de repos, rappels de séance) |
| Retour haptique | `expo-haptics` |
| Dates | `date-fns` (+ locale `fr`) |
| Formulaires | `react-hook-form` + `zod` |
| Qualité | ESLint + Prettier, **Jest** + `@testing-library/react-native` |
| Monitoring | `@sentry/react-native` (Phase 10) |

---

## 3. Arborescence cible

```
app/
  _layout.tsx                 # polices, thème, providers, garde d'auth
  (auth)/
    login.tsx
    signup.tsx                # étape 1 : compte
    onboarding.tsx            # étape 2 : profil
  (tabs)/
    _layout.tsx               # tab bar custom (5 emplacements, + central)
    index.tsx                 # Accueil
    sessions/index.tsx        # Séances : onglets Planning | Mes séances
    exercises/index.tsx       # Bibliothèque
    profile.tsx
  workout/
    [sessionId].tsx           # Séance en cours (modal plein écran)
    summary/[sessionId].tsx   # Récap de fin de séance
  templates/
    new.tsx, [id].tsx         # Créer / modifier une séance type
    pick-exercises.tsx        # Choix des exercices (modal)
  exercises/
    new.tsx, [id].tsx, [id]/edit.tsx
src/
  components/ui/              # design system (section 5)
  components/charts/
  db/
    schema.ts                 # schéma Drizzle (miroir local de Supabase)
    migrations/
    client.ts
    seed.ts                   # bibliothèque d'exercices par défaut
  features/                   # logique par domaine : exercises, templates, workout, planning, stats, profile
    <domaine>/repository.ts   # lecture/écriture SQLite (+ ajout à l'outbox)
    <domaine>/hooks.ts
  sync/
    outbox.ts, push.ts, pull.ts, photos.ts, index.ts
  lib/supabase.ts, lib/format.ts (nombres FR : 82,5 kg)
  stores/workoutStore.ts
  theme/tokens.ts, tailwind preset
  i18n/fr.ts
supabase/
  migrations/0001_init.sql    # section 6
  functions/delete-account/index.ts
docs/
  design/                     # PNG des maquettes
  DECISIONS.md
```

---

## 4. Design tokens (identité « Surcharge »)

**Couleurs**
| Token | Valeur | Usage |
|---|---|---|
| `volt` | `#D7FF3A` | accent principal, CTA, valeurs clés |
| `onVolt` | `#0A0A0A` | texte/icônes sur fond volt |
| `bg` | `#0A0A0A` | fond d'écran |
| `surface` | `#151515` | cartes |
| `surface2` | `#1F1F1F` | éléments dans une carte, boutons secondaires |
| `line` | `#2A2A2A` | bordures, pistes de graphiques |
| `text` | `#F5F5F0` | texte principal |
| `muted` | `#9A9A92` | texte secondaire |
| `faint` | `#6B6B65` | jours de repos, placeholders |
| `diffEasy` | `#D7FF3A` | ressenti Facile (lettre **F**) |
| `diffMedium` | `#FFC53D` | ressenti Moyen (**M**) |
| `diffHard` | `#FF7A2F` | ressenti Difficile (**D**) |
| `diffFail` | `#FF4D4D` | ressenti Échec (**✕**) |
| `danger` | `#FF6B6B` | actions destructives (texte) |

Le ressenti n'est **jamais indiqué par la couleur seule** : toujours lettre ou libellé en plus.

**Typographie**
- Titres, chiffres clés, boutons principaux : **Barlow Condensed ExtraBold Italic (800)**, souvent en MAJUSCULES. Tailles : 60 / 48 / 34 / 30 / 26 / 22 / 20.
- Interface et texte : **Barlow** 400 / 500 / 600 / 700. Tailles : 17 / 16 / 15 / 14 / 13 / 12 / 11.
- Sur-titres : Barlow 600-700, 12-13 px, MAJUSCULES, `letterSpacing` ≈ 0.14 em, couleur `muted`.

**Formes et espacements**
- Rayons : 6 (tags), 8, 10 (petits boutons), 12 (inputs, boutons), 14 (CTA), 16-18 (cartes), 20 (grande carte « Séance du jour »).
- Marges d'écran : 20 px (24 px sur les écrans d'auth). Espacement entre blocs : 12 à 16 px.
- Zones tactiles **≥ 44 px**.
- Motif de marque : 3 barres inclinées croissantes (logo), réutilisé en grand filigrane sur le fond de certaines cartes.

**Logo (SVG, viewBox 48×48)**
```svg
<rect width="48" height="48" rx="12" fill="#D7FF3A"/>
<g transform="skewX(-12) translate(8 0)" fill="#0A0A0A">
  <rect x="8" y="25" width="7" height="13" rx="2"/>
  <rect x="18" y="18" width="7" height="20" rx="2"/>
  <rect x="28" y="10" width="7" height="28" rx="2"/>
</g>
```

---

## 5. Composants du design system (`src/components/ui`)

- **Button** : `primary` (fond volt, Barlow Condensed italic majuscules, h 58), `secondary` (fond surface, bordure line), `outline` (bordure volt, texte volt), `ghost` (texte seul). Variante `withArrow` (carré noir avec flèche à droite, écran de connexion).
- **IconButton** : 44×44, rayon 12, fond surface. `aria`/`accessibilityLabel` obligatoire.
- **Card** : fond surface, rayon 18, padding 16.
- **Stepper** : `[−] valeur unité [+]`. Le « − » est sur surface2, le « + » sur volt. Prend `step`, `min`, `max`, `format`. Appui long = répétition accélérée. Haptique légère à chaque pas.
- **DifficultyPicker** : 4 boutons (Facile / Moyen / Difficile / Échec), le sélectionné est rempli avec sa couleur.
- **DifficultyBadge** : carré 28 px, lettre F / M / D / ✕ sur la couleur du ressenti.
- **Chip** (filtre, sélection simple ou multiple), **SegmentedControl** (Sem./Mois, 1M/3M/1A, Charge/Volume/Reps), **Tabs** soulignés (Planning | Mes séances).
- **TextField** (label au-dessus, h 52, rayon 12, bordure volt au focus).
- **StatTile** (gros chiffre condensé + légende muted).
- **Switch** (48×28, piste volt quand actif).
- **TabBar** custom : Accueil, Séances, **+ central surélevé (volt, 58×58)**, Exercices, Profil. Actif = volt.
- **PhotoSlot** (placeholder pointillé avec icône appareil photo).
- **Toast** discret pour les confirmations.

Icônes : trait 2 px, arrondies (utiliser `lucide-react-native` si besoin, c'est la seule lib d'icônes autorisée).

---

## 6. Modèle de données

### 6.1 Principes
- **Tous les IDs sont des UUID générés côté client.**
- Toutes les tables métier ont `user_id`, `created_at`, `updated_at`, `deleted_at` (**suppression douce**, indispensable pour la synchro).
- Les **poids sont stockés en kg** (`numeric`). La conversion en lb ne se fait qu'à l'affichage.
- Le schéma SQLite (Drizzle) est le **miroir** du schéma Supabase, avec en plus les colonnes locales `dirty` (0/1) et la table `outbox`.

### 6.2 Migration Supabase `supabase/migrations/0001_init.sql`

```sql
create extension if not exists moddatetime schema extensions;

create type difficulty   as enum ('easy','medium','hard','fail');
create type muscle_group as enum ('chest','back','shoulders','legs','arms','abs','other');
create type equipment    as enum ('barbell','dumbbell','machine','cable','bodyweight','other');
create type goal         as enum ('muscle','strength','fat_loss','fitness');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  first_name text not null,
  goal goal,
  sessions_per_week smallint check (sessions_per_week between 1 and 7),
  weight_unit text not null default 'kg' check (weight_unit in ('kg','lb')),
  default_rest_seconds int not null default 120,
  reminders_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table exercises (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  muscle muscle_group not null,
  equipment equipment not null,
  weight_step numeric(5,2) not null default 2.5,
  photo_path text,               -- chemin dans le bucket exercise-photos
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table workout_templates (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table template_exercises (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  template_id uuid not null references workout_templates on delete cascade,
  exercise_id uuid not null references exercises,
  position int not null,
  target_sets smallint not null default 3 check (target_sets between 1 and 20),
  target_reps_min smallint,
  target_reps_max smallint,
  rest_seconds int not null default 120,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Modèle de semaine : quelle séance tel jour (1 = lundi … 7 = dimanche)
create table weekly_schedule (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  template_id uuid not null references workout_templates,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index weekly_schedule_unique on weekly_schedule(user_id, weekday) where deleted_at is null;

-- Exceptions à une date précise (template_id null = repos forcé)
create table schedule_overrides (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  template_id uuid references workout_templates,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index schedule_overrides_unique on schedule_overrides(user_id, date) where deleted_at is null;

create table sessions (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  template_id uuid references workout_templates,
  name text not null,             -- copie du nom au moment de la séance
  started_at timestamptz not null,
  ended_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table session_sets (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  session_id uuid not null references sessions on delete cascade,
  exercise_id uuid not null references exercises,
  exercise_order smallint not null,   -- ordre de l'exercice dans la séance
  set_number smallint not null,       -- 1, 2, 3…
  weight_kg numeric(6,2) not null,
  reps smallint not null check (reps >= 0),
  difficulty difficulty,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index session_sets_exercise on session_sets(user_id, exercise_id, completed_at desc);

create table body_weights (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  measured_on date not null,
  weight_kg numeric(5,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index body_weights_unique on body_weights(user_id, measured_on) where deleted_at is null;

-- updated_at automatique
do $$
declare t text;
begin
  foreach t in array array['profiles','exercises','workout_templates','template_exercises',
    'weekly_schedule','schedule_overrides','sessions','session_sets','body_weights']
  loop
    execute format('create trigger set_updated_at before update on %I
      for each row execute procedure extensions.moddatetime(updated_at)', t);
  end loop;
end $$;

-- Row Level Security : chacun ne voit que ses données
alter table profiles enable row level security;
create policy "own profile" on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['exercises','workout_templates','template_exercises',
    'weekly_schedule','schedule_overrides','sessions','session_sets','body_weights']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "own rows" on %I for all
      using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Photos : bucket privé, un dossier par utilisateur
insert into storage.buckets (id, name, public) values ('exercise-photos','exercise-photos', false)
  on conflict do nothing;
create policy "own photos" on storage.objects for all
  using (bucket_id = 'exercise-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'exercise-photos' and (storage.foldername(name))[1] = auth.uid()::text);
```

### 6.3 Tables locales supplémentaires (SQLite uniquement)
- `outbox` : `id`, `table_name`, `row_id`, `op` (`upsert` | `delete`), `created_at`, `attempts`.
- `sync_state` : `table_name`, `last_pulled_at`.
- `exercises.photo_local_uri` : chemin du fichier local (la photo s'affiche depuis le local même hors ligne).

---

## 7. Offline et synchronisation (V1 simple)

- **SQLite est la source de vérité de l'interface.** Les écrans lisent via `useLiveQuery` ; ils ne lisent jamais Supabase directement.
- **Écriture** : chaque repository écrit dans SQLite **et** ajoute une ligne dans `outbox`, dans la même transaction.
- **Push** (au démarrage, au retour du réseau via NetInfo, à la fin d'une séance, et toutes les 60 s si l'outbox n'est pas vide) : regroupe l'outbox par table et fait des `upsert` Supabase par lots de 100, en respectant l'ordre des dépendances (exercises → templates → template_exercises → schedule → sessions → session_sets). Les lignes réussies sortent de l'outbox. En cas d'erreur, on incrémente `attempts` avec un backoff et on ne bloque jamais l'UI.
- **Pull** (au login et au démarrage) : pour chaque table, on récupère `updated_at > last_pulled_at` et on fait un upsert local, sauf si la ligne locale a `dirty = 1`. Règle de conflit : **la dernière écriture gagne**.
- **Photos** : à la sélection, on compresse (côté le plus long 1080 px, JPEG qualité 0.7), on copie dans `FileSystem.documentDirectory`, on stocke `photo_local_uri`, puis on envoie en tâche de fond vers `exercise-photos/{user_id}/{exercise_id}.jpg` et on met à jour `photo_path`. Sur un nouvel appareil, on télécharge à la demande avec une URL signée.
- Afficher un petit indicateur discret dans le Profil : « Synchronisé » / « X modifications en attente ».

---

## 8. Écrans (se référer aux maquettes)

Exporte les artboards du canvas dans `docs/design/` avec ces noms. Chaque écran doit reproduire fidèlement la maquette. Les données affichées dans les maquettes sont des exemples.

| Fichier maquette | Route | Contenu et comportements |
|---|---|---|
| `connexion.png` | `(auth)/login` | E-mail + mot de passe, « Mot de passe oublié ? » (reset Supabase par e-mail), bouton Se connecter, Apple, Google, lien vers inscription. |
| `inscription-compte.png` | `(auth)/signup` | Étape 1/2 : prénom, e-mail, mot de passe (8 caractères min., jauge de solidité), case CGU obligatoire, Apple, Google. |
| `inscription-profil.png` | `(auth)/onboarding` | Étape 2/2 : poids actuel (Stepper 0,1 kg, bascule kg/lb), objectif (4 choix), séances par semaine (1 à 6+). Enregistre `profiles` et une première `body_weights`. « Passer cette étape » possible. À la fin : seed de la bibliothèque d'exercices. |
| `accueil.png` | `(tabs)/index` | Voir 8.1. |
| `seance-en-cours.png` | `workout/[sessionId]` | Voir 8.2. |
| `planning-semaine.png` / `planning-mois.png` | `(tabs)/sessions` (onglet Planning) | Voir 8.3. |
| *(pas de maquette)* | `(tabs)/sessions` (onglet Mes séances) | Liste des séances types (nom, nb d'exos, durée estimée) : ouvrir, dupliquer, supprimer, démarrer. Même style que la liste des exercices. |
| `creer-seance.png` | `templates/new`, `templates/[id]` | Nom, jours au planning (7 boutons L M M J V S D qui écrivent dans `weekly_schedule`), liste d'exercices réordonnable (glisser via la poignée) avec Stepper séries, reps cibles (« 8–10 »), repos (« 2:00 »), suppression. Total « 13 séries · ~55 min ». |
| `choisir-exercices.png` | `templates/pick-exercises` | Recherche, filtres par muscle, sélection multiple, entrée « Créer un exercice », bouton « Ajouter N exercices ». |
| `exercices.png` | `(tabs)/exercises` | Recherche, filtres, tri par dernière utilisation. Chaque ligne : photo, nom, muscle et date, charge max, tendance (↑ record / = stable / ↓). |
| `exercice-detail.png` | `exercises/[id]` | Photo, tags, 3 StatTiles (record, 1RM estimé, nb de séances), graphique de progression (Charge / Volume / Reps, records en cercle vide), bloc « Ressenti à X kg » avec conseil, historique par séance. |
| `creer-exercice.png` | `exercises/new` | Photo (appareil ou galerie), nom, muscle, équipement, pas des boutons + / − (Stepper, défaut 2,5 kg, 5 kg si machine), note. |
| `profil.png` | `(tabs)/profile` | Avatar et prénom, stats globales, poids corporel (graphique 1M / 3M / 1A et « + Ajouter une pesée »), records personnels, réglages (unité, repos par défaut, rappels, export CSV), **Supprimer mon compte**, Se déconnecter. |
| *(pas de maquette)* | `workout/summary/[id]` | Récap de fin : durée, volume total, nombre de séries, records battus (avec l'icône trophée), bouton Terminer. Rester cohérent avec le design system. |

### 8.1 Accueil
- En-tête : date du jour (« Lun. 28 sept. ») et « SALUT {PRÉNOM} ».
- **Carte « Séance du jour »** (fond volt) : séance résolue par le planning (section 9.1), tag « Prévue au planning », nombre d'exercices, durée estimée, muscles. Boutons **Démarrer** et **Changer** (ouvre la liste des séances types). S'il n'y a pas de séance prévue, afficher « Jour de repos » avec « Faire une séance quand même ».
- 3 StatTiles : séances ce mois, records ce mois, semaines de régularité.
- **Régularité** : calendrier du mois (7 colonnes, lundi en premier). États : fait (volt plein), prévu (bordure volt pointillée), aujourd'hui (bordure pleine), record (point noir dans la case), repos (surface2). Légende en dessous.
- Carte **Progression** : exercice le plus pratiqué, barres des 8 dernières séances, badge « +X kg en N sem. ».
- Carte **Poids corporel** : dernière valeur, variation sur le mois, sparkline.

### 8.2 Séance en cours (écran le plus important)
- Démarrage : crée une `sessions` (avec `name` copié), charge les exercices du template et **pré-remplit chaque série** avec la charge et les reps de la même série à la dernière séance (ou la cible si c'est la première fois).
- En-tête : réduire (la séance continue avec une barre flottante en bas des onglets), nom de la séance, chrono total, bouton Terminer (confirmation si des séries ne sont pas faites).
- Barre de progression segmentée (1 segment par exercice).
- Exercice courant : photo, « Exercice 3 / 6 », nom, « Dernière fois : 4 × 8 à 80 kg ». Balayage horizontal ou flèches pour changer d'exercice.
- **Bandeau de conseil** (section 9.3) si applicable.
- Tableau : Série | Précédent | Kg | Reps | Ressenti. Séries validées = lignes compactes avec DifficultyBadge. Toucher une ligne validée permet de la modifier.
- **Série active** : 2 Steppers (kg avec `exercise.weight_step`, reps avec un pas de 1), puis DifficultyPicker, puis bouton **VALIDER LA SÉRIE N**. Le ressenti est optionnel : si on valide sans ressenti, on n'en enregistre pas.
- Validation : écrit la `session_sets` (haptique « success »), passe à la série suivante et **lance le chrono de repos** (`rest_seconds`) avec programmation d'une notification locale. Si on valide la série suivante avant la fin, on annule la notification.
- « + Ajouter une série » ; supprimer une série par glissement.
- Barre de repos : temps restant, barre de progression, « ensuite : {exercice suivant} », boutons −15 s / +15 s.
- Garder l'écran allumé pendant la séance (`expo-keep-awake`, qui fait partie d'Expo).
- Restauration : si l'app est tuée pendant une séance, la rouvrir directement sur la séance en cours (état persisté dans SQLite, pas seulement dans Zustand).

### 8.3 Planning
- Onglets soulignés **Planning | Mes séances**, bouton + (nouvelle séance type).
- Vue **Semaine** : navigation ‹ › ; 7 lignes jour + carte (séance ou « Repos » en pointillé avec +). Toucher un jour ouvre une feuille de sélection de séance ou de repos, ce qui écrit une `schedule_overrides` sur cette date. Appui long sur une carte permet de la déplacer (V1 : « Déplacer vers… » dans le menu, sans glisser-déposer).
- Interrupteur **« Répéter chaque semaine »** : activé, les choix de la semaine affichée alimentent `weekly_schedule` ; désactivé, ils ne créent que des `schedule_overrides`.
- Vue **Mois** : grille avec étiquettes (PUSH / PULL / LEGS = nom de séance tronqué en majuscules, 6 caractères max), jours hors mois grisés, aujourd'hui encadré, total « N séances prévues » et répartition par séance.

---

## 9. Logique métier (à tester unitairement)

### 9.1 Séance du jour
```
resolveTemplateForDate(date):
  override = schedule_overrides[date] (non supprimé)
  if override existe: return override.template_id   // null = repos
  return weekly_schedule[isoWeekday(date)]?.template_id ?? null
```
Si une séance a déjà été faite aujourd'hui, la carte d'accueil affiche « Séance faite ✓ » avec un lien vers le récap.

### 9.2 Calculs de stats
- **1RM estimé (Epley)** : `reps === 1 ? w : w * (1 + reps / 30)`, arrondi à 0,5 kg. On prend le max sur les séries d'un exercice (ignorer les séries en échec avec 0 rep).
- **Record** : pour un exercice, la plus grosse charge ; à égalité de charge, le plus de reps. Une série est marquée « record » si elle bat le record précédent au moment où elle est faite.
- **Volume** d'une séance ou d'un exercice : `Σ weight_kg × reps`.
- **Charge max par séance** (courbe par défaut) : la plus grosse charge réussie (hors échec) par séance.
- **Jours à la salle** : dates distinctes de `sessions.started_at` (fuseau local).
- **Semaines de régularité** : nombre de semaines consécutives (ISO, en remontant depuis la semaine précédente, plus la semaine en cours si l'objectif est déjà atteint) où le nombre de séances ≥ `profiles.sessions_per_week` (1 par défaut).
- **Tendance** dans la liste des exercices : comparer la charge max des 2 dernières séances (↑ si record, ↑ +X, = ou ↓ −X).

### 9.3 Conseil de charge (bandeau en séance et bloc du détail exercice)
Basé sur les séries de l'exercice à la **dernière séance** :
- Si toutes les séries ont `easy` **et** reps ≥ `target_reps_max` (ou toutes `easy` s'il n'y a pas de cible) → proposer **charge + weight_step** (« Tout était facile la dernière fois : vise 82,5 kg »).
- Si au moins la moitié des séries sont `fail` → proposer **charge − weight_step**.
- Sinon → « Garde X kg » (afficher seulement dans le détail exercice, pas de bandeau en séance).
- Les séries sans ressenti ne comptent pas. Moins de 2 séries avec ressenti → pas de conseil.

### 9.4 Durée estimée d'une séance type
`Σ (target_sets × (45 s + rest_seconds))`, arrondie à 5 min, affichée « ~55 min ».

---

## 10. Notifications et haptique
- Demander la permission de notification **au premier chrono de repos**, pas au lancement.
- Fin de repos : notification locale « Repos terminé — Série N de {exercice} » avec son court.
- Rappels (si activés dans le profil) : le jour d'une séance prévue, notification à 9 h 00 « Aujourd'hui : {séance} ». On reprogramme les 14 prochains jours à chaque modification du planning.
- Haptique : `selection` sur les Steppers, `success` à la validation d'une série, `warning` sur Échec.

---

## 11. Exigences stores (à ne pas oublier)
- **Sign in with Apple** obligatoire dès qu'on propose Google (iOS).
- **Suppression de compte dans l'app** (Profil → Supprimer mon compte, avec double confirmation) : Edge Function `delete-account` qui, avec la clé service role, supprime les photos du bucket puis l'utilisateur `auth.users` (la suppression se propage en cascade). Côté app, on vide ensuite SQLite et on revient à la connexion.
- **Export des données** en CSV (séances et séries) via `expo-sharing` ; si ce n'est pas installé, le demander.
- Texte d'usage caméra et photos dans `app.json` (`NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`) en français : « Pour photographier tes machines et exercices. »
- Icône d'app (logo sur fond noir), splash (fond `#0A0A0A` et logo), `userInterfaceStyle: "dark"`.
- Liens CGU et politique de confidentialité (URLs dans `src/config.ts`, à héberger sur johanpoyet.fr).
- `eas.json` avec les profils `development`, `preview` (TestFlight / test interne) et `production`.

---

## 12. Plan de développement par phases

Chaque phase se termine par une démo de ce qui est testable dans le simulateur et une liste de vérifications manuelles.

**Phase 0 — Setup**
Projet Expo (TS strict, Expo Router), ESLint, Prettier, Jest, NativeWind avec les tokens de la section 4, polices chargées, arborescence de la section 3, `CLAUDE.md`, `docs/DECISIONS.md`, scripts `typecheck`, `lint`, `test`. `app.json` : nom « Surcharge », slug `surcharge`, bundle id à définir (`fr.johanpoyet.surcharge` proposé), thème sombre.
✅ L'app démarre sur un écran de test en Barlow Condensed avec le fond `#0A0A0A`.

**Phase 1 — Design system**
Tous les composants de la section 5, plus un écran caché `/_dev/components` qui les présente tous. Tests de rendu de base.
✅ L'écran des composants correspond visuellement aux maquettes.

**Phase 2 — Auth et onboarding**
`lib/supabase.ts` (variables d'env `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`), écrans de connexion, inscription et onboarding, garde de route (non connecté → `(auth)`), reset du mot de passe, Apple et Google Sign-In (development build), déconnexion.
✅ Je peux créer un compte, me déconnecter et me reconnecter ; la ligne `profiles` existe dans Supabase.

**Phase 3 — Base locale**
Schéma Drizzle (miroir de la section 6 + outbox + sync_state), migrations, repositories par domaine (écriture + outbox en une transaction), seed d'une trentaine d'exercices courants (sans photo) à la fin de l'onboarding. Tests des repositories.
✅ Les données survivent au redémarrage de l'app.

**Phase 4 — Exercices**
Bibliothèque, création avec photo (compression et stockage local), modification, suppression douce, détail (sans graphiques pour l'instant).
✅ Je crée « Presse à cuisses 45° » avec une photo, et je la retrouve dans la liste et dans le détail.

**Phase 5 — Séances types**
Mes séances, création et modification, choix des exercices, réordonnancement, jours au planning.
✅ Je crée « Push A » avec 4 exercices, placé le lundi.

**Phase 6 — Séance en cours** *(la plus soignée)*
Tout le 8.2 : pré-remplissage, Steppers, ressenti, validation, chrono de repos et notification, conseil de charge, persistance et restauration, récap de fin, gestion des records.
✅ Je fais une séance complète en mode avion ; après avoir tué l'app en pleine séance, je la retrouve au même endroit.

**Phase 7 — Planning et accueil**
Vues semaine et mois, overrides, répétition hebdomadaire, résolution de la séance du jour, accueil complet (carte, stats, régularité), rappels.
✅ Le lundi, l'accueil propose Push A ; si je le remplace par Pull A juste ce lundi-là, les lundis suivants restent Push A.

**Phase 8 — Stats et graphiques**
Tous les calculs de la section 9 (tests unitaires obligatoires), graphiques victory-native (détail exercice, accueil, poids dans le profil), pesées, records dans le profil.
✅ Les chiffres affichés correspondent à un jeu de données de test vérifié à la main.

**Phase 9 — Synchronisation**
Outbox, push, pull, NetInfo, upload des photos, indicateur de synchro, pull complet sur un nouvel appareil.
✅ Je fais une séance hors ligne ; une fois le réseau revenu, elle apparaît dans Supabase. En me connectant sur un second simulateur, je retrouve toutes mes données et mes photos.

**Phase 10 — Prêt pour les stores**
Suppression de compte (Edge Function), export CSV, icône, splash, textes de permissions, Sentry, `eas.json`, build `preview` iOS pour TestFlight.
✅ Build TestFlight installable.

---

## 13. Hors périmètre V1 (ne pas développer)
Réseau social / amis, Apple Watch, Live Activities, programmes générés par IA, abonnements (RevenueCat viendra plus tard), bibliothèque d'exercices avec vidéos, mode clair, autres langues que le français.

---

## 14. Ce que je (Johan) dois faire à côté
1. Créer le projet Supabase (région Europe, par ex. Paris ou Francfort), puis appliquer `0001_init.sql` via la CLI Supabase (`supabase link`, puis `supabase db push`).
2. Dans Supabase Auth : activer E-mail, Apple et Google ; renseigner les URLs de redirection.
3. Créer un compte Apple Developer (99 $/an) et un compte Google Play Console (25 $ une fois).
4. Configurer les identifiants Apple Sign-In (Service ID, clé) et Google OAuth (clients iOS, Android et web).
5. Créer `.env` avec `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` (ne jamais committer la clé service role).
6. Héberger les pages CGU et confidentialité.
7. Exporter les maquettes du canvas dans `docs/design/`.
