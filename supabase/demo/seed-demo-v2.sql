-- Ajout multi-sport au compte de démonstration (vérification Apple de la 2.0.0, captures).
--
-- Prérequis : `seed-demo.sql` déjà lancé sur ce compte, migration `0006_multisport` appliquée.
-- SQL Editor → coller ce fichier → Run. Puis se déconnecter / reconnecter dans l'app.
-- À lancer quand AUCUNE vérification Apple n'est en cours. Ne touche que le compte démo.
--
-- Contenu : disciplines (muscu, course, cross-training, Hyrox) et exercices du catalogue,
-- séance type « Simu Hyrox » le samedi (échauffement, Hyrox complet Open Homme, muscu), séance
-- type « WOD » (AMRAP 12 min) hors planning, et un historique : deux simus Hyrox (la seconde plus
-- rapide, avec un point faible sur les Burpee Broad Jumps), un AMRAP et un footing de 5 km.
-- Refuse de tourner deux fois.

do $$
declare
  demo_email constant text := 'demo.surcharge@johanpoyet.fr';
  uid uuid;
  monday date := date_trunc('week', current_date)::date;
  ex_id uuid;
  hyrox_tpl uuid := gen_random_uuid();
  wod_tpl uuid := gen_random_uuid();
  warmup_block uuid := gen_random_uuid();
  hyrox_block uuid := gen_random_uuid();
  strength_block uuid := gen_random_uuid();
  amrap_block uuid := gen_random_uuid();
  sim record;
  seg record;
  session_id uuid;
  sb_hyrox uuid;
  started timestamptz;
  t timestamptz;
  splits int[];
  run_s int;
  station_s int;
  k int;
begin
  select id into uid from auth.users where email = demo_email;
  if uid is null then
    raise exception 'Compte % introuvable.', demo_email;
  end if;
  if to_regclass('public.template_blocks') is null then
    raise exception 'Migration 0006_multisport absente : appliquer d''abord la migration.';
  end if;
  if exists (select 1 from workout_templates where user_id = uid and name = 'Simu Hyrox'
             and deleted_at is null) then
    raise exception 'Le compte % a déjà « Simu Hyrox » : script non relancé.', demo_email;
  end if;
  if not exists (select 1 from exercises where user_id = uid and name = 'Hip thrust'
                 and deleted_at is null) then
    raise exception 'Bibliothèque par défaut absente : lancer d''abord seed-demo.sql.';
  end if;

  update profiles set disciplines = '{strength,running,cross_training,hyrox}' where id = uid;

  -- Catalogue (mêmes clés, noms et types que src/db/seed.ts et src/features/hyrox/catalog.ts).
  create temp table demo_catalog (
    key text, name text, muscle muscle_group, equipment equipment,
    disc discipline, tracking tracking_type
  ) on commit drop;
  insert into demo_catalog values
    ('hyrox_run', 'Hyrox Run 1 km', 'legs', 'bodyweight', 'hyrox', 'distance_time'),
    ('hyrox_skierg', 'SkiErg', 'other', 'machine', 'hyrox', 'distance_time'),
    ('hyrox_sled_push', 'Sled Push', 'legs', 'other', 'hyrox', 'weight_distance'),
    ('hyrox_sled_pull', 'Sled Pull', 'back', 'other', 'hyrox', 'weight_distance'),
    ('hyrox_burpee_broad_jumps', 'Burpee Broad Jumps', 'other', 'bodyweight', 'hyrox', 'distance_time'),
    ('hyrox_rowing', 'Rowing', 'back', 'machine', 'hyrox', 'distance_time'),
    ('hyrox_farmers_carry', 'Farmers Carry', 'other', 'other', 'hyrox', 'weight_distance'),
    ('hyrox_sandbag_lunges', 'Sandbag Lunges', 'legs', 'other', 'hyrox', 'weight_distance'),
    ('hyrox_wall_balls', 'Wall Balls', 'legs', 'other', 'hyrox', 'reps'),
    ('run_easy', 'Footing', 'legs', 'bodyweight', 'running', 'distance_time'),
    ('burpee', 'Burpees', 'other', 'bodyweight', 'cross_training', 'reps'),
    ('wall_ball', 'Wall balls', 'legs', 'other', 'cross_training', 'reps');
  insert into exercises (id, user_id, name, muscle, equipment, weight_step, discipline,
                         tracking_type, catalog_key)
  select gen_random_uuid(), uid, c.name, c.muscle, c.equipment,
         case when c.equipment = 'machine' then 5 else 2.5 end, c.disc, c.tracking, c.key
  from demo_catalog c
  where not exists (select 1 from exercises e where e.user_id = uid and e.catalog_key = c.key);

  -- Segments d'un Hyrox complet Open Homme : ordre, exercice, distance, charge, reps.
  create temp table demo_segments (
    pos int, kind text, key text, distance int, weight numeric, reps int
  ) on commit drop;
  insert into demo_segments values
    (0, 'run', 'hyrox_run', 1000, 0, 0), (1, 'station', 'hyrox_skierg', 1000, 0, 0),
    (2, 'run', 'hyrox_run', 1000, 0, 0), (3, 'station', 'hyrox_sled_push', 50, 152, 0),
    (4, 'run', 'hyrox_run', 1000, 0, 0), (5, 'station', 'hyrox_sled_pull', 50, 103, 0),
    (6, 'run', 'hyrox_run', 1000, 0, 0), (7, 'station', 'hyrox_burpee_broad_jumps', 80, 0, 0),
    (8, 'run', 'hyrox_run', 1000, 0, 0), (9, 'station', 'hyrox_rowing', 1000, 0, 0),
    (10, 'run', 'hyrox_run', 1000, 0, 0), (11, 'station', 'hyrox_farmers_carry', 200, 24, 0),
    (12, 'run', 'hyrox_run', 1000, 0, 0), (13, 'station', 'hyrox_sandbag_lunges', 100, 20, 0),
    (14, 'run', 'hyrox_run', 1000, 0, 0), (15, 'station', 'hyrox_wall_balls', 0, 6, 100);

  -- Séance type « Simu Hyrox » (samedi) : échauffement, Hyrox, muscu.
  insert into workout_templates (id, user_id, name, position) values (hyrox_tpl, uid, 'Simu Hyrox', 3);
  insert into template_blocks (id, user_id, template_id, position, type, config) values
    (warmup_block, uid, hyrox_tpl, 0, 'warmup', '{"durationMin": 10, "note": "Footing léger + mobilité"}'),
    (hyrox_block, uid, hyrox_tpl, 1, 'hyrox', '{"format": "full", "division": "open_men"}'),
    (strength_block, uid, hyrox_tpl, 2, 'strength', '{}');
  insert into template_exercises (id, user_id, template_id, exercise_id, block_id, position,
                                  target_sets, target_reps_min, target_reps_max, rest_seconds)
  select gen_random_uuid(), uid, hyrox_tpl, e.id, strength_block, x.pos, 3, x.rmin, x.rmax, 60
  from (values ('Hip thrust', 0, 10, 12), ('Relevé de jambes', 1, 12, 15)) as x(name, pos, rmin, rmax)
  join exercises e on e.user_id = uid and e.name = x.name and e.deleted_at is null;
  delete from weekly_schedule where user_id = uid and weekday = 6;
  insert into weekly_schedule (id, user_id, weekday, template_id)
    values (gen_random_uuid(), uid, 6, hyrox_tpl);

  -- Séance type « WOD » : AMRAP 12 min (10 burpees, 15 wall balls), hors planning.
  insert into workout_templates (id, user_id, name, position) values (wod_tpl, uid, 'WOD', 4);
  insert into template_blocks (id, user_id, template_id, position, type, config) values
    (amrap_block, uid, wod_tpl, 0, 'circuit', '{"format": "amrap", "durationS": 720}');
  insert into template_exercises (id, user_id, template_id, exercise_id, block_id, position,
                                  target_sets, target_reps_min, target_reps_max, rest_seconds)
  select gen_random_uuid(), uid, wod_tpl, e.id, amrap_block, x.pos, 1, x.reps, x.reps, 0
  from (values ('burpee', 0, 10), ('wall_ball', 1, 15)) as x(key, pos, reps)
  join exercises e on e.user_id = uid and e.catalog_key = x.key;

  -- Deux simus passées (samedis) : la seconde plus rapide, Burpee Broad Jumps +31 s.
  create temp table demo_sims (n int, day date, splits int[]) on commit drop;
  insert into demo_sims values
    (1, monday - 9, array[290,262,298,245,301,232,305,290,300,252,296,127,302,305,298,348]),
    (2, monday - 2, array[284,256,290,228,295,208,297,321,293,247,290,124,294,272,286,301]);

  for sim in select * from demo_sims order by n loop
    session_id := gen_random_uuid();
    sb_hyrox := gen_random_uuid();
    started := (sim.day + time '09:30') at time zone 'Europe/Paris';
    splits := sim.splits;
    run_s := 0;
    station_s := 0;
    for k in 1..16 loop
      if k % 2 = 1 then run_s := run_s + splits[k]; else station_s := station_s + splits[k]; end if;
    end loop;

    insert into sessions (id, user_id, template_id, name, started_at, ended_at)
      values (session_id, uid, hyrox_tpl, 'Simu Hyrox', started,
              started + make_interval(secs => 600 + run_s + station_s + 900));
    insert into session_blocks (id, user_id, session_id, template_block_id, position, type,
                                config, result, started_at, ended_at) values
      (gen_random_uuid(), uid, session_id, warmup_block, 0, 'warmup',
       '{"durationMin": 10, "note": "Footing léger + mobilité"}', '{}',
       started, started + interval '10 minutes'),
      (sb_hyrox, uid, session_id, hyrox_block, 1, 'hyrox',
       '{"format": "full", "division": "open_men"}',
       jsonb_build_object('totalS', run_s + station_s, 'runS', run_s, 'stationsS', station_s,
                          'splits', to_jsonb(splits)),
       started + interval '10 minutes',
       started + make_interval(secs => 600 + run_s + station_s)),
      (gen_random_uuid(), uid, session_id, strength_block, 2, 'strength', '{}', '{}',
       started + make_interval(secs => 600 + run_s + station_s),
       started + make_interval(secs => 600 + run_s + station_s + 900));

    t := started + interval '10 minutes';
    for seg in select * from demo_segments order by pos loop
      t := t + make_interval(secs => splits[seg.pos + 1]);
      select id into ex_id from exercises where user_id = uid and catalog_key = seg.key limit 1;
      insert into session_sets (id, user_id, session_id, exercise_id, exercise_order, set_number,
                                weight_kg, reps, completed_at, block_id, distance_m, duration_s)
        values (gen_random_uuid(), uid, session_id, ex_id, seg.pos, 1, seg.weight, seg.reps, t,
                sb_hyrox, nullif(seg.distance, 0), splits[seg.pos + 1]);
    end loop;
  end loop;

  -- AMRAP (mardi dernier) : 7 tours + 12 reps.
  session_id := gen_random_uuid();
  started := ((monday - 6) + time '18:30') at time zone 'Europe/Paris';
  insert into sessions (id, user_id, template_id, name, started_at, ended_at)
    values (session_id, uid, wod_tpl, 'WOD', started, started + interval '14 minutes');
  insert into session_blocks (id, user_id, session_id, template_block_id, position, type, config,
                              result, started_at, ended_at)
    values (gen_random_uuid(), uid, session_id, amrap_block, 0, 'circuit',
            '{"format": "amrap", "durationS": 720}', '{"rounds": 7, "extraReps": 12}',
            started + interval '1 minute', started + interval '13 minutes');

  -- Footing de 5 km (jeudi dernier) en 27:30.
  session_id := gen_random_uuid();
  sb_hyrox := gen_random_uuid();
  started := ((monday - 4) + time '07:15') at time zone 'Europe/Paris';
  select id into ex_id from exercises where user_id = uid and catalog_key = 'run_easy' limit 1;
  insert into sessions (id, user_id, name, started_at, ended_at)
    values (session_id, uid, 'Footing', started, started + interval '30 minutes');
  insert into session_blocks (id, user_id, session_id, position, type, config, result,
                              started_at, ended_at)
    values (sb_hyrox, uid, session_id, 0, 'cardio', '{}',
            '{"totalDistanceM": 5000, "totalS": 1650}', started, started + interval '28 minutes');
  insert into session_sets (id, user_id, session_id, exercise_id, exercise_order, set_number,
                            weight_kg, reps, completed_at, block_id, distance_m, duration_s)
    values (gen_random_uuid(), uid, session_id, ex_id, 0, 1, 0, 0,
            started + interval '28 minutes', sb_hyrox, 5000, 1650);
end $$;
