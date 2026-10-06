# SURCHARGE V2 — Multi-sport & amis (spécification pour Claude Code)

> **Comment utiliser ce fichier**
> Place-le à la racine du dépôt, à côté de `SPEC.md`. Dézippe `design-v2.zip` dans `docs/design/v2/`.
> Pour démarrer : *« Lis SPEC.md puis SPEC_V2.md en entier. SPEC_V2 complète et remplace SPEC quand ils se contredisent. Commence par la Phase 0 et arrête-toi à la fin de chaque phase pour que je valide. »*

---

## 0. Contexte et règles

- **La V1 (1.0.0) est en production sur l'App Store** avec de vrais utilisateurs. Tout ce qui suit est une **évolution** du code existant, pas une réécriture.
- **Aucune perte de données.** Chaque migration est **additive** (nouvelles tables, nouvelles colonnes avec valeur par défaut). On ne renomme pas et on ne supprime pas de colonne utilisée par la V1.
- **Les anciennes versions de l'app continuent de synchroniser** avec Supabase tant que l'utilisateur n'a pas mis à jour. D'où la Phase A (mise à jour forcée) **avant** tout changement de schéma qui pourrait les faire planter.
- Les règles de travail de `SPEC.md` §0 restent valables : phase par phase, typecheck, lint et tests verts, arrêt à chaque fin de phase.
- **Commits** : messages en français, format `type(scope): message`. **Ne mentionne jamais Claude ni Claude Code** dans les commits ou les PR (pas de `Co-Authored-By`, pas de signature, pas de « Generated with »).
- Toute décision prise faute d'information va dans `docs/DECISIONS.md`.
- Pas de nouvelle dépendance sans me demander, sauf celles listées au §9.

### 0.1 Protection de la production (règles absolues)

La version en ligne ne doit **jamais** être modifiée par le développement de la V2. Trois choses peuvent toucher les utilisateurs **sans passer par l'App Store** :

1. **Supabase de production.**
   - Tout le développement V2 se fait sur un **projet Supabase séparé « dev »**. Le `.env` local pointe vers ce projet.
   - Les identifiants de production sont dans `.env.production`, que tu **ne lis pas et n'utilises pas**.
   - **Interdit sans mon accord écrit dans la conversation** : `supabase db push`, `supabase functions deploy` ou `supabase link` vers le projet de production, ou toute requête SQL envoyée à la production.
   - En Phase 0 de la V2, vérifie que `.env` ne pointe pas vers la production (compare avec l'URL que je te donnerai) et **arrête-toi si c'est le cas**.
2. **EAS.** **Interdit sans mon accord explicite** : `eas update` (quel que soit le canal), `eas submit`, et tout `eas build --profile production`. Les builds `development` et `preview` sont autorisés.
3. **Git.**
   - Le commit de la version envoyée à Apple porte le tag `v1.1.0` (crée-le s'il n'existe pas, après m'avoir demandé quel commit).
   - Tout le travail V2 se fait sur la branche `v2`. **Ne jamais committer directement sur `main`.**
   - Si je demande un correctif urgent pour la version en ligne, il se fait sur une branche `hotfix/...` partie du tag, puis il est fusionné dans `main` et dans `v2`.

**Mise en production de la V2** : elle se fait plus tard, avec moi, dans cet ordre :
1. migrations en production ;
2. Edge Functions ;
3. build `production` ;
4. soumission à Apple.

Les migrations étant additives (§3), elles ne cassent pas les versions déjà installées.

---

## 1. Objectifs de la V2

1. **Multi-sport sans « mode » séparé.** L'app gère la musculation, la course, le cross-training (WOD) et l'Hyrox dans **une seule app, un seul planning, un seul historique**. Deux concepts rendent ça possible :
   - **Une séance est une suite de blocs** typés : `strength` (la V1 actuelle), `cardio`, `circuit`, `hyrox`, `warmup`.
   - **Chaque exercice a un type de suivi** (`tracking_type`) qui définit ce qu'on note à chaque série.
   - Une séance V1 existante devient automatiquement une séance avec **un seul bloc `strength`** : rien ne change pour les utilisateurs actuels.
2. **Amis** : ajout par code, QR ou lien ; classement hebdomadaire **sur des critères relatifs** (assiduité par rapport à son propre objectif, progression en %, records) ; fil d'activité avec « Bravo » ; comparaison « Toi vs ami ». **Les charges brutes et le poids corporel ne sont jamais exposés par défaut.**

---

## 2. Maquettes (`docs/design/v2/`)

| Fichier | Écran |
|---|---|
| `seance-multi-blocs.html` | Création d'une séance type composée de blocs (exemple « Simu Hyrox ») |
| `ajouter-bloc.html` | Feuille du bas « Ajouter un bloc » (4 types) |
| `exercice-type-suivi.html` | Création d'exercice avec choix du type de suivi et de la discipline |
| `seance-hyrox.html` | Séance en cours, bloc Hyrox |
| `seance-wod.html` | Séance en cours, bloc circuit AMRAP |
| `recap-hyrox.html` | Récap de fin de séance Hyrox |
| `amis.html` | Onglet Amis : demandes, classement, activité |
| `ajouter-ami.html` | Code ami, QR, recherche, réglages de confidentialité |
| `ami-comparaison.html` | Comparaison « Toi vs ami » |

Les tokens, la typographie et les composants de `SPEC.md` §4 et §5 s'appliquent. Les maquettes sont la référence visuelle : les lire pour les valeurs exactes. Les données qui y figurent sont des exemples.

---

## 3. Modèle de données — migration `supabase/migrations/0002_multisport.sql`

```sql
-- Types de suivi et disciplines
create type tracking_type as enum ('weight_reps','distance_time','time','reps','calories','weight_distance');
create type discipline    as enum ('strength','running','cross_training','hyrox','other');
create type block_type    as enum ('warmup','strength','cardio','circuit','hyrox');

-- Exercices
alter table exercises
  add column tracking_type tracking_type not null default 'weight_reps',
  add column discipline discipline not null default 'strength',
  add column catalog_key text;          -- identifiant canonique pour les exercices du catalogue (ex. 'bench_press', 'hyrox_skierg'), null pour un exercice perso
create index exercises_catalog_key on exercises(user_id, catalog_key);

-- Profil
alter table profiles
  add column disciplines discipline[] not null default '{strength}';

-- Blocs des séances types
create table template_blocks (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  template_id uuid not null references workout_templates on delete cascade,
  position int not null,
  type block_type not null,
  name text,
  config jsonb not null default '{}'::jsonb,   -- voir §4
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table template_exercises
  add column block_id uuid references template_blocks on delete cascade,
  add column target_distance_m int,
  add column target_duration_s int,
  add column target_calories int,
  add column target_weight_kg numeric(6,2);   -- utile pour weight_distance (Farmers, Sled)

-- Blocs réalisés pendant une séance
create table session_blocks (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  session_id uuid not null references sessions on delete cascade,
  template_block_id uuid references template_blocks,
  position int not null,
  type block_type not null,
  name text,
  config jsonb not null default '{}'::jsonb,   -- copie de la config au moment de la séance
  result jsonb not null default '{}'::jsonb,   -- voir §4
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table session_sets
  add column block_id uuid references session_blocks on delete cascade,
  add column distance_m int,
  add column duration_s int,
  add column calories int;
-- ⚠️ weight_kg RESTE obligatoire (not null). Pour les séries sans charge (course, temps, reps, calories), on stocke 0
--    et c'est le tracking_type de l'exercice qui dit comment interpréter la série.
--    Raison : les versions 1.0.0 / 1.1.0 déjà installées attendent un nombre et ne peuvent pas toutes être forcées
--    à se mettre à jour. Ne JAMAIS faire `drop not null` sur weight_kg.

-- Reprise des données V1 : 1 bloc 'strength' par séance type existante
insert into template_blocks (id, user_id, template_id, position, type)
select gen_random_uuid(), t.user_id, t.id, 0, 'strength'
from workout_templates t
where not exists (select 1 from template_blocks b where b.template_id = t.id);

update template_exercises te
set block_id = b.id
from template_blocks b
where b.template_id = te.template_id and te.block_id is null;

-- Triggers updated_at + RLS pour les nouvelles tables (même pattern que 0001)
do $$
declare t text;
begin
  foreach t in array array['template_blocks','session_blocks'] loop
    execute format('create trigger set_updated_at before update on %I
      for each row execute procedure extensions.moddatetime(updated_at)', t);
    execute format('alter table %I enable row level security', t);
    execute format('create policy "own rows" on %I for all
      using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
```

**Côté app (SQLite / Drizzle)** : miroir de ces changements, plus une **migration locale** au premier lancement de la V2 qui fait la même reprise (un bloc `strength` par séance type, rattachement des `template_exercises`). Elle doit être idempotente. Les `session_sets` V1 sans `block_id` restent valides : on les traite comme un bloc `strength` implicite à l'affichage.

---

## 4. Règles métier multi-sport

### 4.1 Types de suivi (ce que l'on note à chaque série)

| `tracking_type` | Champs saisis | Contrôles en séance | Exemple |
|---|---|---|---|
| `weight_reps` | `weight_kg`, `reps` | 2 Steppers (V1, inchangé) | Développé couché 82,5 × 8 |
| `distance_time` | `distance_m`, `duration_s` | Stepper distance (pas 100 m, ou 50 m sous 400 m) + chrono tap/tap | Fractionné 400 m en 1:32 |
| `time` | `duration_s` | Chrono, ou compte à rebours si une cible existe | Gainage 1:30 |
| `reps` | `reps` | Stepper reps | Tractions × 12 |
| `calories` | `calories` | Stepper (pas 1) | Assault bike 20 cal |
| `weight_distance` | `weight_kg`, `distance_m` | 2 Steppers | Farmers 2 × 24 kg, 200 m |

- **Allure** (`distance_time`) : calculée et affichée en min/km, jamais stockée.
- **Ressenti** (facile / moyen / difficile / échec) : disponible pour tous les types.
- **Conseil de charge** (`SPEC.md` §9.3) : seulement pour `weight_reps` en V2.
- **Records par type** : `weight_reps` = plus grosse charge (à égalité, plus de reps) ; `distance_time` = meilleur temps **pour une distance donnée** ; `time` = durée la plus longue ; `reps` = plus de reps ; `calories` = plus de calories ; `weight_distance` = plus grosse charge sur la distance cible.
- **Graphique de progression** du détail exercice, selon le type : charge max (V1), meilleur temps et allure, durée max, reps max…

### 4.2 Configuration des blocs (`config` jsonb, typée avec zod)

```ts
type WarmupConfig   = { durationMin?: number; note?: string };
type StrengthConfig = {};                                      // exercices dans template_exercises
type CardioConfig   = { intervals?: { repeat: number; work: Segment; rest?: { durationS: number } } };
type CircuitConfig  =
  | { format: 'amrap';    durationS: number }
  | { format: 'emom';     intervalS: number; rounds: number }
  | { format: 'for_time'; rounds: number; timeCapS?: number }
  | { format: 'tabata';   workS: number; restS: number; rounds: number };
type HyroxConfig    = {
  format: 'full' | 'half' | 'station';   // half = 4 runs + 4 stations ; station = une seule station
  division: 'open_men' | 'open_women' | 'pro_men' | 'pro_women' | 'doubles' | 'custom';
  stations?: HyroxStationKey[];           // pour 'station' ou 'custom'
  timeTransitions?: boolean;              // voir 4.4
};
```
Les exercices d'un bloc `circuit` sont les mouvements d'**un tour** (`template_exercises` avec cibles reps, distance ou calories).

### 4.3 Catalogue Hyrox (`src/features/hyrox/catalog.ts`)

Ordre officiel : **8 × (1 km de course + 1 station)** :
1. SkiErg 1000 m
2. Sled Push 50 m
3. Sled Pull 50 m
4. Burpee Broad Jumps 80 m
5. Rowing 1000 m
6. Farmers Carry 200 m
7. Sandbag Lunges 100 m
8. Wall Balls 100 reps

Les charges par division (sled push/pull, farmers, sandbag, wall ball) sont stockées dans ce fichier de configuration, **pas en dur dans les écrans**. ⚠️ **Je dois vérifier les valeurs officielles sur hyrox.com avant la mise en production** : mets des valeurs plausibles avec un `// TODO vérifier` et liste-les dans `DECISIONS.md`.

Les stations et la course (« Hyrox Run 1 km ») sont des exercices du catalogue avec `catalog_key` (`hyrox_run`, `hyrox_skierg`, `hyrox_sled_push`…), ajoutés par le seed. Pour les comptes existants, on les ajoute au premier lancement de la V2.

### 4.4 Résultats de blocs (`session_blocks.result`)

- **`hyrox`** : chaque segment (Run 1, SkiErg, Run 2…) est une `session_sets` avec `duration_s` et l'`exercise_id` correspondant, dans l'ordre. `result = { totalS, runS, stationsS, transitionsS? }`.
  - Par défaut, un **seul tap par segment** (« Station finie » / « Run fini ») : le temps de transition est inclus dans le segment suivant, et la tuile « Transitions » du récap est **masquée**.
  - Si `timeTransitions = true` : un tap supplémentaire « J'arrive à la station » sépare la transition. On stocke alors `transitionsS` et on affiche la tuile.
- **`circuit` AMRAP** : `result = { rounds, extraReps }`. **For Time** : `result = { totalS, capped: boolean }`. **EMOM / Tabata** : `result = { completedRounds }`.
- **`cardio`** : les séries sont des `session_sets` (`distance_m`, `duration_s`). `result = { totalDistanceM, totalS }`.

### 4.5 Comparaison avec la dernière fois

Pour un bloc `hyrox` ou `circuit`, on compare avec le **dernier `session_block` du même `template_block_id`** (à défaut, de même type et de même config). Écart segment par segment, affiché en direct : vert si en avance, orange si en retard (avec le signe −/+, jamais la couleur seule).

### 4.6 Durée estimée d'une séance type (remplace `SPEC.md` §9.4)

Somme par bloc :
- `strength` : formule V1.
- `circuit` AMRAP / EMOM / Tabata : durée fixe.
- `circuit` For Time : `timeCapS`, sinon 15 min.
- `hyrox` : full 90 min, half 45 min, station 10 min (ou la moyenne de l'utilisateur dès qu'il a un historique).
- `cardio` : somme des cibles, sinon 30 min.
- `warmup` : `durationMin`, sinon 10 min.

---

## 5. Écrans multi-sport

### 5.1 Création / modification d'une séance type (`seance-multi-blocs`, `ajouter-bloc`)
- Liste de **cartes de bloc** réordonnables, chacune avec son étiquette de type (HYROX en volt, les autres en gris), un résumé et un menu ⋯ (renommer, dupliquer, supprimer).
- « Ajouter un bloc » ouvre une **feuille du bas** avec 4 choix : Musculation, Course / cardio, Circuit / WOD, Hyrox.
- **Bloc Hyrox** : choix du format (complet / demi / station seule) et de la division. La liste des segments est générée automatiquement, avec 4 segments visibles et un lien « + N segments ».
- **Bloc Circuit** : choix du format (AMRAP / EMOM / For Time / Tabata) avec ses paramètres, puis les mouvements d'un tour.
- **Bloc Musculation** : l'éditeur V1 actuel (`V_CreerSeance`), embarqué dans le bloc.
- En-tête : « Blocs · N » et la durée estimée (§4.6). Si le planning contient des kilomètres, ajouter « · X km de course ».

### 5.2 Exercice — type de suivi (`exercice-type-suivi`)
- Grille 2 × 3 de types de suivi (titre et exemple) et une **carte d'aperçu** qui montre les contrôles tels qu'ils apparaîtront en séance.
- Choix de la **discipline** (puces).
- **Le type de suivi d'un exercice qui a déjà des séries enregistrées ne peut plus être modifié** (désactivé, avec une explication). Sinon l'historique deviendrait incohérent.

### 5.3 Séance en cours — moteur de blocs
- La séance enchaîne les blocs dans l'ordre. En-tête commun : réduire, nom, **chrono total**, Pause / Terminer.
- **Bloc `strength`** : l'écran V1, inchangé.
- **Bloc `hyrox`** (`seance-hyrox`) :
  - barre segmentée de 16 cases (course en volt, station en gris) ;
  - carte centrale avec le segment courant, l'objectif (distance et charge de la division) et un **chrono du segment en très grand** (96 px) ;
  - pastilles « Dernière fois » et écart ;
  - liste des temps intermédiaires ;
  - **un seul gros bouton** (h 72) « Station finie » / « Run fini ».
  - Haptique `success` à chaque tap. **Annuler le dernier tap** reste possible pendant 5 s, via un toast « Annuler ».
- **Bloc `circuit`** (`seance-wod`) :
  - AMRAP : compte à rebours circulaire, la composition d'un tour, et un **énorme bouton « +1 tour »** avec un « − » à côté ; saisie des reps supplémentaires à la fin.
  - EMOM / Tabata : signal sonore et haptique à chaque intervalle.
  - For Time : chrono montant, bouton « Terminé ».
- **Bloc `cardio`** : liste des séries à faire (« 6 × 400 m, récup 1:30 »), chrono tap/tap pour chaque série, puis repos automatique.
- **Contraintes V1 toujours valables** : écran allumé, restauration après fermeture forcée (l'état du bloc et du chrono est persisté dans SQLite : on stocke les horodatages de début, jamais un compteur), aucune dépendance au réseau.
- **Chronos fiables en arrière-plan** : on calcule toujours `now - startedAt`. Fin d'intervalle EMOM / Tabata / repos : notifications locales programmées.

### 5.4 Récap (`recap-hyrox`)
- Grande carte volt avec le temps total, un badge « Record −X:XX » s'il est battu, et la division.
- Tuiles Course (avec l'allure moyenne), Stations, Transitions (si mesurées).
- Barres horizontales par station avec l'écart par rapport à la dernière simu. Mettre en valeur en orange la station la plus lente par rapport à la précédente.
- **Point faible** : la station avec le plus gros écart positif (> 10 s). Le bandeau propose d'ajouter un bloc dédié à la prochaine séance (crée un bloc `station` pré-rempli).
- Boutons Partager (image du récap via `expo-sharing` ; génération d'image en V2.1 si trop complexe, voir §8) et Terminer.

### 5.5 Navigation et accueil
- **Barre d'onglets V2** : Accueil · **Entraînement** · [+] · **Amis** · Profil.
  - « Entraînement » remplace « Séances » et contient 3 sous-onglets : **Planning | Mes séances | Exercices**. La bibliothèque d'exercices quitte la barre du bas.
  - Tant que la partie Amis n'est pas livrée (Phases H et I), garder « Exercices » dans la barre du bas. **Le basculement de la navigation se fait en Phase I.**
- **Onboarding** : nouvelle étape « Tes disciplines » (multi-choix : Muscu, Course, Cross-training, Hyrox), enregistrée dans `profiles.disciplines`. Elle filtre le catalogue proposé et les stats de l'accueil. Pour les comptes V1 existants : une **feuille unique au premier lancement** de la V2 avec la même question.
- **Accueil** :
  - la carte « Séance du jour » résume les blocs (ex. « Hyrox complet · 8 km + 8 stations ») ;
  - si `running` fait partie des disciplines, ajouter la tuile « km courus ce mois » ;
  - si `hyrox`, une carte « Meilleure simu Hyrox » avec la courbe des temps.

---

## 6. Amis — données et sécurité

### 6.1 Principes
- **Ne jamais donner aux amis l'accès aux tables privées** (`session_sets`, `body_weights`…). Les amis ne lisent que des **tables publiques agrégées**, écrites par le client du propriétaire.
- Les stats publiques sont recalculées en local à la fin de chaque séance et poussées via l'outbox (offline-first conservé). Le risque de triche est accepté : l'enjeu est faible, à noter dans `DECISIONS.md`.
- Apple exige, dès que des utilisateurs interagissent entre eux, de pouvoir **signaler** et **bloquer** un utilisateur, et de filtrer les contenus choquants (pseudos). C'est obligatoire.

### 6.2 Migration `supabase/migrations/0003_social.sql`

```sql
alter table profiles
  add column username text unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  add column friend_code text unique,              -- ex. 'JOHAN-7K2', généré côté serveur
  add column share_sessions boolean not null default true,
  add column share_records boolean not null default true,
  add column share_exact_weights boolean not null default false;
-- le poids corporel n'est JAMAIS partagé : aucune colonne de réglage, aucune table publique

create type friendship_status as enum ('pending','accepted','declined','blocked');

create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users on delete cascade,
  addressee_id uuid not null references auth.users on delete cascade,
  status friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index friendships_pair on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create or replace function are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a)));
$$;

-- Stats hebdo publiques (1 ligne par utilisateur)
create table public_stats (
  user_id uuid primary key references auth.users on delete cascade,
  week_start date not null,
  sessions_this_week smallint not null default 0,
  weekly_goal smallint not null default 1,
  streak_weeks smallint not null default 0,
  sessions_this_month smallint not null default 0,
  records_this_week smallint not null default 0,
  records_this_month smallint not null default 0,
  updated_at timestamptz not null default now()
);

-- Stats par exercice du catalogue (comparaison « exercices en commun »)
create table public_exercise_stats (
  user_id uuid not null references auth.users on delete cascade,
  catalog_key text not null,
  progress_pct_3m numeric(6,2),          -- progression sur 3 mois, en %
  best_weight_kg numeric(6,2),           -- null si share_exact_weights = false
  best_time_s int,                        -- pour hyrox / course
  updated_at timestamptz not null default now(),
  primary key (user_id, catalog_key)
);

create type activity_type as enum ('record','streak','hyrox_done','session_done');
create table activity_events (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  type activity_type not null,
  payload jsonb not null,                 -- ex. {"exerciseName":"Squat","value":"100 kg × 3"} ; respecte share_exact_weights
  created_at timestamptz not null default now()
);
create index activity_events_user on activity_events(user_id, created_at desc);

create table kudos (
  event_id uuid not null references activity_events on delete cascade,
  from_user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, from_user_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users on delete cascade,
  reported_id uuid not null references auth.users on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table friendships enable row level security;
create policy "see own friendships" on friendships for select
  using (auth.uid() in (requester_id, addressee_id));
create policy "request friendship" on friendships for insert
  with check (requester_id = auth.uid() and status = 'pending');
create policy "answer or block" on friendships for update
  using (auth.uid() in (requester_id, addressee_id));
create policy "remove friendship" on friendships for delete
  using (auth.uid() in (requester_id, addressee_id));

alter table public_stats enable row level security;
create policy "write own" on public_stats for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "friends read" on public_stats for select
  using (are_friends(auth.uid(), user_id));

alter table public_exercise_stats enable row level security;
create policy "write own" on public_exercise_stats for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "friends read" on public_exercise_stats for select
  using (are_friends(auth.uid(), user_id));

alter table activity_events enable row level security;
create policy "write own" on activity_events for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "friends read" on activity_events for select
  using (are_friends(auth.uid(), user_id));

alter table kudos enable row level security;
create policy "give kudos" on kudos for insert
  with check (from_user_id = auth.uid()
    and are_friends(auth.uid(), (select user_id from activity_events e where e.id = event_id)));
create policy "see kudos" on kudos for select
  using (from_user_id = auth.uid()
    or exists (select 1 from activity_events e where e.id = event_id and e.user_id = auth.uid()));
create policy "remove own kudos" on kudos for delete using (from_user_id = auth.uid());

alter table reports enable row level security;
create policy "create report" on reports for insert with check (reporter_id = auth.uid());
-- pas de select : les signalements ne sont lus que depuis le dashboard Supabase
```

- **Lire le profil d'un ami** (prénom, pseudo, avatar) : passer par une vue ou une RPC `get_friend_profiles()` en `security definer` qui ne renvoie que ces champs pour les amis acceptés. **Ne pas ouvrir la table `profiles` en lecture.**
- **Edge Functions** :
  - `generate-friend-code` : à la création du profil et pour les comptes existants ; format `PRÉNOM-XXX`, unicité garantie.
  - `find-user` : recherche par code ami ou pseudo exact. Renvoie seulement `{ id, first_name, username, avatar }`, sans liste ni recherche partielle. **Limiter le débit** (ex. 20 requêtes / min / utilisateur).
  - `delete-account` (existe déjà) : vérifier que la suppression se propage bien aux nouvelles tables (`on delete cascade`).
- **Bloquer** : `status = 'blocked'`, avec le bloqueur stocké comme `requester_id`, en recréant la ligne si besoin. Une personne bloquée ne peut plus envoyer de demande ni voir quoi que ce soit.
- **Pseudos** : contrôle via une petite liste de mots interdits (fichier `src/features/social/bannedWords.ts`) côté client **et** dans l'Edge Function `set-username`.

### 6.3 Calcul des stats publiques (local, à la fin de chaque séance et au premier lancement)
- `sessions_this_week`, `weekly_goal` (= `profiles.sessions_per_week`), `streak_weeks` (règle de `SPEC.md` §9.2), records de la semaine et du mois.
- `public_exercise_stats` : uniquement pour les exercices ayant un `catalog_key`.
  - `progress_pct_3m` = (meilleure charge des 14 derniers jours − meilleure charge d'il y a 3 mois) ÷ meilleure charge d'il y a 3 mois × 100. Pour un exercice au temps, c'est l'inverse : un temps plus court = un % positif.
  - `best_weight_kg` vaut null si `share_exact_weights` est désactivé.
- `activity_events` : créés pour un record (si `share_records`), une série de semaines multiple de 2, ou une simu Hyrox terminée (si `share_sessions`).

---

## 7. Écrans Amis

### 7.1 Onglet Amis (`amis`)
- Bouton « Ajouter » (volt) dans l'en-tête, et bandeau « Demandes d'amis en attente » avec un compteur (n'apparaît que s'il y en a).
- **Classement de la semaine**, avec trois puces de critère :
  - **Assiduité** (par défaut) : `sessions_this_week / weekly_goal`, plafonné à 100 % pour le tri. À égalité, on départage avec le nombre de séances.
  - **Progression** : moyenne des `progress_pct_3m`.
  - **Records** : `records_this_week`.
  - Affichage « 5/4 », barre de progression, ligne « Toi » mise en avant (fond volt translucide). **Remis à zéro chaque lundi.**
- **Activité** : les 30 derniers événements des amis, avec un bouton « Bravo ». Une fois donné, il devient plein (« Bravo ✓ ») et un nouveau tap le retire.
- **État vide** : illustration avec le motif de marque et « Ajoute tes potes de salle », plus un bouton vers l'ajout.

### 7.2 Ajouter un ami (`ajouter-ami`)
- Grande carte volt avec le **QR code** du lien d'invitation, le **code ami**, « Partager le lien » (feuille de partage native) et « Scanner un code » (`expo-camera`).
- Champ « Entrer un code ami ou un pseudo » qui appelle `find-user`, puis affiche un résultat avec « Envoyer une demande ».
- Bloc **« Ce que tes amis voient »** avec trois interrupteurs (séances et régularité, records et progression, charges exactes en kg) et la ligne « Poids corporel : Jamais partagé ».
- **Lien d'invitation** : `https://johanpoyet.fr/s/{code}`. Universal link iOS (fichier `apple-app-site-association` sur johanpoyet.fr) et App Link Android ; schéma de secours `surcharge://add/{code}`. Si l'app n'est pas installée, la page web renvoie vers l'App Store.

### 7.3 Toi vs ami (`ami-comparaison`)
- Avatars « Toi VS Théo », période Semaine / Mois / 3 mois.
- Barres face à face : séances, objectif hebdo atteint (%), records battus.
- **Exercices en commun** (même `catalog_key`) : progression en %, avec les charges seulement si l'ami les partage (sinon « charges masquées »). Hyrox : meilleur temps et écart avec sa dernière simu.
- Bouton « Encourager {prénom} » : envoie un bravo sur sa dernière activité.
- Menu ⋯ : **Retirer des amis**, **Bloquer**, **Signaler** (motif au choix, puis insertion dans `reports`).

### 7.4 Notifications
- **V2** : pas de push serveur. Badge dans l'onglet Amis (demandes et bravos non vus) calculé à l'ouverture de l'app.
- **V2.1 (hors périmètre)** : notifications push des demandes et des bravos via Expo Push et une Edge Function.

---

## 8. Hors périmètre V2
- Suivi GPS de la course. On fait de la saisie manuelle, et plus tard un import depuis Apple Santé / Health Connect.
- Live Activities et Apple Watch.
- Défis entre amis, groupes ou clubs, commentaires libres.
- Classements publics (non-amis).
- Génération d'une image de partage stylée (en V2, partager le texte du récap suffit).
- Notifications push serveur (§7.4).

---

## 9. Dépendances autorisées en plus de la V1
`expo-camera` (scan de QR), `react-native-qrcode-svg` (affichage du QR), `expo-sharing` (déjà autorisé), `expo-linking` (liens d'invitation), `expo-application` (lecture de la version pour la Phase A), `expo-av` ou `expo-audio` (bips EMOM / Tabata ; prendre celui que recommande le SDK Expo du projet).

---

## 10. Plan par phases

Chaque phase se termine par : typecheck, lint et tests verts, résumé, liste de vérifications manuelles, **arrêt**.

**Phase 0 — Sécurisation (avant toute ligne de code V2)**
1. **Guide-moi pour créer le projet Supabase « dev »**, étape par étape, en attendant ma confirmation à chaque étape :
   - créer le projet sur supabase.com (même région que la production) ;
   - récupérer l'URL et la clé `anon` ;
   - les mettre dans `.env` (et déplacer les clés de production actuelles dans `.env.production`) ;
   - lier la CLI au projet dev avec `supabase link --project-ref <ref-dev>` (je te donne la ref) ;
   - appliquer les migrations existantes ;
   - configurer l'auth (e-mail, Sign in with Apple, Google) avec les mêmes fournisseurs que la production, en m'indiquant précisément quoi copier depuis le dashboard de production (Service ID Apple, client IDs Google, URLs de redirection) ;
   - recréer le bucket photos et les Edge Functions sur le projet dev.
2. **Vérifie** que `.env` et le projet lié à la CLI sont bien le dev (l'URL ne doit pas être celle de `.env.production`). **Arrête-toi si ce n'est pas le cas.**
3. **Git** : vérifie que le tag `v1.1.0` existe sur le commit envoyé à Apple. S'il n'existe pas, propose-moi le commit et attends ma confirmation avant de le créer. Crée ensuite la branche `v2`.
4. **Mise à jour forcée** : inspecte toi-même le code au tag `v1.1.0` (par ex. `app_config`, `min_supported_version`, un écran « mettre à jour », une comparaison de version au démarrage) pour savoir si la 1.1.0 contient déjà un mécanisme de mise à jour forcée. Note la conclusion et les fichiers concernés dans `DECISIONS.md` :
   - s'il existe et fonctionne → Phase A sautée, passe à la Phase B ;
   - s'il n'existe pas ou est incomplet → fais la Phase A.
5. Vérifie que l'app tourne en local sur le Supabase dev (connexion, création d'une séance).

✅ L'app tourne en local sur le Supabase dev, sur la branche `v2`. Le résumé de fin de phase indique si la Phase A est nécessaire.

**Phase A — Mise à jour forcée (seulement si la 1.1.0 ne l'a pas déjà)**
Table Supabase `app_config (key text primary key, value jsonb)` avec `min_supported_version`, lisible par tous (policy select `true`). Au démarrage et au retour au premier plan, si la version de l'app est inférieure, afficher un écran bloquant « Mets à jour Surcharge » avec un bouton vers la fiche App Store / Play Store. Hors ligne, on ne bloque jamais.
Développé sur une branche `release/1.2.0` partie du tag `v1.1.0` (et non sur `v2`), puis fusionné dans `v2`. Cette mise à jour part seule en 1.2.0, sans les fonctionnalités V2.
✅ En réglant `min_supported_version` à `9.9.9` sur le Supabase dev, l'app affiche l'écran de mise à jour. Avec une valeur plus basse, l'app fonctionne normalement.
ℹ️ Les utilisateurs restés sur une version sans cet écran ne pourront jamais être forcés à mettre à jour. C'est pour ça que toutes les migrations V2 restent compatibles avec les anciennes versions (§3, `weight_kg` toujours renseigné).

**Phase B — Modèle de données multi-sport**
Migration `0002` sur le **Supabase dev** (§0.1), miroir Drizzle, migration locale idempotente, mise à jour de la synchro (nouvelles tables et colonnes, ordre des dépendances : `template_blocks` avant `template_exercises`, `session_blocks` avant `session_sets`). Seed du catalogue (§4.3) et des exercices courants de course et de cross-training avec `catalog_key`. Tests de la migration locale sur un jeu de données V1.
✅ Avec un compte V1 existant, après mise à jour, toutes les séances types et tout l'historique sont intacts et chaque séance type a un bloc Musculation.

**Phase C — Exercices et types de suivi**
Écran `exercice-type-suivi`, verrouillage du type si l'exercice a un historique, affichage adapté dans la bibliothèque et le détail (records et graphiques par type, §4.1).
✅ Je crée « Fractionné 400 m » (distance + temps) ; son détail affiche un graphique de temps et pas de charge.

**Phase D — Séances types en blocs**
Écrans `seance-multi-blocs` et `ajouter-bloc`, éditeurs des 5 types de blocs, générateur Hyrox, durée estimée (§4.6).
✅ Je crée « Simu Hyrox » (échauffement, Hyrox complet Open Homme, muscu) et je la place au planning.

**Phase E — Moteur de séance multi-blocs**
Enchaînement des blocs, bloc `cardio`, bloc `circuit` (les 4 formats), bloc `hyrox` (tap unique, option transitions, annulation sur 5 s), persistance et restauration, notifications d'intervalles. Les séries sans charge sont enregistrées avec `weight_kg = 0` (§3).
✅ Une simu Hyrox complète en mode avion, avec l'app tuée au milieu, reprend au bon segment avec le bon chrono. Un AMRAP de 12 min sonne à la fin.

**Phase F — Récaps et stats multi-sport**
Récap Hyrox (§5.4), récap circuit et cardio, comparaison avec la dernière fois (§4.5), cartes d'accueil selon les disciplines, étape « Tes disciplines » dans l'onboarding et feuille unique pour les comptes existants.
✅ Après deux simus, le récap de la deuxième affiche les écarts et le point faible.

**Phase G — Release multi-sport**
Mise à jour de l'aide et de la fiche App Store (textes à me proposer), build `preview`, puis `production`.
✅ Build TestFlight validé par moi.

**Phase H — Backend social**
Migration `0003`, RPC `get_friend_profiles`, Edge Functions (`generate-friend-code`, `find-user`, `set-username`), calcul local et push des stats publiques (§6.3), mise à jour de `delete-account`. Tests RLS : écrire un script SQL qui vérifie, avec deux utilisateurs de test, qu'un non-ami ne peut rien lire et qu'un ami ne lit que les tables publiques.
✅ Les tests RLS passent ; deux comptes de test deviennent amis et se voient mutuellement dans `public_stats`, mais pas dans `session_sets`.

**Phase I — Interface Amis et nouvelle navigation**
Barre d'onglets V2 avec les sous-onglets Entraînement (§5.5), écrans `amis`, `ajouter-ami`, `ami-comparaison`, choix du pseudo (au premier passage dans l'onglet Amis), QR, scan, liens d'invitation, bravos, retirer / bloquer / signaler, états vides, badge.
✅ Sur deux simulateurs : invitation par lien, acceptation, classement, bravo, puis blocage qui fait disparaître l'ami des deux côtés.

**Phase J — Release sociale**
Vérifier les exigences Apple sur le contenu entre utilisateurs (signaler, bloquer, filtre des pseudos, adresse de contact dans les réglages), mettre à jour la politique de confidentialité (textes à me proposer) et les fiches de confidentialité des stores, puis build `production`.
✅ Build TestFlight validé par moi.

---

## 11. Ce que je (Johan) dois faire à côté
1. Suivre le guide de Claude Code en Phase 0 pour créer le projet Supabase « dev ». Ne jamais lui donner les identifiants de la base de production autrement que via `.env.production`.
2. Confirmer le commit du tag `v1.1.0` si Claude Code le demande.
3. Vérifier les charges officielles Hyrox par division sur hyrox.com et corriger `catalog.ts`.
4. Héberger `apple-app-site-association` et `assetlinks.json` sur johanpoyet.fr, ainsi que la page `/s/{code}` (redirection vers les stores).
5. Mettre à jour la politique de confidentialité (amis, données partagées, signalements) avant la Phase J.
6. Ajouter une adresse e-mail de contact pour la modération dans les réglages de l'app.
7. Exporter les maquettes V2 dans `docs/design/v2/` (zip fourni ; ajouter les PNG si possible).
