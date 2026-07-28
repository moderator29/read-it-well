-- Bookings and payments.
--
-- The money-critical core. Every amount is integer kobo (Master Rule 50). The
-- booking price is stored decomposed exactly as the reference breakdown shows
-- (nightly x nights, plus cleaning, plus service), with check constraints so the
-- stored total can never drift from its parts. Guests are modelled by
-- composition (adults, children), not a single count, matching Ref 09.
--
-- No double booking is guaranteed at the database, not just in application code:
-- a GiST exclusion constraint forbids two active (PENDING or CONFIRMED) bookings
-- whose night ranges overlap for the same listing. A PENDING booking therefore
-- holds the inventory while payment is in flight; cancelling or failing releases
-- it. Night ranges are half-open [check_in, check_out), so one guest's checkout
-- day is the next guest's checkin day without conflict.
--
-- Payments are a real ledger, never a balance field. transactions records the
-- processor attempt; ledger_entries decomposes each settled charge into gross,
-- platform fee, agent share and processor charge, so settlement is always
-- reconstructable. Money-moving rows are written by the service layer (service
-- role), never directly by a client, so there are no client write policies on
-- transactions or ledger_entries.

create extension if not exists btree_gist;

create type public.booking_status      as enum ('PENDING', 'CONFIRMED', 'CANCELLED');
create type public.transaction_status  as enum ('SUCCESSFUL', 'PENDING', 'FAILED', 'REFUNDED');

create table public.bookings (
  id                    uuid primary key default gen_random_uuid(),
  listing_id            uuid not null references public.listings (id) on delete restrict,
  guest_id              uuid not null references auth.users (id) on delete restrict,
  check_in              date not null,
  check_out             date not null,
  nights                integer not null,
  adults                integer not null default 1 check (adults > 0),
  children              integer not null default 0 check (children >= 0),
  -- Priced snapshot in kobo, captured at booking time so later price edits to the
  -- listing never rewrite history.
  price_per_night_minor bigint not null check (price_per_night_minor >= 0),
  cleaning_fee_minor    bigint not null default 0 check (cleaning_fee_minor >= 0),
  service_fee_minor     bigint not null default 0 check (service_fee_minor >= 0),
  subtotal_minor        bigint not null check (subtotal_minor >= 0),
  total_minor           bigint not null check (total_minor >= 0),
  currency              text not null default 'NGN',
  status                public.booking_status not null default 'PENDING',
  -- Half-open night range, generated so it cannot disagree with the dates.
  during                daterange generated always as (daterange(check_in, check_out, '[)')) stored,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint bookings_dates_chk    check (check_out > check_in),
  constraint bookings_nights_chk   check (nights = (check_out - check_in)),
  constraint bookings_subtotal_chk check (subtotal_minor = price_per_night_minor * nights),
  constraint bookings_total_chk    check (total_minor = subtotal_minor + cleaning_fee_minor + service_fee_minor),
  -- No overlapping active bookings for the same listing.
  constraint bookings_no_overlap exclude using gist (
    listing_id with =,
    during with &&
  ) where (status in ('PENDING', 'CONFIRMED'))
);

comment on table public.bookings is 'A guest booking. Integer kobo. No overlapping active bookings per listing.';

create index bookings_listing_idx on public.bookings (listing_id);
create index bookings_guest_idx   on public.bookings (guest_id);
create index bookings_status_idx  on public.bookings (status);

create table public.booking_state_events (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  from_status public.booking_status,
  to_status   public.booking_status not null,
  actor_id    uuid references auth.users (id),
  note        text,
  created_at  timestamptz not null default now()
);

comment on table public.booking_state_events is 'Append-only booking status history.';

create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings (id) on delete restrict,
  provider     text not null default 'paystack',
  provider_ref text unique,
  amount_minor bigint not null check (amount_minor >= 0),
  currency     text not null default 'NGN',
  status       public.transaction_status not null default 'PENDING',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.transactions is 'Processor payment attempts against a booking.';

create index transactions_booking_idx on public.transactions (booking_id);

create table public.ledger_entries (
  id                    uuid primary key default gen_random_uuid(),
  booking_id            uuid not null references public.bookings (id) on delete restrict,
  transaction_id        uuid references public.transactions (id) on delete set null,
  gross_minor           bigint not null check (gross_minor >= 0),
  platform_fee_minor    bigint not null default 0 check (platform_fee_minor >= 0),
  agent_share_minor     bigint not null default 0 check (agent_share_minor >= 0),
  processor_fee_minor   bigint not null default 0 check (processor_fee_minor >= 0),
  net_settlement_minor  bigint not null check (net_settlement_minor >= 0),
  created_at            timestamptz not null default now(),
  -- Gross is fully accounted for by the parts.
  constraint ledger_balances_chk
    check (gross_minor = platform_fee_minor + agent_share_minor + processor_fee_minor)
);

comment on table public.ledger_entries is 'Decomposition of each settled charge. Gross = platform + agent + processor.';

create index ledger_entries_booking_idx on public.ledger_entries (booking_id);

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- Helper: is the current user the agent whose listing this booking is for?
create function private.is_booking_host(target_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    join public.listings l on l.id = b.listing_id
    join public.agents   a on a.id = l.agent_id
    where b.id = target_booking_id and a.user_id = auth.uid()
  );
$$;

revoke execute on function private.is_booking_host(uuid) from public, anon;
grant  execute on function private.is_booking_host(uuid) to authenticated;

-- Row Level Security.
alter table public.bookings             enable row level security;
alter table public.booking_state_events enable row level security;
alter table public.transactions         enable row level security;
alter table public.ledger_entries       enable row level security;

-- Bookings: a guest reads and creates their own (always as PENDING, for their
-- own user id). The host agent reads bookings against their listings. Status
-- transitions (confirm, cancel) are performed by the service layer, which also
-- writes the state event and the ledger, so guests have no update policy.
create policy bookings_guest_select
  on public.bookings for select
  using (auth.uid() = guest_id);

create policy bookings_guest_insert
  on public.bookings for insert
  with check (auth.uid() = guest_id and status = 'PENDING');

create policy bookings_host_select
  on public.bookings for select
  using (exists (
    select 1 from public.listings l join public.agents a on a.id = l.agent_id
    where l.id = bookings.listing_id and a.user_id = auth.uid()
  ));

create policy bookings_admin_all
  on public.bookings for all
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'))
  with check (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

-- State events: visible to the booking's guest, its host, and admins. Written by
-- the service role, so no client write policy.
create policy booking_events_select
  on public.booking_state_events for select
  using (
    exists (select 1 from public.bookings b where b.id = booking_state_events.booking_id and b.guest_id = auth.uid())
    or private.is_booking_host(booking_state_events.booking_id)
    or private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin')
  );

-- Transactions: the paying guest and admins may read; nobody writes from a
-- client (the Paystack webhook uses the service role).
create policy transactions_guest_select
  on public.transactions for select
  using (exists (select 1 from public.bookings b where b.id = transactions.booking_id and b.guest_id = auth.uid()));

create policy transactions_admin_select
  on public.transactions for select
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

-- Ledger: the host agent reads entries for their own bookings (their earnings);
-- admins read all. Service role writes.
create policy ledger_host_select
  on public.ledger_entries for select
  using (private.is_booking_host(ledger_entries.booking_id));

create policy ledger_admin_select
  on public.ledger_entries for select
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));
