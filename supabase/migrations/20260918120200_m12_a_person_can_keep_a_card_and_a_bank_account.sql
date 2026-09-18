-- M12. A person can keep a card and a bank account.
--
-- Two tables, both user-scoped, from docs/research/TWO_MODE_BACKEND_RESEARCH.md
-- section 6, and one additive column.
--
-- public.payment_methods holds what Paystack hands back after a successful
-- charge: the authorization token and the card's display facts. Never a PAN,
-- never a CVV, so PCI scope stays exactly where it is today. INSERT IS SERVICE
-- ROLE ONLY: the row is written by the webhook from the processor's own
-- payload, and authorization data is never accepted from a client. The owner
-- may read their methods, pick a default, and soft-delete one, and the column
-- grant below is what limits an UPDATE to exactly those two facts.
--
-- public.bank_accounts is where a guest or a stays host files where money goes
-- back to. resolved_account_name is NOT NULL, which makes resolve-before-save
-- structural: nothing can be filed without the bank having said whose account
-- it is. recipient_code is cached on the first transfer so a withdrawal stops
-- re-minting a Paystack recipient every time. payout_accounts stays for agent
-- settlement and gains only the same cache column.
--
-- Delete is an UPDATE of deleted_at on both tables; neither carries a delete
-- policy. A card somebody removed is still the card that was charged last
-- month, and support needs to be able to answer "which card was that".

/* ------------------------------------------------------- payment_methods */

create table if not exists public.payment_methods (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  provider           text not null default 'paystack' check (provider = 'paystack'),
  authorization_code text not null,
  signature          text not null,
  card_type          text,
  last4              text check (last4 is null or last4 ~ '^\d{4}$'),
  exp_month          smallint check (exp_month is null or exp_month between 1 and 12),
  exp_year           smallint check (exp_year is null or exp_year between 2000 and 2100),
  bin                text,
  bank               text,
  channel            text,
  reusable           boolean not null,
  is_default         boolean not null default false,
  email_used         text not null,
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.payment_methods is
  'A reusable Paystack authorization for one person. Token material and display facts only, never a card number. Inserted by the service role from the webhook; the owner may only pick a default or soft-delete.';
comment on column public.payment_methods.signature is
  'Paystack''s stable fingerprint for the card, so paying again with the same card updates this row rather than adding another.';
comment on column public.payment_methods.reusable is
  'Only true rows are ever charged. Set false by the server on the not-reusable decline; never retried.';
comment on column public.payment_methods.email_used is
  'The email the authorization was minted under. charge_authorization must send the same one.';

create unique index if not exists payment_methods_user_signature_uq
  on public.payment_methods (user_id, signature)
  where deleted_at is null;

create unique index if not exists payment_methods_one_default_uq
  on public.payment_methods (user_id)
  where is_default and deleted_at is null;

create index if not exists payment_methods_user_idx
  on public.payment_methods (user_id);

alter table public.payment_methods enable row level security;

drop policy if exists payment_methods_select_own on public.payment_methods;
create policy payment_methods_select_own
  on public.payment_methods for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists payment_methods_update_own on public.payment_methods;
create policy payment_methods_update_own
  on public.payment_methods for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists payment_methods_admin_select on public.payment_methods;
create policy payment_methods_admin_select
  on public.payment_methods for select to authenticated
  using (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

-- No insert or delete policy for anybody but the service role, and the update
-- grant names the two columns an owner may touch. Revoked from anon outright:
-- revoking from public does not revoke from anon (20260809094339).
revoke all on public.payment_methods from anon;
revoke insert, delete, update on public.payment_methods from authenticated;
grant select on public.payment_methods to authenticated;
grant update (is_default, deleted_at, updated_at) on public.payment_methods to authenticated;

/* ---------------------------------------------------------- bank_accounts */

create table if not exists public.bank_accounts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  bank_code             text not null,
  bank_name             text not null,
  account_number        text not null check (account_number ~ '^\d{10}$'),
  resolved_account_name text not null,
  resolved_at           timestamptz not null,
  recipient_code        text,
  is_default            boolean not null default false,
  deleted_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.bank_accounts is
  'Where a person''s money goes back to. User-scoped, unlike payout_accounts. The name is the bank''s answer, never the person''s typing, and the column being NOT NULL is what makes that structural.';
comment on column public.bank_accounts.recipient_code is
  'Paystack transfer recipient, cached by the server on the first transfer so a withdrawal does not mint a new recipient every time.';

create unique index if not exists bank_accounts_user_number_uq
  on public.bank_accounts (user_id, account_number)
  where deleted_at is null;

create unique index if not exists bank_accounts_one_default_uq
  on public.bank_accounts (user_id)
  where is_default and deleted_at is null;

create index if not exists bank_accounts_user_idx
  on public.bank_accounts (user_id);

alter table public.bank_accounts enable row level security;

drop policy if exists bank_accounts_select_own on public.bank_accounts;
create policy bank_accounts_select_own
  on public.bank_accounts for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists bank_accounts_insert_own on public.bank_accounts;
create policy bank_accounts_insert_own
  on public.bank_accounts for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists bank_accounts_update_own on public.bank_accounts;
create policy bank_accounts_update_own
  on public.bank_accounts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists bank_accounts_admin_select on public.bank_accounts;
create policy bank_accounts_admin_select
  on public.bank_accounts for select to authenticated
  using (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

-- No delete policy: removing an account is an UPDATE of deleted_at. The owner
-- may change the default and the soft-delete mark; recipient_code is the
-- server's cache and only the service role writes it.
revoke all on public.bank_accounts from anon;
revoke delete, update on public.bank_accounts from authenticated;
grant select, insert on public.bank_accounts to authenticated;
grant update (is_default, deleted_at, updated_at) on public.bank_accounts to authenticated;

/* ------------------------------------------------- one default, kept by db */

-- The payout_accounts_single_default pattern, for a soft-deleting table: the
-- first live row becomes the default, choosing one clears the others, and
-- soft-deleting the default promotes the most recent survivor. SECURITY
-- DEFINER because the promotion touches rows the column grant would not let
-- the owner touch directly; revoked from every API role.
create or replace function private.soft_deleting_single_default()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  survivor uuid;
begin
  if tg_op = 'INSERT' then
    execute format(
      'select not exists (select 1 from public.%I t where t.user_id = $1 and t.deleted_at is null)',
      tg_table_name
    ) into strict new.is_default using new.user_id;
    if not new.is_default and new.is_default is distinct from true then
      -- An explicit request for default on a second row is honoured below.
      new.is_default := coalesce(new.is_default, false);
    end if;
  end if;

  if new.deleted_at is not null then
    if new.is_default then
      new.is_default := false;
      execute format(
        'select t.id from public.%I t where t.user_id = $1 and t.deleted_at is null and t.id <> $2 order by t.created_at desc limit 1',
        tg_table_name
      ) into survivor using new.user_id, new.id;
      if survivor is not null then
        execute format('update public.%I set is_default = true where id = $1', tg_table_name)
          using survivor;
      end if;
    end if;
    return new;
  end if;

  if new.is_default then
    execute format(
      'update public.%I set is_default = false where user_id = $1 and id <> $2 and is_default',
      tg_table_name
    ) using new.user_id, new.id;
  end if;

  return new;
end;
$function$;

revoke execute on function private.soft_deleting_single_default() from public, anon, authenticated;

drop trigger if exists payment_methods_single_default on public.payment_methods;
create trigger payment_methods_single_default
  before insert or update on public.payment_methods
  for each row execute function private.soft_deleting_single_default();

drop trigger if exists bank_accounts_single_default on public.bank_accounts;
create trigger bank_accounts_single_default
  before insert or update on public.bank_accounts
  for each row execute function private.soft_deleting_single_default();

drop trigger if exists payment_methods_set_updated_at on public.payment_methods;
create trigger payment_methods_set_updated_at
  before update on public.payment_methods
  for each row execute function public.set_updated_at();

drop trigger if exists bank_accounts_set_updated_at on public.bank_accounts;
create trigger bank_accounts_set_updated_at
  before update on public.bank_accounts
  for each row execute function public.set_updated_at();

/* --------------------------------------------- payout_accounts, additive */

alter table public.payout_accounts
  add column if not exists recipient_code text;

comment on column public.payout_accounts.recipient_code is
  'Paystack transfer recipient, cached by the server on the first transfer. Null until then.';
