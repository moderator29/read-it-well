-- PUSH, PART ONE: THE TABLE A DEVICE IS REMEMBERED IN.
--
-- Push on this platform was zero of forty events. Not weak, not partial: no
-- token table, no FCM, no APNs, no entitlement, and an Android manifest that
-- said so in its own words. This is the first of three migrations that close
-- it, and it is the one everything else stands on.
--
-- A TOKEN IS A CAPABILITY, NOT AN IDENTIFIER. Whoever holds the string in
-- `token` can put a notification on that handset. That single fact decides
-- every choice below: who may read the column (nobody but the server and its
-- owner), what may be written beside it in an alert (never the token, only
-- `device_ref`), and why a dead token is retired rather than deleted.
--
-- ----------------------------------------------------------------------------
-- THE FOUR DECISIONS THAT ARE NOT OBVIOUS.
--
-- 1. `unique (token)` AND NOTHING ELSE UNIQUE. A handset may be handed to
--    somebody else, and both stores reissue the same registration token to
--    whoever installs next. If re-registration inserted a second row, the
--    previous owner would keep receiving the new owner's messages until the
--    token expired, which can be months. So a token is ONE row, ever, and a
--    change of owner is an UPDATE of `user_id`. This is the single most
--    common defect in a push implementation and the constraint is the fix.
--
-- 2. ONE PERSON, MANY DEVICES, ON PURPOSE. No unique on `user_id`. An agent
--    with a work phone and a tablet gets both. The partial index below is
--    what makes "all of this person's live devices" a cheap read.
--
-- 3. RETIRED, NEVER DELETED. `revoked_at` and `revoked_reason` are set when
--    a provider tells us the token is gone, or when the person revokes it
--    from the settings screen. A delete would let the next re-registration
--    from the same handset look like a brand new device and would lose the
--    reason it died, which is the only evidence we get that a build is
--    shedding tokens. Retirement also means a re-registration is an update
--    that clears `revoked_at`, not a duplicate row.
--
-- 4. `device_ref` EXISTS SO THAT NOTHING ELSE HAS TO CARRY THE TOKEN.
--    The house rule is that a personal datum never reaches a log line or an
--    alert detail, and a token is a personal datum of the worst kind. But a
--    desk still has to be able to say "this particular device has failed
--    eleven times". `device_ref` is a short, stable, generated digest: it
--    names a device across rows and across alerts, and it cannot be used to
--    send anything to it. Generated rather than written, so no caller can get
--    it wrong and no caller can put the real token there by mistake.
--
-- ----------------------------------------------------------------------------
-- WHO MAY WRITE. NOBODY, FROM THE CLIENT.
--
-- The research proposal for this table gave the person insert, update and
-- delete on their own rows. This does not, and the difference is deliberate.
-- Registration has to be able to MOVE a token from its previous owner to its
-- new one (decision 1), and a person cannot be given the right to update a row
-- that is not yet theirs without being given the right to update rows that are
-- not theirs at all. So registration goes through the service role in
-- `app/api/push/register`, which takes the user from the verified session and
-- never from the request body, the same rule `lib/notify/junction.ts` states
-- for email addresses.
--
-- What is left for row level security is the half that is safe: a person may
-- READ their own devices, because the settings screen lists them, and that is
-- all. Revocation is a route for the same reason registration is.

create type public.push_platform as enum ('web', 'ios', 'android');

comment on type public.push_platform is
  'Where a token can be delivered to. `web` is a Web Push subscription endpoint; `ios` and `android` are APNs and FCM registration tokens.';

create type public.push_revoked_reason as enum (
  /* The person turned this device off on the settings screen. */
  'by_person',
  /* The provider answered 404 or 410: the token is gone for good. */
  'provider_gone',
  /* The provider refused it as malformed or for the wrong sender. */
  'provider_invalid',
  /* Too many consecutive failures that were not fatal on their own. */
  'repeated_failure',
  /* Signed out, or the application was uninstalled and said so. */
  'signed_out'
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users (id) on delete cascade,

  platform public.push_platform not null,

  /* THE CAPABILITY. For `ios` and `android` the FCM or APNs registration
     token; for `web` the PushSubscription endpoint URL. Never selected into
     an alert, a log line, a view or an error message. */
  token text not null,

  /* Web Push only, null on native. Both are base64url values the browser
     generated, and both are useless to anybody without the private VAPID key
     that lives in the environment. */
  p256dh text,
  auth text,

  /* A SHORT NAME FOR A DEVICE THAT IS NOT THE DEVICE'S KEY.
     See decision 4 at the head. Twelve hex characters is enough to be stable
     and to read aloud, and `md5` is used rather than anything from an
     extension schema because a generated column's expression must resolve
     with no search path at all. */
  device_ref text not null generated always as (left(md5(token), 12)) stored,

  /* What the person will see on the settings screen. Chosen by the client
     from the handset model, so it is not a secret and it is not reliable;
     it exists so a person can tell two of their own devices apart. */
  device_label text,
  app_version text,

  created_at timestamptz not null default now(),
  /* Touched on every successful re-registration, which every launch does.
     A device that has not been seen for months is a device that is gone. */
  last_seen_at timestamptz not null default now(),

  /* Consecutive failures that were not fatal on their own. Reset to zero by
     any success. Used by the drain to retire a token that keeps not working
     without a provider ever saying it is dead. */
  failure_streak integer not null default 0,

  revoked_at timestamptz,
  revoked_reason public.push_revoked_reason,

  /* ONE ROW PER TOKEN, EVER. Decision 1 at the head. */
  constraint push_tokens_token_unique unique (token),

  /* A reason without a time, or a time without a reason, means somebody
     retired a token and did not record why. Both or neither. */
  constraint push_tokens_revoked_pair check (
    (revoked_at is null and revoked_reason is null)
    or (revoked_at is not null and revoked_reason is not null)
  ),

  /* Web Push cannot be encrypted without both halves of the subscription
     keys, so a `web` row missing either is a row the drain could only ever
     fail on. Refuse it at the door instead. */
  constraint push_tokens_web_keys check (
    platform <> 'web'
    or (p256dh is not null and auth is not null)
  ),

  /* Native tokens have no subscription keys. A row carrying them is a row
     written by code that has confused the two transports. */
  constraint push_tokens_native_keys check (
    platform = 'web'
    or (p256dh is null and auth is null)
  )
);

comment on table public.push_tokens is
  'One row per push token, ever. A person may hold many devices; a token that changes owner is an update of user_id, never a second row. Dead tokens are retired with revoked_at and a reason, never deleted. `token` is a capability to reach a handset and must never appear in a log line, an alert detail or a view.';

comment on column public.push_tokens.token is
  'CAPABILITY. Whoever holds this can notify the device. Never select it into anything a person other than its owner can read.';

comment on column public.push_tokens.device_ref is
  'A generated, non-reversible short handle for this device, safe to put in an alert or a log line. Use this wherever a device has to be named outside the table.';

/* The drain's only read: this person's live devices. Partial, because a
   retired token is never a send target and there will eventually be far more
   of those than live ones. */
create index push_tokens_live_by_user_idx
  on public.push_tokens (user_id)
  where revoked_at is null;

/* The enqueue trigger asks one question of this table and it is an existence
   test per platform, so the platform travels in the index with the user. */
create index push_tokens_live_by_user_platform_idx
  on public.push_tokens (user_id, platform)
  where revoked_at is null;

/* Retirement sweeps and the "is this build shedding tokens" question. */
create index push_tokens_revoked_at_idx
  on public.push_tokens (revoked_at)
  where revoked_at is not null;

-- ----------------------------------------------------------------------------
-- BORN LOCKED. RULE 21, RESTATED AND THEN READ BACK AT THE FOOT OF THIS FILE.
--
-- A table created by a migration is owned by the migration role and PostgREST
-- would expose it the moment row level security let it. So: RLS on, every
-- grant revoked, and then exactly one privilege handed back.

alter table public.push_tokens enable row level security;

revoke all on table public.push_tokens from public;
revoke all on table public.push_tokens from anon;
revoke all on table public.push_tokens from authenticated;

/* The one thing a signed-in person may do from a browser: list their own
   devices, so the settings screen can show them and offer Revoke. The revoke
   itself is a route, for the reason at the head. */
grant select on table public.push_tokens to authenticated;

/* `(select auth.uid())` rather than a bare `auth.uid()`: the repository moved
   to this form in 20260729174306_rls_initplan_and_fk_index.sql so the planner
   evaluates it once per statement instead of once per row, and a new table
   should be written that way from the start rather than fixed later. */
create policy push_tokens_select_own on public.push_tokens
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

/* No insert, update or delete policy exists, and that is the design rather
   than an omission. With RLS enabled and no policy, every one of those is
   refused for every role that is not the service role. */

-- ----------------------------------------------------------------------------
-- READ THE LOCK BACK. A migration that says "born locked" and does not then
-- prove it is a comment, not a control.

do $$
declare
  v_rls boolean;
  v_bad_grants text;
  v_write_policies int;
begin
  select c.relrowsecurity into v_rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'push_tokens';
  if not coalesce(v_rls, false) then
    raise exception 'REFUSING: row level security is not enabled on public.push_tokens';
  end if;

  /* anon must hold nothing at all; authenticated must hold SELECT and only
     SELECT. Anything else is a door this migration did not mean to open. */
  select string_agg(format('%s:%s', grantee, privilege_type), ', ' order by grantee, privilege_type)
    into v_bad_grants
    from information_schema.role_table_grants
   where table_schema = 'public'
     and table_name = 'push_tokens'
     and ((grantee = 'anon')
       or (grantee = 'authenticated' and privilege_type <> 'SELECT')
       or (grantee = 'PUBLIC'));
  if v_bad_grants is not null then
    raise exception 'REFUSING: push_tokens is not born locked, these grants stand: %', v_bad_grants;
  end if;

  select count(*) into v_write_policies
    from pg_policies
   where schemaname = 'public' and tablename = 'push_tokens'
     and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL');
  if v_write_policies <> 0 then
    raise exception 'REFUSING: % write policies exist on push_tokens; every write is meant to be service role only', v_write_policies;
  end if;
end $$;
