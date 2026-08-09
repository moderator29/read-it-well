-- Rental economics. None of this existed.
--
-- The database could state one number about a tenancy: `price_per_night_minor`
-- reinterpreted as an annual rent by 20260729112539_rental_pricing. That is
-- the number on the card, and in Nigeria it is not the number anybody pays.
--
-- A 3.5m a year flat in Lekki is advertised at 3.5m and asks for something
-- closer to 5.5m before the keys move: a year's rent up front, a caution
-- deposit of ten per cent or a full month, agency at ten per cent, legal at
-- ten per cent, an agreement fee, and a service charge that on an estate can
-- be a seven-figure sum of its own. Every one of those is normal, every one is
-- disclosed late, and the gap between the advertised figure and the real one
-- is the single most common reason a Nigerian renter wastes a Saturday on an
-- inspection for a place they were never going to be able to take.
--
-- So `total_move_in_cost_minor` is a FIRST CLASS COLUMN and not a computed
-- view. Three reasons, in order of weight:
--
--   1. It is the number people shop on. A filter, a sort and a map colour all
--      want it in the index, and a generated expression over seven nullable
--      columns is not something Postgres will index the way a real column is.
--
--   2. The parts are not always known. A landlord who states 3.5m rent and
--      "about 5.5m to move in" has told the truth twice; a derived total would
--      either refuse that listing or invent a breakdown that adds up. The
--      total being independently storable is what lets somebody answer the
--      question they can answer.
--
--   3. The parts do not always add up, and the platform must not pretend they
--      do. Some agents fold legal into agency. Some quote a service charge
--      that is billed by the estate and never touches them. A generated column
--      would silently produce a figure nobody quoted.
--
-- A check constraint keeps it honest in the one direction that matters: it may
-- never be LESS than the rent plus the stated fees. It may be more, because
-- there is always something nobody itemised.
--
-- MONEY IS INTEGER KOBO. bigint, never numeric, never a float. 3.5m naira is
-- 350000000. bigint tops out around 92 quadrillion kobo, which is 922 trillion
-- naira, which is comfortably beyond any Nigerian property transaction.
--
-- SAFETY. public.listings holds 0 rows. Every column below is nullable, so
-- there is no default to backfill and no existing write path to break: the
-- listing wizard does not know about any of this yet and carries on writing
-- what it always wrote.

begin;

/* --------------------------------------------------------------- the period

   A new enum rather than reusing public.price_period.

   price_period is ('night', 'year') and it describes the RATE on a shortlet or
   a per-head restaurant cover. Rent is billed on its own cycle, and monthly
   and quarterly tenancies are ordinary here even though annual dominates: a
   self-contained room in Surulere is very often monthly, and a lot of
   commercial space is quarterly. Reusing price_period would mean adding
   'month' and 'quarter' to a type that is also read as a nightly rate, and
   then no reader could tell which sense a value was in.
   -------------------------------------------------------------------------- */
create type public.rent_period as enum ('month', 'quarter', 'year');

comment on type public.rent_period is
  'The cycle a rent is quoted and paid on. Annual dominates the Nigerian market and is the default assumption, but monthly rooms and quarterly commercial space are ordinary and cannot be forced into a yearly figure.';

/* -------------------------------------------------------------- furnishing */
create type public.furnishing as enum ('unfurnished', 'semi_furnished', 'fully_furnished');

comment on type public.furnishing is
  'How much of the place comes with it. Semi furnished in Nigeria usually means fitted kitchen and wardrobes with no soft furniture, which is why it is a middle value and not a boolean.';

/* ----------------------------------------------------------------- columns */

alter table public.listings
  -- The headline. Nullable because a sale listing has no rent.
  add column if not exists rent_amount_minor bigint,
  add column if not exists rent_period public.rent_period,
  add column if not exists rent_negotiable boolean not null default false,

  -- Refundable in principle. Everybody in this market knows it often is not,
  -- which is a reason to record it rather than to leave it off the listing.
  add column if not exists caution_deposit_minor bigint,

  -- The estate's bill: security, waste, generator diesel, the gate. Billed on
  -- its own cycle, which is frequently not the rent's, so it carries its own.
  add column if not exists service_charge_minor bigint,
  add column if not exists service_charge_period public.rent_period,

  -- The three that arrive at the end. Named separately rather than lumped
  -- into "fees" because a tenant negotiates them separately and because an
  -- agency that charges no legal fee should be able to show a zero.
  add column if not exists agency_fee_minor bigint,
  add column if not exists legal_fee_minor bigint,
  add column if not exists agreement_fee_minor bigint,

  -- The number this whole file exists for.
  add column if not exists total_move_in_cost_minor bigint,

  add column if not exists minimum_tenancy_months smallint,
  add column if not exists available_from date,
  add column if not exists furnished public.furnishing;

comment on column public.listings.rent_amount_minor is
  'Rent in integer kobo for one rent_period. Null on a sale listing. This is the advertised figure and is almost never what somebody pays to move in: see total_move_in_cost_minor.';
comment on column public.listings.rent_period is
  'The cycle rent_amount_minor is quoted on. Required whenever rent_amount_minor is set, so a bare number can never be read as the wrong cycle.';
comment on column public.listings.rent_negotiable is
  'The landlord has said the rent is open to an offer. False means they have not said so, not that they refused.';
comment on column public.listings.caution_deposit_minor is
  'Refundable damage deposit in kobo, held by the landlord. Commonly ten per cent of the annual rent or one month of it.';
comment on column public.listings.service_charge_minor is
  'Estate or building service charge in kobo for one service_charge_period. Security, waste, diesel for the estate generator, the gate. Frequently billed on a different cycle from the rent, which is why it carries its own period.';
comment on column public.listings.service_charge_period is
  'The cycle service_charge_minor is billed on. Required whenever service_charge_minor is set.';
comment on column public.listings.agency_fee_minor is
  'The agent''s commission in kobo, paid by the incoming tenant. Conventionally ten per cent of the annual rent. Zero is a meaningful answer and means the agent is charging the tenant nothing.';
comment on column public.listings.legal_fee_minor is
  'Fee in kobo for preparing and executing the tenancy agreement, conventionally ten per cent of the annual rent. Some agencies fold this into agency_fee_minor, which is why the two are separate columns and why the total is not derived from them.';
comment on column public.listings.agreement_fee_minor is
  'The flat charge in kobo for the tenancy agreement document itself, where it is billed separately from legal_fee_minor.';
comment on column public.listings.total_move_in_cost_minor is
  'Everything in kobo that has to be found before the keys change hands: rent, caution deposit, agency, legal, agreement and any first service charge. THE NUMBER PEOPLE ACTUALLY SHOP ON. Stored rather than derived because the parts are often unknown while the total is known, because some agents fold fees into each other so a sum would invent a breakdown nobody quoted, and because a filter and a sort need it indexed. A check constraint holds it at or above the sum of whichever parts were stated; it may exceed them, because something is always unitemised.';
comment on column public.listings.minimum_tenancy_months is
  'The shortest term the landlord will grant. Two years up front is common in Lagos and is a hard filter for somebody on a one year budget.';
comment on column public.listings.available_from is
  'The date the property can actually be occupied. Null means now. A place that is free in four months is not the same offer as one free on Saturday, and hiding that until the inspection wastes everybody''s day.';
comment on column public.listings.furnished is
  'Unfurnished, semi furnished or fully furnished. Null means the lister did not say, which is rendered as unanswered and never as unfurnished.';

/* -------------------------------------------------------------- constraints

   Money may be zero and may not be negative. Zero is a real answer: an agent
   waiving their commission should be able to say so, and a rendered "no agency
   fee" is worth more to a reader than an absent row.
   -------------------------------------------------------------------------- */
alter table public.listings
  add constraint listings_rent_amount_nonneg
    check (rent_amount_minor is null or rent_amount_minor >= 0),
  add constraint listings_caution_deposit_nonneg
    check (caution_deposit_minor is null or caution_deposit_minor >= 0),
  add constraint listings_service_charge_nonneg
    check (service_charge_minor is null or service_charge_minor >= 0),
  add constraint listings_agency_fee_nonneg
    check (agency_fee_minor is null or agency_fee_minor >= 0),
  add constraint listings_legal_fee_nonneg
    check (legal_fee_minor is null or legal_fee_minor >= 0),
  add constraint listings_agreement_fee_nonneg
    check (agreement_fee_minor is null or agreement_fee_minor >= 0),
  add constraint listings_total_move_in_nonneg
    check (total_move_in_cost_minor is null or total_move_in_cost_minor >= 0),
  add constraint listings_minimum_tenancy_positive
    check (minimum_tenancy_months is null or minimum_tenancy_months > 0);

-- An amount without its cycle is not an amount. This is the constraint that
-- stops "250,000" being read as a year when it was a month.
alter table public.listings
  add constraint listings_rent_needs_a_period
    check (rent_amount_minor is null or rent_period is not null),
  add constraint listings_service_charge_needs_a_period
    check (service_charge_minor is null or service_charge_period is not null);

/*
 * The total may never undercut its own parts.
 *
 * One direction only. Stating a total ABOVE the stated parts is honest and
 * common: the parts that were itemised are not all the parts. Stating a total
 * BELOW them is arithmetic that cannot be true, and it is the shape a listing
 * takes when somebody is advertising an attractive move-in figure while the
 * fees underneath say otherwise.
 *
 * `coalesce(..., 0)` throughout, so an unstated part contributes nothing and a
 * listing that states only rent and a total is not refused.
 *
 * The rent term is the rent for ONE period. A two year minimum tenancy on an
 * annual rent means the real cash is double, and this deliberately does not
 * try to know that: minimum_tenancy_months is a separate column a reader can
 * see, and folding it in here would make the constraint reject perfectly
 * honest listings whose total covers one year of a two year term.
 */
alter table public.listings
  add constraint listings_total_move_in_covers_its_parts
    check (
      total_move_in_cost_minor is null
      or total_move_in_cost_minor >=
           coalesce(rent_amount_minor, 0)
         + coalesce(caution_deposit_minor, 0)
         + coalesce(agency_fee_minor, 0)
         + coalesce(legal_fee_minor, 0)
         + coalesce(agreement_fee_minor, 0)
    );

/* --------------------------------------------------------------- the index

   Budget is the first filter almost everybody applies, and after this file the
   honest budget column is the move-in total rather than the rent. Partial on
   PUBLISHED rent listings that actually carry the figure: a null total cannot
   satisfy a range query, and indexing the nulls would carry every draft and
   every sale listing for no reader.
   -------------------------------------------------------------------------- */
create index if not exists listings_move_in_cost_idx
  on public.listings (total_move_in_cost_minor)
  where status = 'PUBLISHED'
    and listing_intent = 'rent'
    and total_move_in_cost_minor is not null;

create index if not exists listings_rent_amount_idx
  on public.listings (rent_amount_minor)
  where status = 'PUBLISHED'
    and listing_intent = 'rent'
    and rent_amount_minor is not null;

commit;
