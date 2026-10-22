-- Amis du compte de démonstration (vérification Apple de la 2.1.0, captures).
--
-- Prérequis : migration `0007_social` appliquée ; compte démo existant ; deux comptes « amis »
-- créés dans l'app (inscription normale, onboarding fait) avec les e-mails ci-dessous.
-- SQL Editor → coller ce fichier → Run. Puis, dans l'app démo, ouvrir l'onglet Amis.
-- À lancer quand AUCUNE vérification Apple n'est en cours. Ne touche que ces trois comptes.
--
-- Contenu : pseudos, les deux amis acceptés, leurs stats publiques de la semaine (classement),
-- une progression sur un exercice du catalogue, et deux activités (record, simu Hyrox) à encourager.
-- Rejouable : remplace ce qu'il a créé.

do $$
declare
  demo_email constant text := 'demo.surcharge@johanpoyet.fr';
  friend_emails constant text[] := array['demo.theo@johanpoyet.fr', 'demo.ines@johanpoyet.fr'];
  usernames constant text[] := array['theo.run', 'ines_hyrox'];
  demo uuid;
  friend uuid;
  monday date := date_trunc('week', current_date)::date;
  i int;
begin
  select id into demo from auth.users where email = demo_email;
  if demo is null then raise exception 'Compte démo introuvable (%)', demo_email; end if;
  update public.profiles set share_exact_weights = true where id = demo;

  for i in 1 .. array_length(friend_emails, 1) loop
    select id into friend from auth.users where email = friend_emails[i];
    if friend is null then raise exception 'Compte ami introuvable (%) : le créer dans l''app', friend_emails[i]; end if;

    -- Pseudo (même contrôle que set_username, sans passer par auth.uid()).
    perform set_config('surcharge.set_username', 'on', true);
    update public.profiles set username = usernames[i], share_exact_weights = (i = 1) where id = friend;
    perform set_config('surcharge.set_username', 'off', true);

    -- Amitié acceptée (une seule ligne par paire).
    delete from public.friendships
     where least(requester_id, addressee_id) = least(demo, friend)
       and greatest(requester_id, addressee_id) = greatest(demo, friend);
    insert into public.friendships (requester_id, addressee_id, status) values (friend, demo, 'accepted');

    insert into public.public_stats (user_id, week_start, sessions_this_week, weekly_goal, streak_weeks,
                                     sessions_this_month, records_this_week, records_this_month)
    values (friend, monday, case i when 1 then 5 else 2 end, case i when 1 then 4 else 3 end,
            case i when 1 then 6 else 2 end, case i when 1 then 16 else 9 end,
            case i when 1 then 2 else 1 end, case i when 1 then 5 else 3 end)
    on conflict (user_id) do update set
      week_start = excluded.week_start, sessions_this_week = excluded.sessions_this_week,
      weekly_goal = excluded.weekly_goal, streak_weeks = excluded.streak_weeks,
      sessions_this_month = excluded.sessions_this_month, records_this_week = excluded.records_this_week,
      records_this_month = excluded.records_this_month, updated_at = now();

    insert into public.public_exercise_stats (user_id, catalog_key, progress_pct_3m, best_weight_kg, best_time_s)
    values (friend, 'bench_press', case i when 1 then 6 else 9 end, case i when 1 then 80 else null end, null),
           (friend, 'hyrox_full_simulation', null, null, case i when 1 then 5050 else 5480 end)
    on conflict (user_id, catalog_key) do update set
      progress_pct_3m = excluded.progress_pct_3m, best_weight_kg = excluded.best_weight_kg,
      best_time_s = excluded.best_time_s, updated_at = now();

    delete from public.activity_events where user_id = friend;
    insert into public.activity_events (id, user_id, type, payload, created_at) values
      (gen_random_uuid(), friend, 'record',
       case i when 1 then '{"exerciseName":"Développé couché","value":"80 kg × 5"}'::jsonb
              else '{"exerciseName":"Squat","value":null}'::jsonb end,
       now() - make_interval(hours => 2 + i * 3)),
      (gen_random_uuid(), friend, 'hyrox_done',
       jsonb_build_object('format', 'full', 'totalS', case i when 1 then 5050 else 5480 end),
       now() - make_interval(days => i));
    if i = 1 then
      insert into public.activity_events (id, user_id, type, payload, created_at)
      values (gen_random_uuid(), friend, 'streak', '{"weeks":6}'::jsonb, monday::timestamptz);
    end if;
  end loop;
end;
$$;
