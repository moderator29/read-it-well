-- The discriminator the whole product turns on: rent, or sale.
--
-- RentMe is a marketplace for renting, buying and selling. Until this file
-- there was no column anywhere in the database that said which of those a
-- listing was. `property_type` says WHAT the thing is (apartment, land, shop),
-- and every one of those ten values can be either let or sold. A three bedroom
-- flat in Yaba to rent for 4.5m a year and the same flat for sale at 180m are
-- the same property_type, the same city, the same bedroom count, and they are
-- not the same listing in any sense a buyer or a renter cares about.
--
-- What was standing in for it was `price_period`: 'year' meant a tenancy and
-- 'night' meant a shortlet. That is an inference from a billing unit, it has
-- no place for a sale at all, and every filter that wanted "show me places to
-- buy" had nothing to ask.
--
-- WHY AN ENUM AND NOT A BOOLEAN. `for_sale boolean` would be shorter and
-- wrong. Nigeria has at least one more intent that will arrive: a lease or
-- assignment of a long leasehold interest, which is neither an annual tenancy
-- nor a freehold sale. An enum takes a third value with `alter type add
-- value`; a boolean takes a migration and a rewrite of every caller.
--
-- WHY NOT NULLABLE. Every listing is one or the other. A null would mean
-- "nobody said", and there is no screen on which that is a state a reader can
-- be shown: a card has to print either a rent or an asking price. Default
-- 'rent' because that is what the platform is named after and what the
-- existing catalogue would have been.
--
-- SAFETY. public.listings holds 0 rows as this is written, so the backfill
-- below matches nothing and the not-null default costs nothing. It is written
-- out in full regardless: this file has to be correct on a database restored
-- from a backup taken later, not only on the empty one in front of us.

begin;

create type public.listing_intent as enum (
  -- Somebody will live in it or trade from it and pay to do so, weekly,
  -- monthly, quarterly or by the year. Includes shortlets and hotel rooms:
  -- a night is a very short tenancy.
  'rent',
  -- Ownership changes hands.
  'sale'
);

comment on type public.listing_intent is
  'Whether a listing is offered to let or for sale. Separate from property_type, which says what the property IS: every property_type can be either. Extend with alter type add value when a third intent (a leasehold assignment, say) needs its own word.';

alter table public.listings
  add column if not exists listing_intent public.listing_intent not null default 'rent';

comment on column public.listings.listing_intent is
  'Whether this listing is to let or for sale. Drives which economics block is required: rent_amount_minor and its fees for rent, sale_price_minor and tenure for sale.';

-- Existing rows: a 'year' price was an annual tenancy and a 'night' price was
-- a shortlet. Both are rent. There is no row anywhere in the history of this
-- table that was ever a sale, because there was no way to express one.
update public.listings set listing_intent = 'rent' where listing_intent is distinct from 'rent';

-- The index that makes the discriminator useful rather than decorative.
--
-- Partial on PUBLISHED because that is the only status discovery reads and it
-- is what RLS exposes to an anonymous visitor; a full index would carry every
-- draft and rejection for no query that wants them. `listing_intent` leads
-- because it is the coarsest cut a reader makes and the one every discovery
-- query will carry, and property_type follows it because "flats for sale in
-- Lagos" is the shape of an actual request.
create index if not exists listings_intent_type_published_idx
  on public.listings (listing_intent, property_type, state_code, city)
  where status = 'PUBLISHED';

commit;
