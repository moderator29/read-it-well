-- Sale economics. Also entirely absent until now.
--
-- There was no way to express a property for sale in this database at all. No
-- asking price, no title, no year built, no way to mark one sold. A platform
-- whose name is about renting is also a platform people will try to buy on,
-- and land in particular is bought far more often than it is let.
--
-- THE PART THAT IS NOT LIKE OTHER MARKETS: TENURE.
--
-- In most property markets tenure is a footnote. In Nigeria it is the whole
-- transaction. The Land Use Act vests all land in a state's Governor, so what
-- somebody sells you is almost never freehold in the English sense: it is a
-- right of occupancy, and what makes it safe is the paperwork behind it.
--
--   certificate_of_occupancy  The C of O. A right of occupancy granted by the
--                             Governor, typically ninety-nine years. The
--                             strongest ordinary title and the one buyers ask
--                             for by name.
--   governors_consent         Where land already under a C of O is sold on,
--                             the Governor must consent to the transfer. A
--                             sale without it is not perfected however good
--                             the original C of O was, which is precisely the
--                             gap most Lagos land fraud lives in.
--   deed_of_assignment        The instrument transferring the interest. On its
--                             own it evidences a transaction, not a perfected
--                             title, and it is routinely presented as though
--                             it were the latter.
--   gazette                   Land excised back to a family or community and
--                             published in the state gazette. Real, common,
--                             and weaker than a C of O.
--   freehold                  Genuine freehold, which does exist in pockets,
--                             mostly pre-Act.
--   leasehold                 A lease for a stated term from a titleholder.
--
-- These are recorded as an ENUM rather than free text on purpose. Free text
-- means "C of O", "CofO", "C-of-O" and "certificate of occupancy" are four
-- different filters, and it means nobody can ever count how much of the
-- catalogue is unperfected. A closed list also makes the honest answer
-- available: NULL means the seller did not state a title, which is a red flag
-- a buyer should see stated plainly rather than inferred from a blank.
--
-- WHAT THIS DELIBERATELY DOES NOT DO: verify anything. Nothing in this schema
-- can tell you a title is good. Only a lawyer at the land registry can. The
-- column records a CLAIM, and the copy on every surface that reads it has to
-- say so.
--
-- SAFETY. public.listings holds 0 rows. Every column is nullable except
-- sale_status, which takes a default. No existing write path is touched.

begin;

create type public.land_tenure as enum (
  'certificate_of_occupancy',
  'governors_consent',
  'deed_of_assignment',
  'gazette',
  'freehold',
  'leasehold'
);

comment on type public.land_tenure is
  'The title a seller CLAIMS, in the vocabulary Nigerian land actually uses. A closed list so that "C of O" and "CofO" cannot become two filters, and so that unperfected title can be counted. Records a claim and never a verification: only a lawyer at the land registry can confirm any of these.';

create type public.sale_status as enum (
  'available',
  -- An offer is accepted and the paperwork is running. Still visible, because
  -- deals fall through here constantly and a buyer wants to know it exists.
  'under_offer',
  'sold'
);

comment on type public.sale_status is
  'Where a sale listing has got to. under_offer stays visible on purpose: Nigerian property deals collapse at the consent and search stage often enough that a buyer is right to want to see one.';

create type public.build_condition as enum (
  'newly_built',
  'renovated',
  'old',
  -- Sold before it is built. Ordinary in Lagos and Abuja, and the single
  -- riskiest thing a buyer can hand money over for, so it gets its own value
  -- rather than being hidden inside "newly built".
  'off_plan'
);

comment on type public.build_condition is
  'The state of the building. off_plan means it does not exist yet, which is an ordinary Nigerian offer and also the one that most needs to be stated rather than implied by a rendering.';

alter table public.listings
  add column if not exists sale_price_minor bigint,
  add column if not exists price_negotiable boolean not null default false,
  add column if not exists tenure public.land_tenure,
  add column if not exists year_built smallint,
  add column if not exists sale_status public.sale_status;

comment on column public.listings.sale_price_minor is
  'Asking price in integer kobo. Null on a rental listing. The asking price only: a Nigerian purchase also carries agency, legal and consent fees, and those are the buyer''s lawyer''s business rather than something this platform can state.';
comment on column public.listings.price_negotiable is
  'The seller has said the asking price is open to an offer. False means they have not said so, not that they refused one.';
comment on column public.listings.tenure is
  'The title the seller claims to hold. A CLAIM, never a verification. Null means no title was stated, which is information a buyer needs shown to them plainly rather than left as a blank field.';
comment on column public.listings.year_built is
  'The year the building was completed. Null on land and on anything off plan. Bounded below at 1800 and above at five years out, which allows a delivery date to be stated for a build in progress.';
comment on column public.listings.sale_status is
  'available, under_offer or sold. Null on a rental listing; required on a sale listing by listings_sale_needs_a_status.';

alter table public.listings
  add constraint listings_sale_price_nonneg
    check (sale_price_minor is null or sale_price_minor >= 0),
  -- The upper bound is deliberately generous rather than "this year": a build
  -- under way is legitimately advertised with the year it completes.
  add constraint listings_year_built_plausible
    check (
      year_built is null
      or (year_built >= 1800
          and year_built <= extract(year from (now() at time zone 'Africa/Lagos'))::smallint + 5)
    );

/*
 * A sale listing has a status; a rental listing does not.
 *
 * Both directions are enforced, because half of this constraint is the one
 * that keeps the data readable. Without the second clause a rental could be
 * marked 'sold', and every count of sold property would quietly include
 * tenancies.
 */
alter table public.listings
  add constraint listings_sale_needs_a_status
    check (
      (listing_intent = 'sale' and sale_status is not null)
      or (listing_intent <> 'sale' and sale_status is null)
    );

/*
 * Price index, partial on what is actually shoppable.
 *
 * 'sold' is excluded rather than filtered at read time: a sold listing has no
 * business appearing in a price range, and once this table has years of them
 * on it they would be the majority of the index. under_offer is included
 * because it is still an offer somebody may want to see.
 */
create index if not exists listings_sale_price_idx
  on public.listings (sale_price_minor)
  where status = 'PUBLISHED'
    and listing_intent = 'sale'
    and sale_status <> 'sold'
    and sale_price_minor is not null;

/*
 * Tenure index.
 *
 * "Only show me C of O" is the first filter a serious land buyer applies, and
 * the nulls are excluded because "no title stated" is not a tenure somebody
 * filters FOR. It is a warning they read on the listing.
 */
create index if not exists listings_tenure_idx
  on public.listings (tenure)
  where status = 'PUBLISHED'
    and listing_intent = 'sale'
    and tenure is not null;

commit;
