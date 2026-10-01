-- Données du compte de démonstration (vérification Apple, captures d'écran).
--
-- Prérequis : le compte est créé dans l'app (e-mail + mot de passe), l'onboarding est terminé
-- (bibliothèque d'exercices par défaut) et l'app a synchronisé. Ensuite, dans Supabase :
-- SQL Editor → coller ce fichier → Run. Puis se déconnecter / reconnecter dans l'app.
--
-- Contenu : 3 séances types (Push lundi, Pull mercredi, Legs vendredi), 10 semaines de séances
-- passées avec progression des charges, pesées hebdomadaires. Rien n'est créé pour aujourd'hui :
-- la séance du jour reste à faire. À lancer une seule fois, sur un compte sans séance.

do $$
declare
  demo_email constant text := 'demo.surcharge@johanpoyet.fr';
  uid uuid;
  monday date := date_trunc('week', current_date)::date;
  tpl record;
  ex record;
  tpl_id uuid;
  session_id uuid;
  day date;
  started timestamptz;
  t timestamptz;
  w int;
  k int;
  s int;
  ex_order int;
  weight numeric;
  reps int;
  diff difficulty;
begin
  select id into uid from auth.users where email = demo_email;
  if uid is null then
    raise exception 'Compte % introuvable : crée-le d''abord dans l''app.', demo_email;
  end if;
  if exists (select 1 from sessions where user_id = uid and deleted_at is null) then
    raise exception 'Le compte % a déjà des séances : script non relancé.', demo_email;
  end if;
  if (select count(*) from exercises where user_id = uid and deleted_at is null) < 30 then
    raise exception 'Bibliothèque incomplète : termine l''onboarding et laisse l''app synchroniser.';
  end if;

  update profiles
     set first_name = 'Alex', goal = 'muscle', sessions_per_week = 3
   where id = uid;

  -- Programme : séance type, jour (1 = lundi), puis exercices avec
  -- séries, reps min/max, repos, charge de départ, pas de progression, toutes les N semaines.
  create temp table demo_plan (
    tpl_name text, tpl_pos int, weekday int, ex_name text, ex_pos int,
    sets int, reps_min int, reps_max int, rest int,
    start_kg numeric, step_kg numeric, every int
  ) on commit drop;
  insert into demo_plan values
    ('Push', 0, 1, 'Développé couché',            0, 4, 6, 8,  150,  70,   2.5, 2),
    ('Push', 0, 1, 'Développé incliné haltères',  1, 3, 8, 10, 120,  22.5, 2.5, 4),
    ('Push', 0, 1, 'Élévations latérales',        2, 3, 12, 15, 90,  10,   2.5, 5),
    ('Push', 0, 1, 'Extension triceps poulie',    3, 3, 10, 12, 90,  25,   2.5, 3),
    ('Pull', 1, 3, 'Tirage vertical',             0, 4, 8, 10, 120,  55,   2.5, 2),
    ('Pull', 1, 3, 'Rowing barre',                1, 4, 6, 8,  150,  60,   2.5, 3),
    ('Pull', 1, 3, 'Face pull',                   2, 3, 12, 15, 90,  20,   2.5, 4),
    ('Pull', 1, 3, 'Curl barre',                  3, 3, 8, 12, 90,   30,   2.5, 4),
    ('Legs',   2, 5, 'Squat',                     0, 4, 5, 8,  180,  90,   2.5, 2),
    ('Legs',   2, 5, 'Presse à cuisses',          1, 3, 10, 12, 120, 160,  10,  3),
    ('Legs',   2, 5, 'Leg curl',                  2, 3, 10, 12, 90,  40,   5,   4),
    ('Legs',   2, 5, 'Mollets debout',            3, 3, 12, 15, 60,  60,   5,   4);

  if exists (
    select 1 from demo_plan p
    where not exists (select 1 from exercises e
                      where e.user_id = uid and e.name = p.ex_name and e.deleted_at is null)
  ) then
    raise exception 'Exercice par défaut manquant (renommé ou supprimé ?).';
  end if;

  -- Séances types, exercices, planning de la semaine.
  for tpl in select distinct tpl_name, tpl_pos, weekday from demo_plan order by tpl_pos loop
    tpl_id := gen_random_uuid();
    insert into workout_templates (id, user_id, name, position)
      values (tpl_id, uid, tpl.tpl_name, tpl.tpl_pos);
    insert into template_exercises
      (id, user_id, template_id, exercise_id, position, target_sets, target_reps_min,
       target_reps_max, rest_seconds)
    select gen_random_uuid(), uid, tpl_id, e.id, p.ex_pos, p.sets, p.reps_min, p.reps_max, p.rest
      from demo_plan p
      join exercises e on e.user_id = uid and e.name = p.ex_name and e.deleted_at is null
     where p.tpl_name = tpl.tpl_name;
    insert into weekly_schedule (id, user_id, weekday, template_id)
      values (gen_random_uuid(), uid, tpl.weekday, tpl_id);

    -- 10 semaines passées (w = 0 la plus ancienne), seulement avant aujourd'hui.
    for k in reverse 9..0 loop
      w := 9 - k;
      day := monday - 7 * k + (tpl.weekday - 1);
      continue when day >= current_date;
      continue when w = 4 and tpl.tpl_name = 'Legs';  -- une séance manquée, comme en vrai
      started := (day + time '18:15') at time zone 'Europe/Paris';
      session_id := gen_random_uuid();
      insert into sessions (id, user_id, template_id, name, started_at)
        values (session_id, uid, tpl_id, tpl.tpl_name, started);
      t := started;
      ex_order := 0;
      for ex in
        select p.*, e.id as exercise_id from demo_plan p
          join exercises e on e.user_id = uid and e.name = p.ex_name and e.deleted_at is null
         where p.tpl_name = tpl.tpl_name order by p.ex_pos
      loop
        weight := ex.start_kg + ex.step_kg * (w / ex.every);
        for s in 1..ex.sets loop
          -- Semaine de hausse de charge : une rep de moins ; fatigue au fil des séries.
          reps := greatest(ex.reps_min - 1,
                           ex.reps_max - (s - 1) - case when w % ex.every = 0 then 1 else 0 end);
          diff := case when s = 1 then 'easy' when s < ex.sets then 'medium' else 'hard' end;
          if s = ex.sets and ex.ex_pos = 0 and w % 4 = 3 then
            diff := 'fail';
            reps := ex.reps_min - 2;
          end if;
          t := t + make_interval(secs => ex.rest + 75);
          insert into session_sets
            (id, user_id, session_id, exercise_id, exercise_order, set_number, weight_kg, reps,
             difficulty, completed_at)
          values (gen_random_uuid(), uid, session_id, ex.exercise_id, ex_order, s, weight, reps,
                  diff, t);
        end loop;
        ex_order := ex_order + 1;
      end loop;
      update sessions set ended_at = t + interval '4 minutes' where id = session_id;
    end loop;
  end loop;

  -- Pesées : un dimanche matin sur deux, de 81,8 kg à ~79 kg, avec un peu de bruit.
  for k in reverse 10..0 loop
    day := monday - 1 - 7 * k;
    continue when k % 2 = 1 or day >= current_date;
    insert into body_weights (id, user_id, measured_on, weight_kg)
      values (gen_random_uuid(), uid, day,
              round(81.8 - 0.28 * (10 - k) + case when k % 4 = 0 then 0.2 else -0.1 end, 1));
  end loop;
end $$;
