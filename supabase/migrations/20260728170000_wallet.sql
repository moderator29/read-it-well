-- Naira wallet: wallets and the wallet ledger.
--
-- Money-critical, so the same discipline as bookings_payments: every amount is
-- integer kobo (Master Rule 50) and the balance is NEVER a stored column. A
-- wallet's balance is derived on read as sum(credits) minus sum(debits) over
-- its COMPLETED ledger entries, so it is always reconstructable and can never
-- drift from history. private.wallet_balance is the single authoritative
-- implementation of that sum, and public.wallet_balances is the read surface.
--
-- Wallet creation is LAZY. The profiles signup trigger already exists in
-- identity_core and is not amended here; instead the service layer (service
-- role) inserts the wallet row on first use, keyed by the unique user_id, with
-- `insert ... on conflict (user_id) do nothing` so concurrent first uses are
-- safe. A user without a wallet row simply has a zero balance.
--
-- Writes are service-role only. Deposits, withdrawals, payments, refunds and
-- transfers are money movements performed by the service layer after the
-- payment processor confirms them, so there are NO client write policies on
-- either table: owners read their own wallet and entries, admins read all via
-- private.has_role, and nobody mutates money from a browser.

create type public.wallet_entry_kind as enum (
  'deposit',
  'withdrawal',
  'payment',
  'refund',
  'transfer_in',
  'transfer_out'
);

create type public.wallet_entry_direction as enum ('credit', 'debit');

create type public.wallet_entry_status as enum ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

create table public.wallets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users (id) on delete restrict,
  currency   text not null default 'NGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.wallets is
  'One wallet per user, created lazily by the service layer on first use. '
  'Deliberately holds NO balance column: the balance is derived as '
  'sum(credits) - sum(debits) over COMPLETED wallet_entries via '
  'private.wallet_balance, so it can never disagree with the ledger.';

create table public.wallet_entries (
  id           uuid primary key default gen_random_uuid(),
  wallet_id    uuid not null references public.wallets (id) on delete restrict,
  kind         public.wallet_entry_kind not null,
  direction    public.wallet_entry_direction not null,
  amount_minor bigint not null check (amount_minor > 0),
  -- Idempotency key: the processor or transfer reference. Unique so a replayed
  -- webhook can never double-post money.
  reference    text not null unique,
  status       public.wallet_entry_status not null default 'PENDING',
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  -- Each kind has exactly one legal direction, enforced at the database so a
  -- service-layer bug cannot post a "credit withdrawal".
  constraint wallet_entries_direction_chk check (
    (kind in ('deposit', 'refund', 'transfer_in')       and direction = 'credit') or
    (kind in ('withdrawal', 'payment', 'transfer_out')  and direction = 'debit')
  )
);

comment on table public.wallet_entries is
  'Append-only wallet ledger. Integer kobo, amount always positive, direction '
  'says which way it moves. Only COMPLETED entries count towards the balance. '
  'Written exclusively by the service role.';

create index wallet_entries_wallet_idx  on public.wallet_entries (wallet_id, created_at desc);
create index wallet_entries_status_idx  on public.wallet_entries (wallet_id, status);

create trigger wallets_set_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

-- The one place a balance is computed. security definer so it can sum the
-- ledger regardless of the caller's entry visibility, but it refuses to price
-- a wallet the caller is not allowed to see: the owner, admins and the service
-- role get the real figure, anyone else gets null.
create function private.wallet_balance(target_wallet_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    sum(case when e.direction = 'credit' then e.amount_minor else -e.amount_minor end),
    0
  )::bigint
  from public.wallet_entries e
  where e.wallet_id = target_wallet_id
    and e.status = 'COMPLETED'
    and (
      exists (
        select 1 from public.wallets w
        where w.id = target_wallet_id
          and (w.user_id = auth.uid()
               or private.has_role(auth.uid(), 'admin')
               or private.has_role(auth.uid(), 'super_admin'))
      )
      or auth.uid() is null  -- service role and other non-JWT database access
    );
$$;

comment on function private.wallet_balance(uuid) is
  'Derived wallet balance in kobo: sum of COMPLETED credits minus COMPLETED '
  'debits. Owner, admins and the service role only.';

revoke execute on function private.wallet_balance(uuid) from public, anon;
grant  execute on function private.wallet_balance(uuid) to authenticated;

-- Read surface for clients. security_invoker so the wallets RLS below decides
-- which rows exist for the caller; the balance itself comes from the helper.
create view public.wallet_balances
with (security_invoker = true)
as
  select
    w.id as wallet_id,
    w.user_id,
    w.currency,
    private.wallet_balance(w.id) as balance_minor
  from public.wallets w;

comment on view public.wallet_balances is
  'Per-wallet derived balance in kobo. security_invoker, so callers only see '
  'wallets their RLS lets them see.';

revoke all on public.wallet_balances from public, anon;
grant select on public.wallet_balances to authenticated;

-- Row Level Security.
alter table public.wallets        enable row level security;
alter table public.wallet_entries enable row level security;

-- Wallets: the owner reads their own; admins read all. Creation is the service
-- layer's lazy insert (service role bypasses RLS), so there is no client
-- insert, update or delete policy.
create policy wallets_select_own
  on public.wallets for select
  using (auth.uid() = user_id);

create policy wallets_select_admin
  on public.wallets for select
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

-- Entries: the wallet owner reads their own history; admins read all. Money is
-- written only by the service role, so no client write policies.
create policy wallet_entries_select_own
  on public.wallet_entries for select
  using (exists (
    select 1 from public.wallets w
    where w.id = wallet_entries.wallet_id and w.user_id = auth.uid()
  ));

create policy wallet_entries_select_admin
  on public.wallet_entries for select
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));
