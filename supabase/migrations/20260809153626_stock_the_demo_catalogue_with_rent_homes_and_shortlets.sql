-- TRANSCRIBED FROM THE LIVE DATABASE ON 22 SEPTEMBER 2026.
--
-- Applied to `uccixoonmbhrnyczyigt` on 9 August 2026 as version 20260809153626,
-- with NO FILE FOR IT IN THIS REPOSITORY. Reproduced verbatim from
-- `supabase_migrations.schema_migrations.statements`.
--
-- THIS IS WHERE TWENTY TWO OF THE SIXTY FOUR EXAMPLE LISTINGS COME FROM, and
-- knowing that matters, because the platform survey's launch blocker is that
-- 64 of 64 published listings are `is_demo`. Every row here is inserted with
-- `is_demo = true` and sits in the `ed000000-...` id block, so the whole
-- example set can still be taken in one predicate when real supply arrives.

/*
 * Twenty two more example properties, weighted at the markets that had none.
 *
 * WHAT WAS WRONG. The demo catalogue held forty two places and its shape did
 * not match the product: sixteen apartments, ten homes, three shortlets, one
 * villa, one hotel, and ZERO rentals. Yearly rent is the market this platform
 * is built around - it is the only one with a move-in cost breakdown, a
 * minimum tenancy and an agency fee - and Explore could not show a single one.
 * A category tile reading "Yearly rent, 0" is a shelf with nothing on it.
 *
 * WHAT THIS ADDS. Eight rentals, four homes to let, five shortlets, two
 * villas, one hotel room and two houses for sale, across the six cities the
 * map already covers. Every rental carries the full Nigerian cost picture,
 * derived here rather than typed, so caution, agency, legal and agreement are
 * consistent proportions of the rent and the total is the sum of its parts
 * instead of a number somebody keyed in.
 *
 * ALL MONEY ARITHMETIC IS CAST TO BIGINT BEFORE IT IS MULTIPLIED. A VALUES
 * literal types as `integer`, and a twenty five million naira rent times a
 * hundred is two and a half billion kobo, which overflows it. Casting after
 * the multiply is too late; this is the same reason the application layer
 * holds money in integer kobo and never in a float.
 *
 * NOTHING IS DELETED AND NOTHING IS UPDATED. This migration only inserts, and
 * every row it inserts is `is_demo = true`, which means: labelled as an example
 * on every surface that renders it, excluded from the verified badge, excluded
 * from ratings, and retired automatically by the demo retirement trigger. No
 * real listing, agent or booking is touched.
 *
 * The ids continue the existing `ed000000-...` block so a later cleanup can
 * still take the whole demo set in one predicate.
 */

with spec(n, title, ptype, state_code, city, area, lat, lng, beds, baths, toilets, parking,
          sqm, built, furn, cond, grid, backup, backup_hours, water, prepaid, estate,
          rent_naira, floors_at, floors_of, descr) as (values
  (43, 'Mini flat in Yaba', 'rental', 'LA', 'Lagos', 'Yaba', 6.5095, 3.3711, 1, 1, 1, 1,
   42.0, 2016, 'unfurnished', 'renovated', 'MOSTLY_ON', 'GENERATOR', 10, 'BOREHOLE', true, false,
   1200000::bigint, 1, 3, 'One room, its own kitchen and bathroom, on the first floor of a small block off Commercial Avenue.'),
  (44, 'Two bedroom flat in Ikeja GRA', 'rental', 'LA', 'Lagos', 'Ikeja GRA', 6.5793, 3.3487, 2, 2, 3, 1,
   88.0, 2012, 'unfurnished', 'renovated', 'BAND_A', 'GENERATOR', 14, 'BOREHOLE', true, true,
   2800000, 2, 4, 'Two bedrooms, both en suite, in a gated compound of six flats with a shared generator.'),
  (45, 'Self contained in Akoka', 'rental', 'LA', 'Lagos', 'Akoka', 6.5194, 3.3903, 1, 1, 1, 0,
   28.0, 2018, 'unfurnished', 'newly_built', 'PATCHY', 'GENERATOR', 8, 'BOREHOLE', true, false,
   750000, 3, 3, 'A single room with its own bathroom and a kitchenette, five minutes from the university gate.'),
  (46, 'Three bedroom flat in Wuse 2', 'rental', 'FC', 'Abuja', 'Wuse 2', 9.0765, 7.4744, 3, 3, 4, 2,
   140.0, 2019, 'semi_furnished', 'newly_built', 'BAND_A', 'GENERATOR_INVERTER', 20, 'TREATED_MAINS', true, true,
   4500000, 3, 5, 'Three bedrooms with fitted wardrobes, a separate dining area, and a lift in the block.'),
  (47, 'Two bedroom bungalow in Rumuokoro', 'rental', 'RI', 'Port Harcourt', 'Rumuokoro', 4.8618, 6.9931, 2, 2, 2, 2,
   96.0, 2011, 'unfurnished', 'renovated', 'PATCHY', 'GENERATOR', 12, 'BOREHOLE', false, true,
   1600000, 1, 1, 'A standalone bungalow in a fenced yard with room for two cars and a small garden at the back.'),
  (48, 'Three bedroom flat in Bodija', 'rental', 'OY', 'Ibadan', 'Bodija', 7.4306, 3.9105, 3, 2, 3, 2,
   118.0, 2015, 'unfurnished', 'renovated', 'MOSTLY_ON', 'GENERATOR', 10, 'BOREHOLE', true, false,
   1800000, 1, 2, 'Ground floor of a two storey house on a quiet street, with a fitted kitchen and a back yard.'),
  (49, 'Two bedroom flat in Independence Layout', 'rental', 'EN', 'Enugu', 'Independence Layout', 6.4413, 7.5203, 2, 2, 2, 1,
   84.0, 2013, 'unfurnished', 'renovated', 'MOSTLY_ON', 'GENERATOR', 9, 'BOREHOLE', true, true,
   1100000, 2, 3, 'Two bedrooms in a well kept block, with a security post at the estate entrance.'),
  (50, 'Four bedroom terrace in Lekki Phase 1', 'rental', 'LA', 'Lagos', 'Lekki Phase 1', 6.4419, 3.4699, 4, 4, 5, 2,
   210.0, 2020, 'semi_furnished', 'newly_built', 'BAND_A', 'GENERATOR_INVERTER', 24, 'PUMPED_STORAGE', true, true,
   6500000, 1, 3, 'Four bedrooms over three floors, a maids room off the kitchen, and a rooftop terrace.'),

  (51, 'Three bedroom bungalow in Magodo', 'home', 'LA', 'Lagos', 'Magodo', 6.6183, 3.3711, 3, 3, 4, 2,
   150.0, 2014, 'unfurnished', 'renovated', 'BAND_A', 'GENERATOR', 16, 'BOREHOLE', true, true,
   3200000, 1, 1, 'A detached bungalow on its own plot inside the estate, with a gate house and a lawn.'),
  (52, 'Five bedroom detached house in Asokoro', 'home', 'FC', 'Abuja', 'Asokoro', 9.0392, 7.5244, 5, 5, 6, 4,
   420.0, 2018, 'semi_furnished', 'newly_built', 'BAND_A', 'GENERATOR_INVERTER', 24, 'TREATED_MAINS', true, true,
   12000000, 1, 2, 'Five bedrooms, a study, staff quarters and parking for four cars behind an electric gate.'),
  (53, 'Four bedroom duplex in New GRA', 'home', 'RI', 'Port Harcourt', 'New GRA', 4.8242, 7.0336, 4, 4, 5, 3,
   265.0, 2017, 'unfurnished', 'renovated', 'MOSTLY_ON', 'GENERATOR', 18, 'BOREHOLE', true, true,
   5000000, 1, 2, 'A duplex on a corner plot with a walled compound, a borehole and a treatment tank.'),
  (54, 'Three bedroom house in Jericho', 'home', 'OY', 'Ibadan', 'Jericho', 7.4056, 3.8790, 3, 3, 3, 2,
   180.0, 2010, 'unfurnished', 'renovated', 'MOSTLY_ON', 'GENERATOR', 12, 'BOREHOLE', false, true,
   2200000, 1, 1, 'An older house kept in good order, with mature trees in the compound and a separate boys quarters.')
)
insert into public.listings (
  id, agent_id, title, description, property_type, status, state_code, city, area,
  latitude, longitude, bedrooms, bathrooms, toilets, parking_spaces, size_sqm, year_built,
  furnished, condition, power_grid, power_backup, power_backup_hours, water_supply,
  prepaid_meter, has_estate_access, floor, total_floors,
  listing_intent, rent_amount_minor, rent_period, rent_negotiable,
  caution_deposit_minor, service_charge_minor, service_charge_period,
  agency_fee_minor, legal_fee_minor, agreement_fee_minor, total_move_in_cost_minor,
  minimum_tenancy_months, available_from, rate_minor,
  submitted_at, reviewed_at, published_at, is_demo
)
select
  ('ed000000-0000-4000-8000-0000000000' || lpad(to_hex(n), 2, '0'))::uuid,
  'e0000000-0000-4000-8000-000000000002'::uuid,
  title, descr, ptype::property_type, 'PUBLISHED'::listing_status, state_code, city, area,
  lat, lng, beds, baths, toilets::smallint, parking::smallint, sqm, built::smallint,
  furn::furnishing, cond::build_condition, grid::power_grid, backup::power_backup,
  backup_hours::smallint, water::water_supply, prepaid, estate, floors_at::smallint, floors_of::smallint,
  'rent'::listing_intent, rent_naira::bigint * 100, 'year'::rent_period, false,
  /* Caution is a fifth of the rent, agency and legal a tenth each, agreement a
     twentieth, service charge a twentieth. Derived rather than typed so the
     parts and the total can never disagree, which is the whole reason the
     move-in breakdown is trustworthy on this platform. */
  (rent_naira::bigint * 20 / 100) * 100,
  (rent_naira::bigint *  5 / 100) * 100, 'year'::rent_period,
  (rent_naira::bigint * 10 / 100) * 100,
  (rent_naira::bigint * 10 / 100) * 100,
  (rent_naira::bigint *  5 / 100) * 100,
  (rent_naira::bigint * 150 / 100) * 100,
  12::smallint, current_date + 14, 0,
  now(), now(), now(), true
from spec;

/* --------------------------------------------------------------- shortlets */

with spec(n, title, ptype, state_code, city, area, lat, lng, beds, baths, sqm, built,
          grid, backup, water, estate, night_naira, descr) as (values
  (55, 'One bedroom shortlet on Victoria Island', 'shortlet', 'LA', 'Lagos', 'Victoria Island', 6.4281, 3.4219, 1, 1, 55.0, 2021,
   'BAND_A', 'GENERATOR_INVERTER', 'TREATED_MAINS', true, 85000::bigint,
   'One bedroom with a kitchen, a work desk and a balcony, in a serviced block a street back from the water.'),
  (56, 'Studio shortlet in Ikoyi', 'shortlet', 'LA', 'Lagos', 'Ikoyi', 6.4523, 3.4356, 1, 1, 38.0, 2022,
   'BAND_A', 'GENERATOR_INVERTER', 'TREATED_MAINS', true, 65000,
   'A studio with a full kitchen and fast internet, cleaned between stays, with parking in the compound.'),
  (57, 'Two bedroom shortlet in Lekki Phase 1', 'shortlet', 'LA', 'Lagos', 'Lekki Phase 1', 6.4460, 3.4738, 2, 2, 92.0, 2020,
   'BAND_A', 'GENERATOR_INVERTER', 'PUMPED_STORAGE', true, 120000,
   'Two bedrooms, both en suite, a living room that seats six, and twenty four hour power in the estate.'),
  (58, 'One bedroom shortlet in Wuse 2', 'shortlet', 'FC', 'Abuja', 'Wuse 2', 9.0820, 7.4691, 1, 1, 48.0, 2019,
   'BAND_A', 'GENERATOR', 'TREATED_MAINS', true, 70000,
   'A one bedroom flat kept for short stays, ten minutes from the business district, with a gym in the block.'),
  (59, 'Two bedroom shortlet in GRA Phase 2', 'shortlet', 'RI', 'Port Harcourt', 'GRA Phase 2', 4.8095, 7.0180, 2, 2, 78.0, 2018,
   'MOSTLY_ON', 'GENERATOR', 'BOREHOLE', true, 55000,
   'Two bedrooms in a quiet compound with a generator that runs through the night and parking for two.'),
  (60, 'Hotel room in Ikeja', 'hotel', 'LA', 'Lagos', 'Ikeja', 6.6018, 3.3515, 1, 1, 32.0, 2016,
   'BAND_A', 'GENERATOR_INVERTER', 'TREATED_MAINS', true, 45000,
   'A double room with breakfast, twenty minutes from the airport, with a restaurant and a car park on site.')
)
insert into public.listings (
  id, agent_id, title, description, property_type, status, state_code, city, area,
  latitude, longitude, bedrooms, bathrooms, toilets, parking_spaces, size_sqm, year_built,
  furnished, condition, power_grid, power_backup, power_backup_hours, water_supply,
  prepaid_meter, has_estate_access,
  listing_intent, rate_minor, rate_period,
  submitted_at, reviewed_at, published_at, is_demo
)
select
  ('ed000000-0000-4000-8000-0000000000' || lpad(to_hex(n), 2, '0'))::uuid,
  'e0000000-0000-4000-8000-000000000002'::uuid,
  title, descr, ptype::property_type, 'PUBLISHED'::listing_status, state_code, city, area,
  lat, lng, beds, baths, baths::smallint, 1::smallint, sqm, built::smallint,
  'fully_furnished'::furnishing, 'newly_built'::build_condition, grid::power_grid,
  backup::power_backup, 24::smallint, water::water_supply, true, estate,
  'rent'::listing_intent, night_naira::bigint * 100, 'night'::rate_period,
  now(), now(), now(), true
from spec;

/* ------------------------------------------------------- villas, and sales */

with spec(n, title, ptype, state_code, city, area, lat, lng, beds, baths, sqm, built,
          rent_naira, sale_naira, tenure_kind, descr) as (values
  (61, 'Five bedroom villa on Banana Island', 'villa', 'LA', 'Lagos', 'Banana Island', 6.4406, 3.4489, 5, 5, 520.0, 2021,
   25000000::bigint, null::bigint, null::text,
   'Five bedrooms, a pool, staff quarters and a private jetty walk, inside the estate perimeter.'),
  (62, 'Four bedroom villa in Maitama', 'villa', 'FC', 'Abuja', 'Maitama', 9.0846, 7.4951, 4, 4, 380.0, 2020,
   18000000, null, null,
   'Four bedrooms around a courtyard, a pool at the back, and a generator that carries the whole house.'),
  (63, 'Four bedroom detached house for sale on Chevron Drive', 'home', 'LA', 'Lagos', 'Chevron Drive', 6.4462, 3.5350, 4, 4, 310.0, 2019,
   null, 180000000, 'governors_consent',
   'Four bedrooms on a full plot with Governors Consent, in an estate with its own borehole and treatment plant.'),
  (64, 'Three bedroom terrace for sale in Karsana', 'home', 'FC', 'Abuja', 'Karsana', 9.1180, 7.3868, 3, 3, 195.0, 2022,
   null, 95000000, 'certificate_of_occupancy',
   'A new terrace with a Certificate of Occupancy, finished and ready, in a developing estate off the expressway.')
)
insert into public.listings (
  id, agent_id, title, description, property_type, status, state_code, city, area,
  latitude, longitude, bedrooms, bathrooms, toilets, parking_spaces, size_sqm, year_built,
  furnished, condition, power_grid, power_backup, power_backup_hours, water_supply,
  prepaid_meter, has_estate_access,
  listing_intent, rent_amount_minor, rent_period, minimum_tenancy_months,
  caution_deposit_minor, agency_fee_minor, legal_fee_minor, agreement_fee_minor,
  total_move_in_cost_minor, sale_price_minor, tenure, sale_status, price_negotiable,
  rate_minor, available_from, submitted_at, reviewed_at, published_at, is_demo
)
select
  ('ed000000-0000-4000-8000-0000000000' || lpad(to_hex(n), 2, '0'))::uuid,
  'e0000000-0000-4000-8000-000000000002'::uuid,
  title, descr, ptype::property_type, 'PUBLISHED'::listing_status, state_code, city, area,
  lat, lng, beds, baths, (baths + 1)::smallint, 3::smallint, sqm, built::smallint,
  'semi_furnished'::furnishing, 'newly_built'::build_condition, 'BAND_A'::power_grid,
  'GENERATOR_INVERTER'::power_backup, 24::smallint, 'TREATED_MAINS'::water_supply, true, true,
  case when rent_naira is null then 'sale' else 'rent' end::listing_intent,
  case when rent_naira is null then null else rent_naira * 100 end,
  case when rent_naira is null then null else 'year'::rent_period end,
  case when rent_naira is null then null else 12::smallint end,
  case when rent_naira is null then null else (rent_naira * 20 / 100) * 100 end,
  case when rent_naira is null then null else (rent_naira * 10 / 100) * 100 end,
  case when rent_naira is null then null else (rent_naira * 10 / 100) * 100 end,
  case when rent_naira is null then null else (rent_naira *  5 / 100) * 100 end,
  case when rent_naira is null then null else (rent_naira * 145 / 100) * 100 end,
  case when sale_naira is null then null else sale_naira * 100 end,
  tenure_kind::land_tenure,
  case when sale_naira is null then null else 'available'::sale_status end,
  case when sale_naira is null then false else true end,
  0, case when rent_naira is null then null else current_date + 21 end,
  now(), now(), now(), true
from spec;

/* ------------------------------------------------------------- amenities
 *
 * What each new place has, by market rather than by row: everything gets water,
 * security and a kitchen; anything let by the night is furnished with wifi, air
 * conditioning and a television because that is what "shortlet" means; anything
 * let by the year gets a generator and parking. Nothing here claims a pool or a
 * gym on a place that has not said it has one. */
insert into public.listing_amenities (listing_id, amenity_id)
select l.id, a.id
from public.listings l
join public.amenities a on a.code = any (
  case
    when l.property_type in ('shortlet', 'hotel')
      then array['water','security','kitchen','wifi','ac','tv','furnished','parking']
    when l.property_type = 'villa'
      then array['water','security','kitchen','generator','parking','pool','garden','ac']
    else array['water','security','kitchen','generator','parking']
  end
)
where l.is_demo
  and l.id >= 'ed000000-0000-4000-8000-00000000002b'::uuid
on conflict do nothing;
