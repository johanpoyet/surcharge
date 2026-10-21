// Teste les migrations 0001 → 0007 sur un vrai Postgres (PGlite), avec un faux schéma auth/storage
// de Supabase, puis vérifie la RLS des amis avec trois utilisateurs.
// Usage (PGlite n'est pas une dépendance du projet : l'installer dans un dossier à part) :
//   mkdir -p /tmp/pglite && cd /tmp/pglite && npm init -y && npm i @electric-sql/pglite
//   cp <dépôt>/supabase/tests/social-rls.mjs /tmp/pglite/ && node /tmp/pglite/social-rls.mjs <dépôt>/supabase/migrations
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const db = new PGlite();
let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? '✓' : '✗'} ${label}`);
  if (!cond) failures++;
};

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema extensions; create schema storage;
  grant usage on schema public, auth, extensions, storage to anon, authenticated, service_role;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated;
  create function extensions.moddatetime() returns trigger language plpgsql as
    $$ begin new.updated_at := now(); return new; end $$;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (bucket_id text, name text, owner uuid);
  create function storage.foldername(name text) returns text[] language sql as
    $$ select string_to_array(name, '/') $$;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`);

for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  const sql = readFileSync(join(dir, file), 'utf8').replace(
    /create extension if not exists moddatetime[^;]*;/,
    '',
  );
  if (file.startsWith('0007')) {
    // Compte V1 existant avant la migration sociale.
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-00000000000d', 'd@test.fr', '{"first_name":"Léa"}')`);
  }
  await db.exec(sql);
  console.log(`migration ${file} appliquée`);
}
const D = '00000000-0000-0000-0000-00000000000d';
const old = (await db.query(`select friend_code from profiles where id = $1`, [D])).rows[0];
ok(/^LEA-[A-Z2-9]{3}$/.test(old.friend_code), `compte existant : code attribué (${old.friend_code})`);
// Ancienne version de l'app : upsert du profil avec ses seules colonnes connues.
await as(D, `insert into profiles (id, first_name, weight_unit, created_at, updated_at) values ($1, 'Léa B', 'kg', now(), now())
  on conflict (id) do update set first_name = excluded.first_name, weight_unit = excluded.weight_unit`, [D]);
const after = (await db.query(`select first_name, friend_code, share_exact_weights from profiles where id = $1`, [D])).rows[0];
ok(after.first_name === 'Léa B' && after.friend_code === old.friend_code && after.share_exact_weights === false, 'ancienne version : profil mis à jour, code et réglages intacts');

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
const C = '00000000-0000-0000-0000-00000000000c';
// Compte existant avant 0007 ? Ici les profils naissent après : on vérifie le code à l'insertion.
for (const [id, name] of [[A, 'Johan'], [B, 'Élodie'], [C, '']]) {
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
    id,
    `${id.slice(-1)}@test.fr`,
    { first_name: name },
  ]);
}

/** Exécute une requête comme l'utilisateur donné (rôle authenticated, auth.uid() = id). */
async function as(id, sql, params = []) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${id}', false);`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec(`reset role;`);
  }
}
async function fails(id, sql, params = []) {
  try {
    await as(id, sql, params);
    return null;
  } catch (e) {
    return e.message;
  }
}

const codes = (await db.query(`select id, first_name, friend_code from profiles order by id`)).rows;
ok(/^JOHAN-[A-Z2-9]{3}$/.test(codes[0].friend_code), `code ami ${codes[0].friend_code}`);
ok(/^ELODIE-[A-Z2-9]{3}$/.test(codes[1].friend_code), `code sans accent ${codes[1].friend_code}`);
ok(/^C-[A-Z2-9]{3}$/.test(codes[2].friend_code) || /^AMI-/.test(codes[2].friend_code), `code par défaut ${codes[2].friend_code}`);

// Données privées de B.
await db.query(`insert into exercises (id, user_id, name, muscle, equipment, created_at, updated_at)
  values (gen_random_uuid(), $1, 'Squat', 'legs', 'barbell', now(), now())`, [B]);

// Pseudo : direct interdit, RPC contrôlée.
await as(A, `update profiles set username = 'pirate', friend_code = 'X-AAA' where id = $1`, [A]);
let me = (await db.query(`select username, friend_code from profiles where id = $1`, [A])).rows[0];
ok(me.username === null && me.friend_code === codes[0].friend_code, 'pseudo et code non modifiables en direct');
ok((await fails(A, `select set_username('Ab')`))?.includes('invalid_username'), 'pseudo trop court refusé');
ok((await fails(A, `select set_username('gros_connard')`))?.includes('banned_username'), 'pseudo grossier refusé');
await as(A, `select set_username('Johan.P')`);
await as(B, `select set_username('elo_run')`);
ok((await fails(C, `select set_username('johan.p')`))?.includes('username_taken'), 'pseudo déjà pris refusé');
me = (await db.query(`select username from profiles where id = $1`, [A])).rows[0];
ok(me.username === 'johan.p', `pseudo enregistré en minuscules (${me.username})`);

// Recherche exacte uniquement, jamais soi-même.
let found = (await as(A, `select * from find_user($1)`, [codes[1].friend_code.toLowerCase()])).rows;
ok(found.length === 1 && found[0].id === B && !('friend_code' in found[0]), 'recherche par code ami');
found = (await as(A, `select * from find_user('@elo_run')`)).rows;
ok(found.length === 1 && found[0].id === B, 'recherche par pseudo exact');
ok((await as(A, `select * from find_user('elo')`)).rows.length === 0, 'pas de recherche partielle');
ok((await as(A, `select * from find_user('johan.p')`)).rows.length === 0, 'on ne se trouve pas soi-même');

// Profils et tables privées fermés aux autres.
ok((await as(A, `select * from profiles where id = $1`, [B])).rows.length === 0, 'profil de B illisible par A');
ok((await as(A, `select * from exercises where user_id = $1`, [B])).rows.length === 0, 'exercices de B illisibles par A');

// Stats publiques : avant amitié, invisibles.
await as(B, `insert into public_stats (user_id, week_start, sessions_this_week) values ($1, current_date, 3)`, [B]);
await as(B, `insert into activity_events (id, user_id, type, payload) values (gen_random_uuid(), $1, 'record', '{"exerciseName":"Squat"}')`, [B]);
ok((await as(A, `select * from public_stats where user_id = $1`, [B])).rows.length === 0, 'non-ami : stats invisibles');
ok((await as(A, `select * from activity_events where user_id = $1`, [B])).rows.length === 0, 'non-ami : activité invisible');
ok((await fails(A, `insert into public_stats (user_id, week_start) values ($1, current_date)`, [B])) !== null, 'A ne peut pas écrire les stats de B');

// Demande puis auto-acceptation impossible.
ok((await as(A, `select send_friend_request($1) as r`, [B])).rows[0].r === 'sent', 'demande envoyée');
ok((await fails(A, `select respond_friend_request((select id from friendships limit 1), true)`))?.includes('request_not_found'), 'on ne peut pas accepter sa propre demande');
await as(A, `update friendships set status = 'accepted'`);
ok((await db.query(`select status from friendships`)).rows[0].status === 'pending', 'pas de mise à jour directe du statut');
let list = (await as(B, `select * from get_friend_profiles()`)).rows;
ok(list.length === 1 && list[0].incoming && list[0].first_name === 'Johan' && list[0].friend_code === null, 'B voit la demande de Johan (sans son code)');

// B accepte : les stats publiques deviennent visibles, jamais les tables privées.
await as(B, `select respond_friend_request($1, true)`, [list[0].friendship_id]);
ok((await as(A, `select * from public_stats where user_id = $1`, [B])).rows.length === 1, 'ami : stats visibles');
const events = (await as(A, `select * from activity_events where user_id = $1`, [B])).rows;
ok(events.length === 1, 'ami : activité visible');
ok((await as(A, `select * from exercises where user_id = $1`, [B])).rows.length === 0, 'ami : exercices toujours privés');
ok((await as(A, `select * from profiles where id = $1`, [B])).rows.length === 0, 'ami : table profiles toujours fermée');
list = (await as(A, `select * from get_friend_profiles()`)).rows;
ok(list.length === 1 && list[0].status === 'accepted' && list[0].username === 'elo_run', 'A voit son amie et son pseudo');

// Bravos : seulement entre amis ; C (non-ami) refusé.
await as(A, `insert into kudos (event_id, from_user_id) values ($1, $2)`, [events[0].id, A]);
ok((await fails(C, `insert into kudos (event_id, from_user_id) values ($1, $2)`, [events[0].id, C])) !== null, 'non-ami : bravo refusé');
ok((await as(B, `select * from kudos`)).rows.length === 1, 'B voit le bravo reçu');

// Signalement : écrit, jamais relu.
await as(A, `insert into reports (reporter_id, reported_id, reason) values ($1, $2, 'test')`, [A, C]);
ok((await as(A, `select * from reports`)).rows.length === 0, 'signalements illisibles');

// Blocage par B : A perd tout, ne voit pas le blocage, ne peut pas le lever ni redemander.
await as(B, `select block_user($1)`, [A]);
ok((await as(A, `select * from public_stats where user_id = $1`, [B])).rows.length === 0, 'bloqué : stats invisibles');
ok((await as(A, `select * from get_friend_profiles()`)).rows.length === 0, 'bloqué : B disparaît de la liste de A');
ok((await as(A, `select * from friendships`)).rows.length === 0, 'bloqué : le blocage est invisible pour A');
await as(A, `delete from friendships`);
ok((await db.query(`select status from friendships`)).rows[0].status === 'blocked', 'A ne peut pas lever le blocage');
ok((await as(A, `select send_friend_request($1) as r`, [B])).rows[0].r === 'sent', 'A redemande : réponse neutre');
ok((await db.query(`select count(*)::int as n from friendships`)).rows[0].n === 1, '… mais aucune demande créée');
ok((await as(A, `select * from find_user('elo_run')`)).rows.length === 0, 'bloqué : B introuvable pour A');
list = (await as(B, `select * from get_friend_profiles()`)).rows;
ok(list.length === 1 && list[0].status === 'blocked', 'B voit qui il a bloqué');
ok((await fails(B, `select send_friend_request($1)`, [A]))?.includes('blocked_by_you'), 'B doit débloquer avant de redemander');
await as(B, `delete from friendships`);
ok((await db.query(`select count(*)::int as n from friendships`)).rows[0].n === 0, 'B lève son blocage');

// Débit limité de la recherche.
let limited = null;
for (let i = 0; i < 25 && !limited; i++) limited = await fails(C, `select * from find_user('x')`);
ok(limited?.includes('rate_limited'), 'recherche limitée à 20 par minute');

// Fonctions fermées à anon.
await db.exec(`set role anon;`);
let anonError = null;
try { await db.query(`select * from find_user('elo_run')`); } catch (e) { anonError = e.message; }
await db.exec(`reset role;`);
ok(anonError !== null, 'anon ne peut pas chercher');

// Suppression du compte : cascade sur les nouvelles tables.
await db.query(`delete from auth.users where id = $1`, [B]);
const left = (await db.query(`select
  (select count(*) from public_stats where user_id = $1) +
  (select count(*) from activity_events where user_id = $1) +
  (select count(*) from kudos) +
  (select count(*) from friendships where $1 in (requester_id, addressee_id)) as n`, [B])).rows[0].n;
ok(Number(left) === 0, 'suppression du compte : plus rien de B');

console.log(failures === 0 ? '\nTOUT EST BON' : `\n${failures} ÉCHEC(S)`);
process.exit(failures === 0 ? 0 : 1);
