// Suppression du compte (exigence App Store, SPEC 11) : photos du bucket puis utilisateur Auth.
// La suppression de `auth.users` efface en cascade toutes ses lignes (profil, exercices, séances…).
// La clé service role n'existe que côté serveur (variable fournie par Supabase aux Edge Functions).
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'exercise-photos';
const PAGE = 1000;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!url || !anonKey || !serviceKey) return json({ error: 'server_misconfigured' }, 500);
  if (!authorization) return json({ error: 'unauthorized' }, 401);

  // L'utilisateur est identifié par son propre jeton : on ne supprime que son compte.
  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Photos : tout le dossier {user_id}/ du bucket.
  for (;;) {
    const { data: files, error } = await admin.storage.from(BUCKET).list(user.id, { limit: PAGE });
    if (error) return json({ error: 'storage_list_failed' }, 500);
    if (!files || files.length === 0) break;
    const { error: removeError } = await admin.storage
      .from(BUCKET)
      .remove(files.map((file) => `${user.id}/${file.name}`));
    if (removeError) return json({ error: 'storage_remove_failed' }, 500);
    if (files.length < PAGE) break;
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return json({ error: 'delete_failed' }, 500);

  return json({ deleted: true });
});
