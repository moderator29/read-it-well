-- M1 of the two-side platform: the enums every stays table branches on, and
-- the cancellation policies that rate plans and accommodations point at.
--
-- WHY ENUMS FIRST, ON THEIR OWN. Every table from M2 to M9 references at least
-- one of these types, and an enum that is created in the same file as its
-- first table is an enum whose second table lives in a different file with no
-- record of the values it depends on. One file, seven types, read once.
--
-- WHAT THEY MEAN.
--
--   business_kind    The operator shapes the Host wizard admits. `agency` is
--                    the existing letting agent, so the businesses table can
--                    one day carry them without a second table.
--   meal_plan        What a rate plan feeds you. `room_only` is the default
--                    and the honest one; a breakfast that is not on the plan
--                    is not promised.
--   landmark_kind    The categories a curated landmark falls into, so "near
--                    the airport" is a kind lookup scoped by city.
--   source_kind      Where a row came from. First class, never inferred, on
--                    every inventory root. Every v1 row is first_party; the
--                    other two values exist so the widener phase is additive.
--   fulfilment_mode  Who completes the booking. v1 fixes it to `vallo`; the
--                    CHECK in M3 makes source = first_party imply it.
--   room_category    A filterable class beside the free-text room name, so
--                    "twin" is a query and not a LIKE over "Deluxe Twin Room".
--   thread_context   What a conversation is about, for M10's context column.
--
-- CANCELLATION POLICIES. `rules` is an ordered jsonb array of tiers, each
-- {"hours_before": int, "refund_bps": int}, read newest-deadline first by the
-- application. `summary` is the plain-words sentence the stay page shows, in
-- the writer's words, never generated from the tiers. `is_free_until_hours`
-- is the scalar the shelf filter reads (HOST_ONBOARDING_RESEARCH section 5):
-- null means the plan is never free to cancel, a number means free up to that
-- many hours before check-in. `refund_to` is checked to 'wallet' because that
-- is the only place v1 refunds land (no card refunds, no float).
--
-- RLS: anybody may read a policy, because a stay page shows one to a signed-out
-- visitor; only an admin writes one, because a policy is platform vocabulary
-- and not something a host authors.

create type public.business_kind as enum (
  'hotel',
  'serviced_apartments',
  'guest_house',
  'resort',
  'shortlet_operator',
  'restaurant',
  'agency'
);

create type public.meal_plan as enum ('room_only', 'breakfast', 'half_board', 'full_board');

create type public.landmark_kind as enum (
  'airport',
  'business_district',
  'market',
  'mall',
  'stadium',
  'beach',
  'park',
  'transport',
  'education',
  'hospital',
  'worship',
  'other'
);

create type public.source_kind as enum ('first_party', 'partner', 'licensed_data');

create type public.fulfilment_mode as enum ('vallo', 'external_completion', 'partner_handoff');

create type public.room_category as enum ('single', 'double', 'twin', 'suite', 'family', 'dorm');

create type public.thread_context as enum ('listing', 'reservation', 'booking');

create table public.cancellation_policies (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (length(btrim(name)) between 2 and 80),
  summary             text not null check (length(btrim(summary)) between 5 and 400),
  -- Ordered tiers: [{"hours_before": 48, "refund_bps": 10000}, {"hours_before": 0, "refund_bps": 0}].
  rules               jsonb not null default '[]'::jsonb check (jsonb_typeof(rules) = 'array'),
  -- Null means never free. A number means free to cancel until this many
  -- hours before check-in. The filter reads this, not the jsonb.
  is_free_until_hours integer check (is_free_until_hours is null or is_free_until_hours >= 0),
  refund_to           text not null default 'wallet' check (refund_to = 'wallet'),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.cancellation_policies is
  'Platform cancellation vocabulary. rules is an ordered jsonb array of {hours_before, refund_bps} tiers; summary is the sentence a guest reads; is_free_until_hours is the scalar the shelf filter uses (null means never free). Refunds go to the wallet only.';

create unique index cancellation_policies_name_key on public.cancellation_policies (lower(name));

create trigger cancellation_policies_set_updated_at
  before update on public.cancellation_policies
  for each row execute function public.set_updated_at();

alter table public.cancellation_policies enable row level security;

create policy cancellation_policies_select_all
  on public.cancellation_policies for select
  using (true);

create policy cancellation_policies_admin_all
  on public.cancellation_policies for all
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));
