-- La synchro (pull) récupère les lignes avec `updated_at > dernier pull`. Pour ne dépendre que de
-- l'horloge du serveur, `updated_at` est aussi fixé par le serveur à l'insertion (moddatetime ne
-- s'applique qu'aux mises à jour).
create or replace function public.set_server_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','exercises','workout_templates','template_exercises',
    'weekly_schedule','schedule_overrides','sessions','session_sets','body_weights']
  loop
    execute format('create trigger set_updated_at_insert before insert on public.%I
      for each row execute procedure public.set_server_updated_at()', t);
  end loop;
end $$;

-- Index pour le pull incrémental (updated_at > …) sur chaque table synchronisée.
create index if not exists exercises_updated on public.exercises (user_id, updated_at);
create index if not exists workout_templates_updated on public.workout_templates (user_id, updated_at);
create index if not exists template_exercises_updated on public.template_exercises (user_id, updated_at);
create index if not exists weekly_schedule_updated on public.weekly_schedule (user_id, updated_at);
create index if not exists schedule_overrides_updated on public.schedule_overrides (user_id, updated_at);
create index if not exists sessions_updated on public.sessions (user_id, updated_at);
create index if not exists session_sets_updated on public.session_sets (user_id, updated_at);
create index if not exists body_weights_updated on public.body_weights (user_id, updated_at);
