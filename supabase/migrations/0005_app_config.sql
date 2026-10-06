-- Réglages de l'app lisibles par tous (même sans compte), modifiables seulement depuis le
-- tableau de bord Supabase. `min_supported_version` : en dessous, l'app affiche un écran bloquant
-- « Mets à jour Surcharge » (à partir de la 1.2.0).
create table app_config (
  key text primary key,
  value jsonb not null
);

alter table app_config enable row level security;
create policy "read config" on app_config for select to anon, authenticated using (true);
grant select on app_config to anon, authenticated;

-- Valeur de départ : aucune version bloquée.
insert into app_config (key, value) values ('min_supported_version', '"1.0.0"')
  on conflict (key) do nothing;
