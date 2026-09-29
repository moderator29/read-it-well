-- MONEY 10 / V-81: FACE, FINGERPRINT OR DEVICE PIN GUARDS WHERE MONEY IS PAID OUT TO.
--
-- Supersedes the unapplied 20260924160300_v81 (moved to superseded/), which
-- was designed as the lock on sending from a wallet and withdrawing. There is
-- no wallet and no withdrawal. What still decides where a person's money
-- lands is:
--   * a lister's payout account (`payout_accounts`): the Paystack subaccount
--     their share of every split charge settles to;
--   * a member's bank account (`bank_accounts`): where a Vallo Guarantee
--     payout or any manual return from Vallo is sent;
--   * which of those is the default, and removing one.
-- A card refund always goes back to the card or account that paid (Paystack
-- `/refund`), so there is no refund destination a person can change. These
-- are the actions the lock guards (`lib/security/money-intent.ts`), plus
-- removing the lock itself.
--
-- A person may enrol a phone's platform authenticator; from then on those
-- actions need a fresh proof checked on the server
-- (`lib/security/webauthn.ts`), bound to the one action's digest, or the
-- account password or an email code as the fallback. Opt-in: nobody without
-- an enrolled key is asked for anything new.
--
-- Three tables, written ONLY by the service role from server actions that
-- have already checked the proof:
--   money_credentials  the public keys enrolled; the owner may read their own
--                      list (never the key material)
--   money_challenges   single-use challenges, five minutes
--   money_step_ups     a proof that just happened, single use, two minutes,
--                      bound to one action digest
-- The app treats a missing table as "not deployed"; this file deploys them.

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
grant select (id, user_id, label, created_at, last_used_at, alg) on public.money_credentials to authenticated;
grant select, insert, update, delete on public.money_credentials to service_role;
drop policy if exists money_credentials_select_own on public.money_credentials;
create policy money_credentials_select_own on public.money_credentials for select to authenticated
  using (user_id = (select auth.uid()));
comment on table public.money_credentials is
  'V-81. Public keys of platform authenticators a person enrolled to guard where their money is paid out to (payout and bank accounts). Written only by the service role after a password re-entry; the owner can list their own, never read the key.';

create table if not exists public.money_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge text not null unique,
  purpose text not null check (purpose in ('enrol', 'money', 'email_code')),
  digest text check (digest is null or digest ~ '^[0-9a-f]{64}$'),
  check ((purpose = 'money') = (digest is not null)),
  expires_at timestamptz not null default now() + interval '5 minutes',
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists money_challenges_user_idx on public.money_challenges (user_id, created_at desc);
alter table public.money_challenges enable row level security;
revoke all on table public.money_challenges from public, anon, authenticated;
grant select, insert, update, delete on public.money_challenges to service_role;
comment on table public.money_challenges is
  'V-81. Single-use WebAuthn challenges (and emailed-code markers), five minutes. Service role only.';

create table if not exists public.money_step_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  method text not null check (method in ('biometric', 'password', 'email_code')),
  digest text not null check (digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 minutes',
  used_at timestamptz
);
create index if not exists money_step_ups_user_idx on public.money_step_ups (user_id, created_at desc);
alter table public.money_step_ups enable row level security;
revoke all on table public.money_step_ups from public, anon, authenticated;
grant select, insert, update, delete on public.money_step_ups to service_role;
comment on table public.money_step_ups is
  'V-81. A proof that just happened, bound to one payout-destination action digest and consumed by that action. Two minutes, single use. Service role only.';

create or replace function private.purge_money_step_ups()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
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
$function$;
revoke all on function private.purge_money_step_ups() from public, anon, authenticated;

select cron.unschedule('vallo_purge_money_step_ups') where exists (select 1 from cron.job where jobname = 'vallo_purge_money_step_ups');
select cron.schedule('vallo_purge_money_step_ups', '45 2 * * *', 'select private.purge_money_step_ups();');

do $$
begin
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
  if not has_table_privilege('service_role', 'public.money_step_ups', 'INSERT, UPDATE') then
    raise exception 'the service role cannot record a step-up';
  end if;
  if not exists (select 1 from pg_class where oid = 'public.money_step_ups'::regclass and relrowsecurity) then
    raise exception 'money_step_ups has no RLS';
  end if;
end $$;
