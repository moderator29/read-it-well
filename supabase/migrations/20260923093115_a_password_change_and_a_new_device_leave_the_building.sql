-- THE TWO SECURITY EMAILS THAT WERE WRITTEN, TESTED, RENDERED IN THE FIXTURES,
-- AND SENT TO NOBODY.
--
-- `passwordChanged` and `newDeviceSignIn` have been in `lib/email/messages.ts`
-- with no caller. Their own doc comments say what they are for better than
-- this one can: the first turns a silent takeover into a loud one, and the
-- second is the earlier warning of the pair, because a stolen password is used
-- before it is changed. Both of them are obligations rather than features. A
-- product that does not send them is a product where an account can be taken
-- and its owner finds out weeks later, when they next try to sign in.
--
-- WHY NEITHER COULD BE WIRED IN TYPESCRIPT. Both events belong to GoTrue, not
-- to us.
--
--   A PASSWORD CHANGE is `supabase.auth.updateUser({ password })` in
--   `lib/auth/actions.ts`, and it is also a change made from the Supabase
--   dashboard, by the admin API, by a future magic-link recovery, and by any
--   path added later. Wiring the one call site we can see would have covered
--   one door of four and looked like coverage.
--
--   A NEW DEVICE has no call site at all. Nothing in this application is told
--   when a session is created: a password sign-in, an OAuth callback, a magic
--   link and a token refresh all mint `auth.sessions` rows inside GoTrue.
--
-- Both are visible in exactly one place, which is the table each writes. So
-- both are triggers, and they enqueue into `public.email_outbox`.
--
-- ----------------------------------------------------------------------------
-- THE RAW USER AGENT NEVER LEAVES THE AUTH SCHEMA. NEITHER DOES AN IP.
--
-- `auth.sessions.user_agent` is an attacker-controlled header. Anyone can sign
-- in with a header of their choosing, and whatever they write would land in a
-- security email their victim then reads, which is a free line of copy on the
-- one screen that must not have one. `lib/security/device.ts` made this ruling
-- already for the devices screen; `private.device_words` is the same ruling in
-- SQL, with the same ordered lists and the same reason. Only proper nouns from
-- a fixed list ever come out of it.
--
-- `public.known_devices` stores a digest of the agent and never the agent. The
-- digest is enough to answer "have we seen this one before", which is the only
-- question being asked, and it is useless for anything else.
--
-- ----------------------------------------------------------------------------
-- A TRIGGER ON THE AUTH SCHEMA MAY NEVER BREAK SIGNING IN.
--
-- This is the one place in this estate where an exception handler round the
-- whole body is correct. An escrow trigger that throws costs one email and
-- rolls back a transition that should not have happened without it. A sign-in
-- trigger that throws locks every person out of the platform. So both bodies
-- below swallow, and both say so with `raise warning`, which reaches the
-- Postgres log rather than nowhere.

-- ----------------------------------------------------------------------------
-- THE DEVICE, IN WORDS, FROM A FIXED LIST.

create or replace function private.device_words(p_agent text)
returns text
language plpgsql
immutable
security definer
set search_path to 'public'
as $$
declare
  a text;
  v_browser text;
  v_platform text;
begin
  a := left(coalesce(btrim(p_agent), ''), 512);
  if a = '' then
    return null;
  end if;

  /* This platform talking to itself. The token refresh runs server side, so
     these rows are real sessions whose agent says nothing about a reader's
     phone. Naming our own hosting in a security email would invite somebody
     to decide whether they recognise a thing that was never about them. */
  if a ~* '(vercel|next\.js|\mnode(\.js)?\M|undici|supabase|\mdeno\M)' then
    return null;
  end if;

  /* Order matters, and for the reason `lib/security/device.ts` gives: user
     agent strings lie by inclusion. Every Chromium browser claims Safari,
     Edge claims Chrome, Opera claims both. Most specific first. */
  v_browser := case
    when a ~* '\medg(e|a|ios)?/' then 'Edge'
    when a ~* '(\mopr/|\mopera/)' then 'Opera'
    when a ~* '\msamsungbrowser/' then 'Samsung Internet'
    when a ~* '\mucbrowser/' then 'UC Browser'
    when a ~* '(\mfirefox/|\mfxios/)' then 'Firefox'
    when a ~* '(\mchrome/|\mcrios/)' then 'Chrome'
    when a ~* '\msafari/' then 'Safari'
    else null
  end;

  /* Android before iOS: an Android tablet string can carry `linux`. */
  v_platform := case
    when a ~* '\mandroid\M' then 'Android'
    when a ~* '(\miphone\M|\mipad\M|\mipod\M|\mios\M)' then 'iOS'
    when a ~* '\mwindows\M' then 'Windows'
    when a ~* '(mac os x|\mmacintosh\M)' then 'macOS'
    when a ~* '\mcros\M' then 'ChromeOS'
    when a ~* '\mlinux\M' then 'Linux'
    else null
  end;

  /* One of the two is enough to be worth printing. "Chrome" alone still tells
     somebody whether this is the browser they use. */
  if v_browser is null and v_platform is null then
    return null;
  end if;
  if v_browser is null then return v_platform; end if;
  if v_platform is null then return v_browser; end if;
  return v_browser || ' on ' || v_platform;
end;
$$;

revoke all on function private.device_words(text) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- WHICH DEVICES THIS ACCOUNT HAS SEEN. A DIGEST, NEVER THE AGENT.

create table if not exists public.known_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  /* A digest of the user agent. Enough to answer "seen before"; useless for
     anything else, and it is never the header itself. */
  fingerprint text not null,
  /* The words from the fixed list, or null. Kept so the email does not have
     to reach back into the auth schema at send time. */
  device_words text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, fingerprint)
);

alter table public.known_devices enable row level security;
revoke all on table public.known_devices from public, anon, authenticated;

comment on table public.known_devices is
  'One row per account per device digest. Service role and definer functions only; RLS on with no policy by design. The devices screen reads auth.sessions, not this.';

-- ----------------------------------------------------------------------------
-- A NEW DEVICE SIGNED IN.

create or replace function private.enqueue_new_device_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_fingerprint text;
  v_words text;
  v_inserted boolean;
  v_known integer;
begin
  v_words := private.device_words(new.user_agent);
  v_fingerprint := left(md5(coalesce(nullif(btrim(new.user_agent), ''), 'unrecorded')), 16);

  insert into public.known_devices (user_id, fingerprint, device_words)
  values (new.user_id, v_fingerprint, v_words)
  on conflict (user_id, fingerprint)
    do update set last_seen_at = now()
  returning (xmax = 0) into v_inserted;

  if not coalesce(v_inserted, false) then
    return new;
  end if;

  /*
   * THE FIRST DEVICE AN ACCOUNT EVER SEES IS NOT A NEW DEVICE.
   *
   * It is the sign-up, and telling somebody that a strange device has just
   * signed in, thirty seconds after they created the account on it, is how a
   * person learns that this email means nothing. The count includes the row
   * just written, so a second distinct device is the first one worth a word.
   */
  select count(*) into v_known from public.known_devices where user_id = new.user_id;
  if v_known < 2 then
    return new;
  end if;

  perform private.email_outbox_enqueue(
    new.user_id,
    'security.new_device_sign_in',
    /* One email per device, ever. A device that signs in every morning is
       not news after the first time. */
    'security:new_device:' || new.user_id::text || ':' || v_fingerprint,
    jsonb_build_object('at', now(), 'device', v_words)
  );

  return new;
exception when others then
  /* See the head: a trigger on the auth schema may never break signing in. */
  raise warning '[outbox] new device enqueue failed: %', sqlstate;
  return new;
end;
$$;

revoke all on function private.enqueue_new_device_email() from public, anon, authenticated;

drop trigger if exists sessions_enqueue_new_device_email on auth.sessions;
create trigger sessions_enqueue_new_device_email
  after insert on auth.sessions
  for each row
  execute function private.enqueue_new_device_email();

-- ----------------------------------------------------------------------------
-- THE PASSWORD ON THIS ACCOUNT CHANGED.

create or replace function private.enqueue_password_changed_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform private.email_outbox_enqueue(
    new.id,
    'security.password_changed',
    /* `statement_timestamp()` is fixed for the statement, so a trigger that
       somehow fired twice for one UPDATE lands on one key, while two genuine
       changes minutes apart are two events and two emails. */
    'security:password_changed:' || new.id::text || ':'
      || to_char(statement_timestamp() at time zone 'UTC', 'YYYYMMDD"T"HH24MISS'),
    jsonb_build_object('at', now())
  );
  return new;
exception when others then
  raise warning '[outbox] password change enqueue failed: %', sqlstate;
  return new;
end;
$$;

revoke all on function private.enqueue_password_changed_email() from public, anon, authenticated;

drop trigger if exists users_enqueue_password_changed_email on auth.users;
create trigger users_enqueue_password_changed_email
  after update of encrypted_password on auth.users
  for each row
  /*
   * A CHANGE, NOT A FIRST SETTING. `old.encrypted_password is not null` keeps
   * this off an account that signed up through a provider and is setting a
   * password for the first time, because "your password was changed" is not
   * what happened to them and a security notice that misdescribes the event
   * is worse than none.
   */
  when (old.encrypted_password is not null
        and new.encrypted_password is not null
        and old.encrypted_password is distinct from new.encrypted_password)
  execute function private.enqueue_password_changed_email();

-- ----------------------------------------------------------------------------
-- RULE 21, AND BOTH TRIGGERS READ BACK.

do $$
declare
  v_open int;
  v_triggers int;
  v_table_open int;
begin
  select count(*) into v_open
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private'
     and p.proname in ('device_words', 'enqueue_new_device_email', 'enqueue_password_changed_email')
     and (has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if v_open <> 0 then
    raise exception 'rule 21: % security function(s) are executable by anon or authenticated', v_open;
  end if;

  select count(*) into v_triggers
    from pg_trigger t
   where not t.tgisinternal and t.tgenabled = 'O'
     and t.tgname in ('sessions_enqueue_new_device_email', 'users_enqueue_password_changed_email');
  if v_triggers <> 2 then
    raise exception 'the two security triggers are not both installed and enabled (%)', v_triggers;
  end if;

  select count(*) into v_table_open
    from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'known_devices'
     and grantee in ('anon', 'authenticated', 'PUBLIC');
  if v_table_open <> 0 then
    raise exception 'known_devices is not born locked: % grant(s) stand', v_table_open;
  end if;
end
$$;
