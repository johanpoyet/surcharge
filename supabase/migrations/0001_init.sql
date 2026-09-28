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
