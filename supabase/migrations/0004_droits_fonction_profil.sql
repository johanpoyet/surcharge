-- Security Advisor : `handle_new_user()` (security definer) était exécutable par `anon` et
-- `authenticated` via l'API (droit EXECUTE accordé à PUBLIC par défaut). Elle ne sert qu'au
-- trigger d'inscription, qui n'a pas besoin de ce droit : on le retire.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
