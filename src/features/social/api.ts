// Appels au serveur pour les amis (SPEC_V2 §6.2) : fonctions SQL (RPC) en security definer.
// La table profiles des autres n'est jamais lue directement.

import { supabase } from '@/lib/supabase';

export type FriendStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

export type FriendProfile = {
  friendshipId: string;
  userId: string;
  firstName: string;
  username: string | null;
  /** Code ami, seulement pour un ami accepté. */
  friendCode: string | null;
  status: FriendStatus;
  /** Demande reçue (et non envoyée). */
  incoming: boolean;
  since: string;
};

export type FoundUser = { id: string; firstName: string; username: string | null };

export type SendResult = 'sent' | 'accepted' | 'already_friends' | 'already_sent';

/** Erreurs métier renvoyées par les fonctions SQL. */
export type SocialError =
  | 'invalid_username'
  | 'banned_username'
  | 'username_taken'
  | 'rate_limited'
  | 'blocked_by_you'
  | 'request_not_found'
  | 'invalid_target'
  | 'network';

const KNOWN: readonly SocialError[] = [
  'invalid_username',
  'banned_username',
  'username_taken',
  'rate_limited',
  'blocked_by_you',
  'request_not_found',
  'invalid_target',
];

export class SocialApiError extends Error {
  constructor(readonly code: SocialError) {
    super(code);
  }
}

// Fonctions sociales absentes des types écrits à la main (database.types).
type Rpc = (
  fn: string,
  args?: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
const rpc: Rpc = (fn, args) => (supabase.rpc as unknown as Rpc).call(supabase, fn, args);
const fromTable = (table: string) =>
  (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(table);

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc(fn, args);
  if (error) {
    const code = KNOWN.find((known) => error.message.includes(known));
    throw new SocialApiError(code ?? 'network');
  }
  return data as T;
}

export const setUsername = (name: string) => call<string>('set_username', { name });

export async function findUser(query: string): Promise<FoundUser | null> {
  const rows = await call<{ id: string; first_name: string; username: string | null }[]>(
    'find_user',
    { query },
  );
  const row = rows?.[0];
  return row ? { id: row.id, firstName: row.first_name, username: row.username } : null;
}

export const sendFriendRequest = (target: string) =>
  call<SendResult>('send_friend_request', { target });

export const respondFriendRequest = (requestId: string, accept: boolean) =>
  call<void>('respond_friend_request', { request_id: requestId, accept });

export const blockUser = (target: string) => call<void>('block_user', { target });

export async function getFriendProfiles(): Promise<FriendProfile[]> {
  const rows = await call<
    {
      friendship_id: string;
      user_id: string;
      first_name: string;
      username: string | null;
      friend_code: string | null;
      status: FriendStatus;
      incoming: boolean;
      since: string;
    }[]
  >('get_friend_profiles');
  return (rows ?? []).map((r) => ({
    friendshipId: r.friendship_id,
    userId: r.user_id,
    firstName: r.first_name,
    username: r.username,
    friendCode: r.friend_code,
    status: r.status,
    incoming: r.incoming,
    since: r.since,
  }));
}

/** Retirer un ami, annuler une demande ou lever un blocage que l'on a posé. */
export async function removeFriendship(friendshipId: string): Promise<void> {
  const { error } = await fromTable('friendships').delete().eq('id', friendshipId);
  if (error) throw new SocialApiError('network');
}

export async function reportUser(reporterId: string, reportedId: string, reason: string) {
  const { error } = await fromTable('reports').insert({
    reporter_id: reporterId,
    reported_id: reportedId,
    reason: reason.slice(0, 500),
  } as never);
  if (error) throw new SocialApiError('network');
}

// —— Lecture des données publiques des amis (RLS : seulement les amis acceptés) ——

export type FriendStats = {
  user_id: string;
  week_start: string;
  sessions_this_week: number;
  weekly_goal: number;
  streak_weeks: number;
  sessions_this_month: number;
  records_this_week: number;
  records_this_month: number;
  updated_at: string;
};

export type FriendExerciseStats = {
  user_id: string;
  catalog_key: string;
  progress_pct_3m: number | null;
  best_weight_kg: number | null;
  best_time_s: number | null;
};

export type RemoteEvent = {
  id: string;
  user_id: string;
  type: 'record' | 'streak' | 'hyrox_done' | 'session_done';
  payload: Record<string, unknown>;
  created_at: string;
};

async function select<T>(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new SocialApiError('network');
  return (data ?? []) as T[];
}

const toNumber = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

export const fetchFriendStats = (ids: readonly string[]) =>
  ids.length === 0
    ? Promise.resolve([])
    : select<FriendStats>(
        fromTable('public_stats')
          .select('*')
          .in('user_id', [...ids]),
      );

export async function fetchExerciseStats(ids: readonly string[]): Promise<FriendExerciseStats[]> {
  if (ids.length === 0) return [];
  const rows = await select<FriendExerciseStats>(
    fromTable('public_exercise_stats')
      .select('*')
      .in('user_id', [...ids]),
  );
  // numeric Postgres → chaînes dans le JSON de PostgREST.
  return rows.map((r) => ({
    ...r,
    progress_pct_3m: toNumber(r.progress_pct_3m),
    best_weight_kg: toNumber(r.best_weight_kg),
    best_time_s: toNumber(r.best_time_s),
  }));
}

/** Les 30 dernières activités des amis. */
export const fetchFeed = (ids: readonly string[], limit = 30) =>
  ids.length === 0
    ? Promise.resolve([])
    : select<RemoteEvent>(
        fromTable('activity_events')
          .select('*')
          .in('user_id', [...ids])
          .order('created_at', { ascending: false })
          .limit(limit),
      );

/** Bravos que j'ai donnés parmi ces activités. */
export async function fetchMyKudos(me: string, eventIds: readonly string[]): Promise<Set<string>> {
  if (eventIds.length === 0) return new Set();
  const rows = await select<{ event_id: string }>(
    fromTable('kudos')
      .select('event_id')
      .eq('from_user_id', me)
      .in('event_id', [...eventIds]),
  );
  return new Set(rows.map((r) => r.event_id));
}

export async function setKudos(me: string, eventId: string, given: boolean): Promise<void> {
  const { error } = given
    ? await fromTable('kudos').insert({ event_id: eventId, from_user_id: me } as never)
    : await fromTable('kudos').delete().eq('event_id', eventId).eq('from_user_id', me);
  if (error) throw new SocialApiError('network');
}

/** Bravos reçus sur mes activités depuis une date (badge de l'onglet Amis). */
export async function countKudosReceived(me: string, since: string): Promise<number> {
  const { count, error } = await fromTable('kudos')
    .select('event_id', { count: 'exact', head: true })
    .neq('from_user_id', me)
    .gt('created_at', since);
  if (error) throw new SocialApiError('network');
  return count ?? 0;
}

/** Mon code ami et mon pseudo, lus sur le serveur (ma propre ligne profiles). */
export async function fetchMyIdentity(
  me: string,
): Promise<{ friendCode: string | null; username: string | null }> {
  const rows = await select<{ friend_code: string | null; username: string | null }>(
    fromTable('profiles').select('friend_code, username').eq('id', me),
  );
  return { friendCode: rows[0]?.friend_code ?? null, username: rows[0]?.username ?? null };
}
