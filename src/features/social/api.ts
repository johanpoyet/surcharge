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
