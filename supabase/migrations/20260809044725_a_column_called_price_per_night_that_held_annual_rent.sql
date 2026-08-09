-- Retiring the hotel-only shapes, and fixing a column whose name lies.
--
-- THE NAME. `listings.price_per_night_minor` has not held a nightly price
-- since 20260729112539_rental_pricing, which needed somewhere to put an annual
-- rent and chose to REINTERPRET this column rather than replace it. Its own
-- comment admits it: "Unit price in kobo per price_period unit". The reasoning
-- at the time was sound in a narrow way, that every money constraint and index
-- kept working, and it left the database with a column named price_per_night
-- holding, on the rent market this product is named after, an ANNUAL RENT.
--
-- That is the most expensive kind of wrong name. It is not confusing, it is
-- convincing. Anybody reading `price_per_night_minor * nights` writes a
-- plausible line of code that overcharges a tenant by a factor of three
-- hundred and sixty-five, and no type checker anywhere can see it.
--
-- It becomes `rate_minor`: what this listing costs for one unit of its
-- `rate_period`. That is what the column has actually meant for a while, and
-- now that rent lives in `rent_amount_minor` and a sale lives in
-- `sale_price_minor`, this one is left with the job it was originally built
-- for: a shortlet or hotel night, and a restaurant cover.
--
-- THE PERIOD. `public.price_period` is ('night', 'year') and 'year' has to go,
-- because after this file an annual figure belongs in `rent_amount_minor` with
-- a `rent_period` and nowhere else. Postgres cannot drop a value from an enum,
-- so this is a NEW TYPE plus a column swap, which is the only correct way to
-- narrow an enum and is why this file is longer than it looks like it should
-- be. The new type is ('night', 'guest'): 'guest' is added at the same time
-- because a restaurant cover has always been a per-head price filed as a
-- nightly one, which nobody could see in the data.
--
-- THE HOTEL-ONLY COLUMNS. max_guests, beds, min_stay_nights, instant_book,
-- cleaning_fee_minor and service_fee_minor are dropped. Every one of them is a
-- question about a room let by the night. None of them means anything about a
-- flat let by the year, a shop, or a plot of land, which is the overwhelming
-- majority of what this platform is for. They have been carrying not-null
-- defaults on every rental row in the schema: max_guests 1, beds 1, bathrooms
-- 1, min_stay_nights 1, instant_book false. A tenancy with a minimum stay of
-- one night is not a fact, it is a default nobody chose.
--
-- Note what is NOT dropped: hotels and shortlets remain valid property_types
-- and are staying. What is removed is the assumption baked into the table that
-- EVERY listing is a room, which is what forced a plot of land to declare how
-- many people sleep in it.
--
-- WHAT IS DELIBERATELY PRESERVED, and is the best material in this schema:
--   power_grid, power_backup, power_backup_hours, water_supply,
--   prepaid_meter, has_estate_access
-- Light, water and the gate. These matter MORE for a twelve month tenancy than
-- they ever did for a two night stay: a guest tolerates a bad generator week,
-- a tenant lives with it. Nothing here touches them.
--
-- SAFETY, AND WHY THIS IS SAFE TO RUN AT ALL. public.listings holds 0 rows and
-- public.bookings holds 0 rows, measured before this was written. The column
-- drops therefore destroy no data. If that ever stops being true, the drops
-- below must be split into a separate, later migration behind a backfill, and
-- this paragraph is the flag that says so.
--
-- public.bookings has its OWN price_per_night_minor, cleaning_fee_minor and
-- service_fee_minor. Those are the priced record of an actual stay and are
-- correct exactly as named. Nothing in this file touches the bookings table.

begin;

/* ------------------------------------------------------ 1. the rate column */

alter table public.listings rename column price_per_night_minor to rate_minor;

-- Renaming a column carries its constraints, which keep the old name. Renamed
-- too, so a violation names something that exists.
alter table public.listings
  rename constraint listings_price_per_night_minor_check to listings_rate_minor_check;

comment on column public.listings.rate_minor is
  'What one unit of rate_period costs, in integer kobo. A night for a shortlet or hotel room, a cover for a restaurant. NOT rent: an annual or monthly rent lives in rent_amount_minor with its own rent_period, and NOT an asking price: that is sale_price_minor. This column was called price_per_night_minor while holding annual rents, which is how a plausible multiplication by the number of nights could have overcharged a tenant by 365 times.';

/* --------------------------------------------------- 2. the period, swapped

   `alter type ... drop value` does not exist in Postgres, and there is no
   version in which it will: an enum value may be stored in a row, an index, a
   materialised view or a stored expression, and the server cannot cheaply
   prove that it is not. So narrowing an enum is always: new type, new column,
   copy, drop old, rename. Written out step by step because every one of these
   five statements is load bearing and skipping any of them leaves the table in
   a state where the next one fails.
   -------------------------------------------------------------------------- */

create type public.rate_period as enum ('night', 'guest');

comment on type public.rate_period is
  'The unit rate_minor is quoted in. A night for a shortlet or hotel room, a guest for a restaurant cover. It has no annual value on purpose: rent is quoted in rent_period on rent_amount_minor, and letting a yearly figure sit in a rate column is what produced a column named price_per_night holding annual rents.';

alter table public.listings add column rate_period_new public.rate_period;

/*
 * The mapping.
 *
 * 'night' carries straight over. 'year' does not map to anything in the new
 * type, and that is the point of the change: a row priced by the year is a
 * tenancy, its money belongs in rent_amount_minor, and its rate_period is
 * null because it has no nightly rate at all.
 *
 * Restaurants move to 'guest'. They have been filed under 'night' since
 * 20260807103942_property_type_restaurant, with a comment in the domain types
 * explaining that readers should treat a restaurant's nightly figure as a head
 * price. A convention documented in TypeScript is not a fact in the database.
 * Now it is one.
 */
update public.listings
set rate_period_new = case
  when property_type = 'restaurant' then 'guest'::public.rate_period
  when price_period = 'night' then 'night'::public.rate_period
  else null
end;

/*
 * The annual rows move their money before the old column loses its meaning,
 * and rate_minor is zeroed on the way past.
 *
 * Both halves matter. The first stops a rent being lost when 'year' stops
 * existing. The second is what keeps the row legal: rate_minor is not null
 * with a default of 0, and the constraint added below requires a period
 * whenever the rate is non-zero. A tenancy has no nightly rate, so its rate
 * must read as the absence of one, which for a not-null money column is zero.
 *
 * Nothing matches today, because the table is empty. It is written out in
 * full because this file has to be correct against a database restored from a
 * backup taken after supply arrives, not only against the empty one in front
 * of us.
 */
update public.listings
set rent_amount_minor = coalesce(rent_amount_minor, rate_minor),
    rent_period       = coalesce(rent_period, 'year'::public.rent_period),
    rate_minor        = 0
where price_period = 'year';

alter table public.listings drop column price_period;
alter table public.listings rename column rate_period_new to rate_period;

comment on column public.listings.rate_period is
  'The unit rate_minor is quoted in, or null when this listing has no per-unit rate because it is let by the term or sold outright.';

-- No column uses the old type now, so it can go. Anything else that had come
-- to depend on it would make this statement fail loudly, which is what is
-- wanted: a silent orphaned type is how two spellings of one idea survive.
drop type public.price_period;

-- A rate without its unit is a number nobody can read.
alter table public.listings
  add constraint listings_rate_needs_a_period
    check (rate_minor = 0 or rate_period is not null);

/* ------------------------------------------- 3. the room-by-the-night shape

   Constraints first. Dropping a column drops the constraints that name only
   that column, but a multi-column check survives and then refers to something
   that no longer exists, so anything shared is removed explicitly.
   -------------------------------------------------------------------------- */

alter table public.listings drop constraint if exists listings_max_guests_check;
alter table public.listings drop constraint if exists listings_beds_check;
alter table public.listings drop constraint if exists listings_min_stay_nights_check;
alter table public.listings drop constraint if exists listings_cleaning_fee_minor_check;
alter table public.listings drop constraint if exists listings_service_fee_minor_check;

alter table public.listings
  drop column if exists max_guests,
  drop column if exists beds,
  drop column if exists min_stay_nights,
  drop column if exists instant_book,
  drop column if exists cleaning_fee_minor,
  drop column if exists service_fee_minor;

/* ---------------------------------------------- 4. light, water and the gate

   Not touched by anything above. Recorded here as a comment so that the next
   person tempted to "tidy up the listings table" reads why these stay.
   -------------------------------------------------------------------------- */
comment on column public.listings.power_grid is
  'Which band the disco feeder is on. PRESERVED THROUGH THE PROPERTY REBUILD ON PURPOSE, along with power_backup, power_backup_hours, water_supply, prepaid_meter and has_estate_access. Light, water and the gate are the three questions asked in this market before the price, and they matter more on a twelve month tenancy than they ever did on a two night stay: a guest tolerates a bad generator week, a tenant lives with it.';

commit;
