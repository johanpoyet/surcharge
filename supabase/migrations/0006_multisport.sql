-- V2 multi-sport (SPEC_V2 §3) : séances en blocs typés, type de suivi par exercice.
-- Migration ADDITIVE : les versions 1.0.0 / 1.1.0 continuent de synchroniser (elles ignorent les
-- nouvelles colonnes, qui ont toutes une valeur par défaut ou acceptent null).

create type tracking_type as enum ('weight_reps','distance_time','time','reps','calories','weight_distance');
create type discipline    as enum ('strength','running','cross_training','hyrox','other');
create type block_type    as enum ('warmup','strength','cardio','circuit','hyrox');

-- Exercices
alter table exercises
  add column tracking_type tracking_type not null default 'weight_reps',
  add column discipline discipline not null default 'strength',
  -- identifiant canonique d'un exercice du catalogue (ex. 'bench_press', 'hyrox_skierg'),
  -- null pour un exercice perso
  add column catalog_key text;
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
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table template_exercises
  add column block_id uuid references template_blocks on delete cascade,
  add column target_distance_m int,
  add column target_duration_s int,
  add column target_calories int,
  add column target_weight_kg numeric(6,2);   -- weight_distance (Farmers, Sled)

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
  result jsonb not null default '{}'::jsonb,
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
-- ⚠️ weight_kg et reps RESTENT obligatoires (not null) : 0 pour les séries sans charge ou sans
--    reps ; le tracking_type de l'exercice dit comment lire la série. Les versions déjà installées
--    attendent des nombres. Ne JAMAIS faire `drop not null` sur ces colonnes.

-- Reprise des données V1 : 1 bloc 'strength' par séance type existante. Son id est celui de la
-- séance type : les appareils V2 font la même reprise en local (séances types créées plus tard
-- par une ancienne version) et retombent sur la même ligne, sans doublon.
insert into template_blocks (id, user_id, template_id, position, type, deleted_at)
select t.id, t.user_id, t.id, 0, 'strength', t.deleted_at
from workout_templates t
where not exists (select 1 from template_blocks b where b.template_id = t.id);

update template_exercises te
set block_id = te.template_id
where te.block_id is null
  and exists (select 1 from template_blocks b where b.id = te.template_id);

-- updated_at serveur (comme 0001 / 0003), RLS et index de pull pour les nouvelles tables
do $$
declare t text;
begin
  foreach t in array array['template_blocks','session_blocks'] loop
    execute format('create trigger set_updated_at before update on public.%I
      for each row execute procedure extensions.moddatetime(updated_at)', t);
    execute format('create trigger set_updated_at_insert before insert on public.%I
      for each row execute procedure public.set_server_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all
      using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create index %I on public.%I (user_id, updated_at)', t || '_updated', t);
  end loop;
end $$;

create index template_blocks_template on template_blocks(template_id);
create index session_blocks_session on session_blocks(session_id);
