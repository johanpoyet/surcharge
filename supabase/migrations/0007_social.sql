-- V2 — Amis (SPEC_V2 §6). Migration additive : les versions déjà installées ne lisent ni n'écrivent
-- ces tables et colonnes. Les amis ne lisent jamais les tables privées (séances, séries, poids) :
-- seulement des tables publiques agrégées, écrites par l'app du propriétaire.
--
-- Écarts au SPEC (voir docs/DECISIONS.md) : code ami, recherche et pseudo passent par des fonctions
-- SQL (RPC) plutôt que par des Edge Functions ; les réponses aux demandes et le blocage aussi, pour
-- qu'un utilisateur ne puisse pas accepter sa propre demande ni lever un blocage qui le vise.

-- —— Profil ——
alter table profiles
  add column username text unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  add column friend_code text unique,
  add column share_sessions boolean not null default true,
  add column share_records boolean not null default true,
  add column share_exact_weights boolean not null default false;
-- Le poids corporel n'est JAMAIS partagé : aucune colonne de réglage, aucune table publique.

-- Code ami « PRÉNOM-XXX » : lettres du prénom sans accents (8 au plus), 3 caractères sans 0/O/1/I.
create or replace function public.make_friend_code(first_name text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  base text := upper(left(regexp_replace(
    translate(coalesce(first_name, ''),
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ',
      'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'),
    '[^A-Za-z]', '', 'g'), 8));
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  if base = '' then base := 'AMI'; end if;
  loop
    code := base || '-' || (
      select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '')
      from generate_series(1, 3)
    );
    exit when not exists (select 1 from public.profiles p where p.friend_code = code);
  end loop;
  return code;
end;
$$;
revoke execute on function public.make_friend_code(text) from public, anon, authenticated;

-- Pseudos interdits : même liste que src/features/social/bannedWords.ts (contrôle côté app aussi).
create or replace function public.is_banned_username(name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (
    select 1 from unnest(array[
      'admin','moderateur','moderator','surcharge','support','staff',
      'pute','putain','salope','connard','connasse','encule','enculer','batard','nique','niquer',
      'merde','bite','couille','chatte','pd','pedale','tapette','negre','bougnoul','youpin',
      'nazi','hitler','fuck','shit','bitch','cunt','dick','nigger','nigga','fag','faggot','whore',
      'slut','porn','porno','sex','sexe','viol','rape'
    ]) as w
    where replace(replace(lower(name), '_', ''), '.', '') like '%' || w || '%'
  );
$$;

-- Code ami attribué à la création du profil ; pseudo et code ne se changent pas en écrivant
-- directement la ligne (anciennes versions comprises) : seulement via set_username().
create or replace function public.protect_social_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.friend_code := public.make_friend_code(new.first_name);
    if new.username is not null and current_setting('surcharge.set_username', true) is distinct from 'on' then
      new.username := null;
    end if;
  else
    if new.friend_code is distinct from old.friend_code then
      new.friend_code := coalesce(old.friend_code, public.make_friend_code(new.first_name));
    end if;
    if new.username is distinct from old.username
       and current_setting('surcharge.set_username', true) is distinct from 'on' then
      new.username := old.username;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.protect_social_profile() from public, anon, authenticated;

create trigger profiles_social before insert or update on profiles
  for each row execute procedure public.protect_social_profile();

-- Comptes existants : un code chacun.
update profiles set friend_code = public.make_friend_code(first_name) where friend_code is null;

-- —— Amitiés ——
create type friendship_status as enum ('pending','accepted','declined','blocked');

create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users on delete cascade,
  addressee_id uuid not null references auth.users on delete cascade,
  status friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index friendships_pair
  on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee on friendships (addressee_id);
create trigger friendships_updated_at before update on friendships
  for each row execute procedure extensions.moddatetime(updated_at);

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  );
$$;

alter table friendships enable row level security;
-- Un blocage n'est visible que de celui qui bloque.
create policy "see own friendships" on friendships for select
  using (auth.uid() in (requester_id, addressee_id)
    and (status <> 'blocked' or requester_id = auth.uid()));
create policy "request friendship" on friendships for insert
  with check (requester_id = auth.uid() and status = 'pending');
-- Pas de policy update : réponse et blocage passent par les fonctions ci-dessous.
-- Retirer un ami ou annuler sa demande ; seul celui qui bloque peut lever le blocage.
create policy "remove friendship" on friendships for delete
  using (auth.uid() in (requester_id, addressee_id)
    and (status <> 'blocked' or requester_id = auth.uid()));

-- Répondre à une demande reçue (accepter ou refuser).
create or replace function public.respond_friend_request(request_id uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.friendships
     set status = case when accept then 'accepted'::public.friendship_status
                       else 'declined'::public.friendship_status end
   where id = request_id and addressee_id = auth.uid() and status = 'pending';
  if not found then raise exception 'request_not_found'; end if;
end;
$$;

-- Bloquer : une seule ligne pour la paire, le bloqueur en requester_id.
create or replace function public.block_user(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null or target is null or target = me then raise exception 'invalid_target'; end if;
  -- Déjà bloqué par l'autre : rien à faire (on ne lui révèle pas le blocage).
  if exists (select 1 from public.friendships
             where requester_id = target and addressee_id = me and status = 'blocked') then
    return;
  end if;
  delete from public.friendships
   where least(requester_id, addressee_id) = least(me, target)
     and greatest(requester_id, addressee_id) = greatest(me, target);
  insert into public.friendships (requester_id, addressee_id, status)
  values (me, target, 'blocked');
end;
$$;

-- Envoyer une demande : refusée silencieusement s'il existe déjà une relation (dont un blocage).
create or replace function public.send_friend_request(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  existing public.friendships;
begin
  if me is null or target is null or target = me then raise exception 'invalid_target'; end if;
  select * into existing from public.friendships
   where least(requester_id, addressee_id) = least(me, target)
     and greatest(requester_id, addressee_id) = greatest(me, target);
  if existing.id is null then
    insert into public.friendships (requester_id, addressee_id) values (me, target);
    return 'sent';
  end if;
  if existing.status = 'blocked' and existing.requester_id = me then
    raise exception 'blocked_by_you';
  end if;
  -- Bloqué par l'autre : on fait comme si la demande était partie (le blocage reste invisible).
  if existing.status = 'blocked' then return 'sent'; end if;
  if existing.status = 'accepted' then return 'already_friends'; end if;
  -- L'autre m'avait déjà demandé : on accepte directement.
  if existing.status = 'pending' and existing.addressee_id = me then
    update public.friendships set status = 'accepted' where id = existing.id;
    return 'accepted';
  end if;
  if existing.status = 'pending' then return 'already_sent'; end if;
  -- Refusée auparavant : nouvelle demande, de moi vers l'autre.
  delete from public.friendships where id = existing.id;
  insert into public.friendships (requester_id, addressee_id) values (me, target);
  return 'sent';
end;
$$;

-- Profils des amis, des demandes et des personnes que j'ai bloquées : prénom, pseudo, code.
-- La table profiles n'est jamais ouverte en lecture aux autres.
create or replace function public.get_friend_profiles()
returns table (
  friendship_id uuid,
  user_id uuid,
  first_name text,
  username text,
  friend_code text,
  status public.friendship_status,
  incoming boolean,
  since timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id,
         p.id,
         p.first_name,
         p.username,
         case when f.status = 'accepted' then p.friend_code end,
         f.status,
         f.addressee_id = auth.uid(),
         f.updated_at
    from public.friendships f
    join public.profiles p
      on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
   where auth.uid() in (f.requester_id, f.addressee_id)
     and f.status <> 'declined'
     and (f.status <> 'blocked' or f.requester_id = auth.uid());
$$;

-- —— Recherche d'un utilisateur (code ami ou pseudo exact), débit limité ——
create table user_lookups (
  user_id uuid not null references auth.users on delete cascade,
  at timestamptz not null default now()
);
create index user_lookups_user on user_lookups (user_id, at desc);
alter table user_lookups enable row level security;
-- Aucune policy : seule find_user() y écrit.

create or replace function public.find_user(query text)
returns table (id uuid, first_name text, username text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  q text := trim(coalesce(query, ''));
begin
  if me is null then raise exception 'unauthorized'; end if;
  if (select count(*) from public.user_lookups l
       where l.user_id = me and l.at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limited';
  end if;
  insert into public.user_lookups (user_id) values (me);
  delete from public.user_lookups l where l.user_id = me and l.at < now() - interval '1 hour';
  if q = '' then return; end if;
  return query
    select p.id, p.first_name, p.username
      from public.profiles p
     where (p.friend_code = upper(q) or p.username = lower(ltrim(q, '@')))
       and p.id <> me
       -- Une personne qui m'a bloqué est introuvable.
       and not exists (select 1 from public.friendships f
                        where f.requester_id = p.id and f.addressee_id = me and f.status = 'blocked')
     limit 1;
end;
$$;

-- —— Pseudo ——
create or replace function public.set_username(name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  clean text := lower(trim(coalesce(name, '')));
begin
  if me is null then raise exception 'unauthorized'; end if;
  if clean !~ '^[a-z0-9_.]{3,20}$' then raise exception 'invalid_username'; end if;
  if public.is_banned_username(clean) then raise exception 'banned_username'; end if;
  if exists (select 1 from public.profiles p where p.username = clean and p.id <> me) then
    raise exception 'username_taken';
  end if;
  perform set_config('surcharge.set_username', 'on', true);
  update public.profiles set username = clean where id = me;
  perform set_config('surcharge.set_username', 'off', true);
  return clean;
end;
$$;

-- —— Stats publiques (écrites par l'app du propriétaire, lues par ses amis) ——
create table public_stats (
  user_id uuid primary key references auth.users on delete cascade,
  week_start date not null,
  sessions_this_week smallint not null default 0,
  weekly_goal smallint not null default 1,
  streak_weeks smallint not null default 0,
  sessions_this_month smallint not null default 0,
  records_this_week smallint not null default 0,
  records_this_month smallint not null default 0,
  updated_at timestamptz not null default now()
);

create table public_exercise_stats (
  user_id uuid not null references auth.users on delete cascade,
  catalog_key text not null,
  progress_pct_3m numeric(6,2),
  best_weight_kg numeric(6,2),            -- null si share_exact_weights = false
  best_time_s int,                         -- course : meilleure allure (s / km)
  updated_at timestamptz not null default now(),
  primary key (user_id, catalog_key)
);

create type activity_type as enum ('record','streak','hyrox_done','session_done');
create table activity_events (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  type activity_type not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index activity_events_user on activity_events (user_id, created_at desc);

create table kudos (
  event_id uuid not null references activity_events on delete cascade,
  from_user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, from_user_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users on delete cascade,
  reported_id uuid not null references auth.users on delete cascade,
  reason text not null check (length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public_stats enable row level security;
create policy "write own" on public_stats for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "friends read" on public_stats for select
  using (public.are_friends(auth.uid(), user_id));

alter table public_exercise_stats enable row level security;
create policy "write own" on public_exercise_stats for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "friends read" on public_exercise_stats for select
  using (public.are_friends(auth.uid(), user_id));

alter table activity_events enable row level security;
create policy "write own" on activity_events for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "friends read" on activity_events for select
  using (public.are_friends(auth.uid(), user_id));

alter table kudos enable row level security;
create policy "give kudos" on kudos for insert
  with check (from_user_id = auth.uid()
    and public.are_friends(auth.uid(), (select e.user_id from public.activity_events e where e.id = event_id)));
create policy "see kudos" on kudos for select
  using (from_user_id = auth.uid()
    or exists (select 1 from public.activity_events e where e.id = event_id and e.user_id = auth.uid()));
create policy "remove own kudos" on kudos for delete using (from_user_id = auth.uid());

alter table reports enable row level security;
create policy "create report" on reports for insert with check (reporter_id = auth.uid());
-- Pas de select : les signalements ne sont lus que depuis le tableau de bord Supabase.

-- Fonctions appelables par un utilisateur connecté seulement.
revoke execute on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke execute on function public.block_user(uuid) from public, anon;
revoke execute on function public.send_friend_request(uuid) from public, anon;
revoke execute on function public.get_friend_profiles() from public, anon;
revoke execute on function public.find_user(text) from public, anon;
revoke execute on function public.set_username(text) from public, anon;
revoke execute on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.get_friend_profiles() to authenticated;
grant execute on function public.find_user(text) to authenticated;
grant execute on function public.set_username(text) to authenticated;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
