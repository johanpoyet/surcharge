// Test de bout en bout sur le Supabase DEV (jamais la prod) : deux comptes de test.
// Usage : node --env-file=.env supabase/tests/social-e2e-dev.mjs (s’arrête si .env ne vise pas le dev).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url?.includes('bmstymcjxpustfzyjxpy')) throw new Error('Pas le projet dev : arrêt');

let failures = 0;
const ok = (cond, label) => { console.log(`${cond ? '✓' : '✗'} ${label}`); if (!cond) failures++; };

async function account(email, firstName) {
  const client = createClient(url, key, { auth: { persistSession: false } });
  const password = 'test-surcharge-e2e-2026';
  let { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    ({ data, error } = await client.auth.signUp({ email, password, options: { data: { first_name: firstName } } }));
    if (error) throw error;
  }
  return { client, id: data.user.id };
}

const A = await account('e2e.amis.a@example.com', 'Alice');
const B = await account('e2e.amis.b@example.com', 'Bruno');

// Repartir de zéro entre deux exécutions.
for (const u of [A, B]) {
  const { data } = await u.client.rpc('get_friend_profiles');
  for (const f of data ?? []) await u.client.from('friendships').delete().eq('id', f.friendship_id);
}

const { data: profileA } = await A.client.from('profiles').select('friend_code').eq('id', A.id).single();
ok(/^ALICE-[A-Z2-9]{3}$/.test(profileA.friend_code), `code ami d'Alice : ${profileA.friend_code}`);
const { data: setName, error: nameError } = await B.client.rpc('set_username', { name: 'bruno_e2e' });
ok(!nameError && setName === 'bruno_e2e', 'Bruno choisit son pseudo');

// Données privées de Bruno : une séance et une série.
const sessionId = crypto.randomUUID();
const exerciseId = crypto.randomUUID();
const now = new Date().toISOString();
await B.client.from('exercises').upsert({ id: exerciseId, user_id: B.id, name: 'Squat', muscle: 'legs', equipment: 'barbell', created_at: now, updated_at: now });
await B.client.from('sessions').upsert({ id: sessionId, user_id: B.id, name: 'Legs', started_at: now, ended_at: now, created_at: now, updated_at: now });
const setInsert = await B.client.from('session_sets').upsert({ id: crypto.randomUUID(), user_id: B.id, session_id: sessionId, exercise_id: exerciseId, exercise_order: 0, set_number: 1, weight_kg: 100, reps: 5, completed_at: now, created_at: now, updated_at: now });
ok(!setInsert.error, `Bruno enregistre une série${setInsert.error ? ' : ' + setInsert.error.message : ''}`);
for (const u of [A, B]) {
  const r = await u.client.from('public_stats').upsert({ user_id: u.id, week_start: now.slice(0, 10), sessions_this_week: u === A ? 2 : 3, weekly_goal: 3 });
  ok(!r.error, `stats publiques de ${u === A ? 'Alice' : 'Bruno'} envoyées`);
}

const seeBefore = await A.client.from('public_stats').select('*').eq('user_id', B.id);
ok(seeBefore.data?.length === 0, 'avant amitié : Alice ne voit pas les stats de Bruno');

// Alice trouve Bruno par son pseudo et l'invite ; Bruno accepte.
const { data: found } = await A.client.rpc('find_user', { query: '@bruno_e2e' });
ok(found?.[0]?.id === B.id, 'Alice trouve Bruno par son pseudo');
const { data: sent } = await A.client.rpc('send_friend_request', { target: B.id });
ok(sent === 'sent', 'demande envoyée');
const { data: incoming } = await B.client.rpc('get_friend_profiles');
ok(incoming?.[0]?.incoming === true && incoming[0].first_name === 'Alice', 'Bruno voit la demande d\'Alice');
const accept = await B.client.rpc('respond_friend_request', { request_id: incoming[0].friendship_id, accept: true });
ok(!accept.error, 'Bruno accepte');

const aSeesB = await A.client.from('public_stats').select('sessions_this_week').eq('user_id', B.id);
const bSeesA = await B.client.from('public_stats').select('sessions_this_week').eq('user_id', A.id);
ok(aSeesB.data?.[0]?.sessions_this_week === 3 && bSeesA.data?.[0]?.sessions_this_week === 2, 'amis : chacun voit les stats publiques de l\'autre');
const sets = await A.client.from('session_sets').select('*').eq('user_id', B.id);
const sessions = await A.client.from('sessions').select('*').eq('user_id', B.id);
const profile = await A.client.from('profiles').select('*').eq('id', B.id);
ok(sets.data?.length === 0 && sessions.data?.length === 0 && profile.data?.length === 0, 'amis : séries, séances et profil de Bruno restent privés');

// Nettoyage des données privées de test.
await B.client.from('session_sets').delete().eq('session_id', sessionId);
await B.client.from('sessions').delete().eq('id', sessionId);
await B.client.from('exercises').delete().eq('id', exerciseId);

console.log(failures === 0 ? '\nTOUT EST BON (Supabase dev)' : `\n${failures} ÉCHEC(S)`);
process.exit(failures ? 1 : 0);
