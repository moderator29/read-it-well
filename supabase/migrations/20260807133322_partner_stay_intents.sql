-- Where a guest went when they left to book a partner hotel.
--
-- Today a partner hotel is a price and a Book button that opens LiteAPI's
-- whitelabel checkout. The guest pays there, the supplier is confirmed there,
-- and we earn the commission without ever holding the money, which is the right
-- trade while we are not the merchant of record. What it costs is memory: the
-- moment somebody taps that button they leave, and this platform has no record
-- that they ever wanted the room. Their /bookings page shows nothing, support
-- cannot answer "what did I book", and we cannot tell a hotel we sent them
-- anybody.
--
-- This is that record and deliberately nothing more. It is an INTENT, not a
-- booking: it says a person asked us for a price on a room and was handed to
-- the checkout that sells it. It never claims a room was reserved, because from
-- here we genuinely do not know.
--
-- The name says so. Calling this table partner_bookings would have been the
-- easy mistake, and every future reader would have assumed a row meant a
-- confirmed stay. When on-platform booking lands (docs/HYBRID_INVENTORY.md
-- section 7) a confirmed reservation is a different row in a different table
-- with money against it, and this one will still mean what it means now.
create table if not exists public.partner_stay_intents (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references auth.users(id) on delete cascade,

  -- Which feed, and its own id for the property. Not a foreign key to anything:
  -- partner stock has no row in public.listings and inventing one would put
  -- unverified third-party inventory into the table that carries our badge.
  provider text not null check (provider in ('liteapi', 'places', 'amadeus')),
  provider_hotel_id text not null check (char_length(provider_hotel_id) between 1 and 200),
  hotel_name text not null check (char_length(hotel_name) between 1 and 300),

  checkin date not null,
  checkout date not null check (checkout > checkin),

  /* The price we last showed them, in integer kobo, and what it was at the
     moment they left rather than what the search said an hour earlier. Null
     when the revalidation could not be reached, which is an honest state and
     is exactly why it is nullable: a number here always means a number we
     actually confirmed. */
  quoted_minor bigint check (quoted_minor is null or quoted_minor >= 0),
  currency text not null default 'NGN' check (currency = 'NGN'),

  -- LiteAPI's prebook handle, when the revalidation succeeded. It is what makes
  -- this row reconcilable against their side later, and it is the one field
  -- that would let a future on-platform booking pick up where this left off.
  prebook_id text,

  created_at timestamptz not null default now()
);

comment on table public.partner_stay_intents is
  'A guest asked for a price on a partner hotel room and was handed to the checkout that sells it. NOT a booking: nothing here means a room was reserved, because the reservation happens on the partner side and we are not told. See docs/HYBRID_INVENTORY.md section 7.';

create index if not exists partner_stay_intents_guest_idx
  on public.partner_stay_intents (guest_id, created_at desc);

alter table public.partner_stay_intents enable row level security;

-- A guest sees their own and nobody else's. There is no host side to this
-- table: a partner hotel has no agent on this platform, which is the whole
-- reason it is partner stock.
drop policy if exists partner_stay_intents_select_own on public.partner_stay_intents;
create policy partner_stay_intents_select_own on public.partner_stay_intents
  for select to authenticated
  using (guest_id = auth.uid());

-- Written by the caller for themselves, pinned to auth.uid() so a forged column
-- cannot write somebody else a history.
drop policy if exists partner_stay_intents_insert_own on public.partner_stay_intents;
create policy partner_stay_intents_insert_own on public.partner_stay_intents
  for insert to authenticated
  with check (guest_id = auth.uid());

-- Nothing updates and nothing deletes. This is a log of something that happened
-- at a moment, and a log somebody can rewrite is not evidence of anything.
