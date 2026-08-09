-- Every listing on RentMe was listed on RentMe. No feeds, ever.
--
-- WHAT THIS REMOVES, AND WHY IT IS A DELETION RATHER THAN A SWITCH.
--
-- The platform carried third-party inventory: hotel rooms and rates from
-- LiteAPI, and hotel and restaurant venues from Google Places, merged into
-- discovery behind first-party rows. Two feature flags gated it, both enabled
-- in production, and roughly five thousand lines of provider, mapping, dedupe
-- and quota code stood behind them. All of that application code is gone in
-- the same change as this migration.
--
-- The reason is not cost and it is not quota. It is that a feed cannot be held
-- to anything this product promises. There is nobody to message, nobody to
-- inspect a place with, nobody to be accountable when a room is not what the
-- picture showed, and no way to put money in escrow because there is no
-- counterparty on the platform to release it to. The verification ladder means
-- something precisely because there is a person at the top of it. A shelf that
-- mixes people with feeds teaches a reader that the badge is decoration.
--
-- NOTE ON SCOPE, BECAUSE IT HAS BEEN GOT WRONG ONCE ALREADY: hotels and
-- restaurants remain perfectly valid listing kinds. `public.property_type`
-- still carries 'hotel' and 'restaurant' and neither is touched here. What is
-- deleted is the IMPORT, not the category. A hotel put up by the person who
-- owns it is first-party inventory like any other listing.
--
-- SAFETY. Measured against the live database before this file was written:
--   public.partner_stay_intents  0 rows
--   public.places_cache          243 rows, every one of them a cached Google
--                                Places payload, written by a module that no
--                                longer exists and read by nothing.
-- So the only data destroyed is third-party data that nobody on this platform
-- created and nobody can any longer use. No RentMe row of any kind is touched.
--
-- Flag rows are DELETED rather than set to false. A disabled flag is a promise
-- that somebody may enable it, and there is nothing left behind these two to
-- enable: the code they gated does not exist. Leaving them would be an
-- invitation to switch on a feature that is now a no-op, or worse, a hint to a
-- future reader that partner inventory is a direction this product might take.

begin;

-- 1. The off-platform booking handoff.
--
-- This table recorded a guest's intent to book a partner hotel that RentMe
-- could not itself sell: which provider, which upstream hotel id, the dates,
-- and the quoted rate at the moment they were handed over. It exists only
-- because the booking happened somewhere else. Nothing on RentMe references
-- it, and its only inbound foreign key is its own, to auth.users.
drop table if exists public.partner_stay_intents;

-- 2. The Google Places response cache.
--
-- Keyed by Google's own place_id, holding the payload and a fetched_at so the
-- provider layer could avoid re-billing a request it had already made. Its
-- only writer was lib/inventory/providers/places.ts. With that file deleted
-- this is 243 rows of somebody else's data with no reader, which is the exact
-- definition of what this change is removing.
--
-- The security pass revokes anon and authenticated grants on this table by
-- name. That statement is written to tolerate the table already being gone, so
-- the two migrations may be applied in either order.
drop table if exists public.places_cache;

-- 3. The flags.
--
-- Both were enabled = true in production when this was written, so this is a
-- live behaviour change and not a tidy-up of something already off.
delete from public.feature_flags where key in ('hybrid_hotels', 'hybrid_restaurants');

commit;
