/*
 * V-81. FACE ID AND FINGERPRINT AS THE LOCK ON MONEY.
 *
 * A phone is the most stolen object in Lagos and phones are shared in
 * Nigerian households, so an unlocked phone with an open Vallo session is an
 * open wallet. A person may enrol this phone's platform authenticator (Face
 * ID, a fingerprint, or the device PIN behind them); from then on sending from
 * the wallet and withdrawing need a fresh proof, checked on the server
 * (`apps/web/src/lib/security/webauthn.ts`), not a boolean from JavaScript.
 *
 * Three tables, all written ONLY by the service role from server actions
 * that have already checked the proof, so nothing a signed-in browser can
 * call directly adds a key, mints a challenge or records a step-up:
 *
 *   money_credentials   the public keys enrolled, one per phone. The owner may
 *                       read their own (to list and remove them).
 *   money_challenges    single-use random challenges, five minutes.
 *   money_step_ups      a proof that just happened, single use, two minutes,
 *                       bound to one action digest (kind, amount, recipient),
 *                       consumed by the one money action it unlocks.
 *
 * Enrolling needs the account password first (A2-013's rule), or an email
 * code for an account with no password, and the password path is refused
 * for a day after the password changes (the password-changed email row is
 * the signal). That matters because `updatePassword` accepts any signed-in
 * session today, reported to the audit: without the day, a thief holding a
 * session could set a password and then use it here. On a phone that cannot
 * do WebAuthn, the same password or email code is the fallback proof, so a
 * person is never locked out of their own money by a sensor.
 *
 * It is opt-in per person: somebody with no enrolled key is asked for nothing
 * new. The native app's own Face ID prompt through a Capacitor plugin, the
 * app-switcher blur and "lock Vallo when I leave it" need the native
 * projects and are not in this migration.
 */

create table if not exists public.money_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique check (char_length(credential_id) between 16 and 1400),
  public_key_spki text not null check (char_length(public_key_spki) between 40 and 2000),
  alg integer not null check (alg in (-7, -257)),
  sign_count bigint not null default 0 check (sign_count >= 0),
  label text check (label is null or char_length(label) <= 60),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists money_credentials_user_idx on public.money_credentials (user_id);

alter table public.money_credentials enable row level security;
revoke all on table public.money_credentials from public, anon, authenticated;
/* The owner lists their own; every write is the service role's. */
grant select (id, user_id, label, created_at, last_used_at, alg) on public.money_credentials to authenticated;

drop policy if exists money_credentials_select_own on public.money_credentials;
create policy money_credentials_select_own on public.money_credentials
  for select to authenticated
  using (user_id = (select auth.uid()));

comment on table public.money_credentials is
  'V-81. Public keys of platform authenticators a person enrolled as the lock on money. Written only by the service role after a password re-entry; the owner can read (not the key) their own.';

create table if not exists public.money_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge text not null unique,
  /* `email_code` marks that a code was emailed FOR THE LOCK ON MONEY, so a
     code sent for anything else (deleting the account) cannot be spent here. */
  purpose text not null check (purpose in ('enrol', 'money', 'email_code')),
  /* What the proof is for: a SHA-256 of the action's kind, amount in kobo
     and recipient or account (`lib/security/money-intent.ts`). Null only for
     an enrolment challenge. */
  digest text check (digest is null or digest ~ '^[0-9a-f]{64}$'),
  check ((purpose = 'money') = (digest is not null)),
  expires_at timestamptz not null default now() + interval '5 minutes',
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists money_challenges_user_idx on public.money_challenges (user_id, created_at desc);

alter table public.money_challenges enable row level security;
revoke all on table public.money_challenges from public, anon, authenticated;

comment on table public.money_challenges is
  'V-81. Single-use WebAuthn challenges, five minutes. Service role only.';

create table if not exists public.money_step_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  method text not null check (method in ('biometric', 'password', 'email_code')),
  /* The one action this proof unlocks; the money action recomputes it from
     its own validated input and must match, so a proof for one send cannot
     be spent on another. */
  digest text not null check (digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 minutes',
  used_at timestamptz
);

create index if not exists money_step_ups_user_idx on public.money_step_ups (user_id, created_at desc);

alter table public.money_step_ups enable row level security;
revoke all on table public.money_step_ups from public, anon, authenticated;

comment on table public.money_step_ups is
  'V-81. A proof that just happened, bound to one action digest and consumed by the one money action it unlocks. Two minutes, single use. Service role only.';

/* Old challenges and step-ups are forgotten after a day, beside the other
   quiet-hour purges. */
create or replace function private.purge_money_step_ups()
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_a integer;
  v_b integer;
begin
  delete from public.money_challenges where created_at < now() - interval '1 day';
  get diagnostics v_a = row_count;
  delete from public.money_step_ups where created_at < now() - interval '1 day';
  get diagnostics v_b = row_count;
  return v_a + v_b;
end;
$$;

revoke all on function private.purge_money_step_ups() from public, anon, authenticated;

select cron.unschedule('vallo_purge_money_step_ups')
 where exists (select 1 from cron.job where jobname = 'vallo_purge_money_step_ups');
select cron.schedule('vallo_purge_money_step_ups', '45 2 * * *', 'select private.purge_money_step_ups();');

do $$
begin
  /* has_table_privilege answers for the named role (a grant to PUBLIC
     included, a column grant not); information_schema's grant views answer
     only for the observer and pass by seeing nothing. */
  if has_table_privilege('anon', 'public.money_challenges', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
     or has_table_privilege('authenticated', 'public.money_challenges', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
     or has_table_privilege('anon', 'public.money_step_ups', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
     or has_table_privilege('authenticated', 'public.money_step_ups', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') then
    raise exception 'a V-81 service table is not born locked';
  end if;
  if has_table_privilege('anon', 'public.money_credentials', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
     or has_table_privilege('authenticated', 'public.money_credentials', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') then
    raise exception 'money_credentials carries a table-level grant; it should be a column list';
  end if;
  if has_column_privilege('authenticated', 'public.money_credentials', 'public_key_spki', 'SELECT')
     or has_column_privilege('authenticated', 'public.money_credentials', 'credential_id', 'SELECT') then
    raise exception 'the key material of money_credentials is readable by authenticated';
  end if;
end
$$;
