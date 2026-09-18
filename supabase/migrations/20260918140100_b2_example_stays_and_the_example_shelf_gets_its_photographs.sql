-- B2 of the third-edition build: the example stays (five accommodations of
-- four kinds and two restaurants with hours), and photographs on the 64
-- example listings, so the stays read layer and the shelves render the real
-- product instead of an empty state.
--
-- EVERYTHING HERE IS REVERSIBLE BY is_demo. The five businesses carry
-- is_demo = true and every accommodation, room type, rate plan, calendar row,
-- inventory row, photo, amenity link, restaurant profile and service window
-- hangs off them by cascading foreign key, so `delete from public.businesses
-- where is_demo` takes the whole set down. M2's trigger refuses a verified
-- agent on an example business, M3's copies is_demo down to accommodations,
-- M4's to room types, and M9 projects is_demo onto every catalogue row, so
-- the badge is structurally impossible and the demo-refusal trigger refuses
-- a booking against any of it. The listing photographs are removed by their
-- path prefix over `is_demo` listings. The two cancellation policies are the
-- one thing that outlives a reversal, because policies are reference data
-- with no is_demo column; they are named below so a reversal can drop them
-- by id.
--
-- THE OWNER is the platform's own example account
-- (`e0000000-0000-4000-8000-000000000001`, 20260809080755), for exactly the
-- reason the example listings are listed by it: an invented hotel group with
-- a plausible Nigerian name is a name somebody may actually trade under, and
-- a real person's name on a hotel that does not exist is worse. `agent_id` is
-- null: the badge means a human was checked, and nobody was.
--
-- THE NAMES are fictional (never a real brand): Grand Vista Hotel and Eko
-- Pearl Apartments are the catalogue's own; Lagoon Crest Resort, Maitama
-- Court Guest House, Wuse Skyline Suites, Harbour Lights Kitchen and Jabi
-- Lakeside Grill are made for this file. Coordinates are real points inside
-- the named areas, addresses are null (the example-listings rule: a street
-- address on an invented property is somebody's actual building).
--
-- PHOTOGRAPHS are absolute public paths the app serves itself
-- (`/brand/photos/<name>.jpg`, filed by the lead under apps/web/public), not
-- storage-bucket paths. `accommodationPhotoUrl` and the listing repository's
-- `photoUrl` pass a leading-slash path through untouched. Money is kobo
-- bigint; the rate calendar carries a 15 percent Friday and Saturday uplift
-- in integer arithmetic (rate * 115 / 100, bigint division).
--
-- DATES are relative to the day this is applied: 90 nights of rate calendar
-- and inventory from current_date, so a dated search finds rooms whenever the
-- lead applies it. Replaying it later is safe: every insert is `on conflict
-- do nothing` on its natural key, so a second run only adds the calendar days
-- that did not exist yet.
--
-- HOW THE LEAD PROBES THIS, inside one transaction that is rolled back:
--
--   begin;
--   -- 1. Read as anon (set role anon): select count(*) from public.accommodations
--   --    where is_demo: expect 5. select count(*) from public.catalogue_entries
--   --    where entity_kind = 'accommodation' and status = 'PUBLISHED': expect 5;
--   --    where entity_kind = 'restaurant': expect 2; every one with
--   --    is_demo = true and verified = false.
--   -- 2. select * from public.stays_search(p_entity_kinds => array['accommodation']::public.catalogue_entity_kind[],
--   --      p_check_in => current_date + 7, p_check_out => current_date + 9, p_guests => 2)
--   --    as anon: expect 5 rows, each with total_minor = 2 nights of the cheapest
--   --    admitting plan, room_type_id and rate_plan_id set. Add
--   --    p_breakfast => true: still 5 (every accommodation has a breakfast
--   --    plan). Add p_free_cancellation => true: still 5. Add
--   --    p_amenities => array['pool']: expect 2 (the resort and Grand Vista).
--   --    p_room_categories => array['suite']::public.room_category[]: expect 3.
--   -- 3. select count(*) from public.listing_photos lp join public.listings l on
--   --    l.id = lp.listing_id where l.is_demo: expect 64 listings covered,
--   --    land excluded (61 listings x their set size); position 0 exists for
--   --    every non-land example listing; and two hotels do not share a cover.
--   -- 4. select public.stays_search(...) for a restaurant kind: cover_path is
--   --    null (restaurants carry no photo table) and price_band is set.
--   -- 5. As a test guest (JWT claims): insert into public.bookings against
--   --    accommodation-backed inventory is not possible until M6 (no
--   --    accommodation_id column), so instead try select private.reserve_room_nights
--   --    as service role for a demo room type: it should reserve (the
--   --    inventory is real); then release. The demo refusal on accommodations
--   --    is proven by M3's own probe and unchanged here.
--   -- 6. Reversal, in the same rolled-back transaction: delete from
--   --    public.businesses where is_demo; select count(*) from
--   --    public.accommodations: 0; from public.service_windows: 0; from
--   --    public.catalogue_entries where entity_kind <> 'listing': 0.
--   rollback;
--
-- Nothing in this file has been run against the live project by its author,
-- who has no database credentials. The lead applies and probes it.

/* -------------------------------------------------- cancellation policies */

insert into public.cancellation_policies (id, name, summary, rules, is_free_until_hours)
values
  ('ef000000-0000-4000-8000-000000000001',
   'Free cancellation until 48 hours before',
   'Cancel free of charge up to 48 hours before check-in. Inside 48 hours the first night is kept and the rest is returned to your wallet.',
   '[{"hours_before": 48, "refund_bps": 10000}, {"hours_before": 0, "refund_bps": 0}]'::jsonb,
   48),
  ('ef000000-0000-4000-8000-000000000002',
   'Non-refundable',
   'The lowest rate, paid in full when you book. Nothing is returned if you cancel.',
   '[{"hours_before": 0, "refund_bps": 0}]'::jsonb,
   null)
on conflict (id) do nothing;

/* ------------------------------------------------------------ businesses */

insert into public.businesses (
  id, owner_id, agent_id, kind, name, slug, description, source, status,
  state_code, city, area, address, latitude, longitude, phone, email, is_demo, published_at
) values
  ('eb000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', null, 'hotel',
   'Grand Vista Hotel', 'grand-vista-hotel',
   'A business hotel a short walk from the Victoria Island offices, with a rooftop bar that looks over the lagoon and power that stays on.',
   'first_party', 'PUBLISHED', 'LA', 'Lagos', 'Victoria Island', null, 6.4281, 3.4219, null, null, true, now()),
  ('eb000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', null, 'serviced_apartments',
   'Eko Pearl Apartments', 'eko-pearl-apartments',
   'Serviced one and two bedroom apartments in a tower on the Ikoyi waterfront, with housekeeping, a gym and treated mains water.',
   'first_party', 'PUBLISHED', 'LA', 'Lagos', 'Ikoyi', null, 6.4498, 3.4392, null, null, true, now()),
  ('eb000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000001', null, 'resort',
   'Lagoon Crest Resort', 'lagoon-crest-resort',
   'A resort on the Lekki lagoon with a pool deck, garden rooms and villas with their own terraces. Breakfast is served by the water.',
   'first_party', 'PUBLISHED', 'LA', 'Lagos', 'Lekki', null, 6.4386, 3.5210, null, null, true, now()),
  ('eb000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000001', null, 'guest_house',
   'Maitama Court Guest House', 'maitama-court-guest-house',
   'A quiet guest house on a tree-lined Maitama street, twelve rooms, breakfast included, parking inside the compound.',
   'first_party', 'PUBLISHED', 'FC', 'Abuja', 'Maitama', null, 9.0868, 7.4972, null, null, true, now()),
  ('eb000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000001', null, 'hotel',
   'Wuse Skyline Suites', 'wuse-skyline-suites',
   'Deluxe rooms and junior suites in central Wuse 2, with a lounge on the top floor and a generator that covers the whole building.',
   'first_party', 'PUBLISHED', 'FC', 'Abuja', 'Wuse 2', null, 9.0770, 7.4716, null, null, true, now()),
  ('eb000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000001', null, 'restaurant',
   'Harbour Lights Kitchen', 'harbour-lights-kitchen',
   'Seafood and grills on the Victoria Island waterfront, lunch and dinner, with a bar that stays open late on Fridays.',
   'first_party', 'PUBLISHED', 'LA', 'Lagos', 'Victoria Island', null, 6.4310, 3.4265, null, null, true, now()),
  ('eb000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000001', null, 'restaurant',
   'Jabi Lakeside Grill', 'jabi-lakeside-grill',
   'Suya, pepper soup and grilled fish by Jabi Lake, outdoor seating under the trees, family tables on Sundays.',
   'first_party', 'PUBLISHED', 'FC', 'Abuja', 'Jabi', null, 9.0642, 7.4192, null, null, true, now())
on conflict (id) do nothing;

/* --------------------------------------------------------- accommodations */

insert into public.accommodations (
  id, business_id, name, slug, description, star_rating, check_in_from, check_out_by, house_rules,
  cancellation_policy_id, status, state_code, city, area, address, latitude, longitude, featured, is_demo, published_at
) values
  ('ea000000-0000-4000-8000-000000000001', 'eb000000-0000-4000-8000-000000000001',
   'Grand Vista Hotel', 'grand-vista-hotel',
   'Ninety rooms over eleven floors, a rooftop bar, a small gym and a restaurant on the ground floor. Every room has a desk, a safe and a window that opens.',
   4, '14:00', '12:00', 'No smoking in the rooms. Visitors sign in at reception.',
   'ef000000-0000-4000-8000-000000000001', 'PUBLISHED', 'LA', 'Lagos', 'Victoria Island', null, 6.4281, 3.4219, true, true, now()),
  ('ea000000-0000-4000-8000-000000000002', 'eb000000-0000-4000-8000-000000000002',
   'Eko Pearl Apartments', 'eko-pearl-apartments',
   'Furnished apartments with a full kitchen, a washing machine and a balcony over the water. Housekeeping three times a week; the gym and the pool are on the fourth floor.',
   null, '15:00', '11:00', 'No parties. Quiet after 22:00.',
   'ef000000-0000-4000-8000-000000000001', 'PUBLISHED', 'LA', 'Lagos', 'Ikoyi', null, 6.4498, 3.4392, true, true, now()),
  ('ea000000-0000-4000-8000-000000000003', 'eb000000-0000-4000-8000-000000000003',
   'Lagoon Crest Resort', 'lagoon-crest-resort',
   'Garden rooms around the pool deck and six villas on the water with their own terraces. Breakfast by the lagoon, kayaks at the jetty, a spa in the main house.',
   5, '14:00', '12:00', 'Children welcome. The pool closes at 21:00.',
   'ef000000-0000-4000-8000-000000000001', 'PUBLISHED', 'LA', 'Lagos', 'Lekki', null, 6.4386, 3.5210, true, true, now()),
  ('ea000000-0000-4000-8000-000000000004', 'eb000000-0000-4000-8000-000000000004',
   'Maitama Court Guest House', 'maitama-court-guest-house',
   'Twelve rooms in a converted family house with a garden, breakfast in the dining room and parking behind the gate.',
   3, '13:00', '11:00', 'Breakfast is served from 07:00 to 10:00.',
   'ef000000-0000-4000-8000-000000000002', 'PUBLISHED', 'FC', 'Abuja', 'Maitama', null, 9.0868, 7.4972, false, true, now()),
  ('ea000000-0000-4000-8000-000000000005', 'eb000000-0000-4000-8000-000000000005',
   'Wuse Skyline Suites', 'wuse-skyline-suites',
   'Forty rooms on eight floors in central Wuse 2 with a top-floor lounge, a business centre and a generator that covers the building.',
   4, '14:00', '12:00', 'Visitors sign in at reception.',
   'ef000000-0000-4000-8000-000000000001', 'PUBLISHED', 'FC', 'Abuja', 'Wuse 2', null, 9.0770, 7.4716, false, true, now())
on conflict (id) do nothing;

/* ------------------------------------------------------------- photographs */

insert into public.accommodation_photos (accommodation_id, storage_path, position)
select a.id, '/brand/photos/' || p.name || '.jpg', p.position
from (values
  ('ea000000-0000-4000-8000-000000000001'::uuid, 'bedroom-02', 0),
  ('ea000000-0000-4000-8000-000000000001', 'bathroom-01', 1),
  ('ea000000-0000-4000-8000-000000000001', 'restaurant-03-bar', 2),
  ('ea000000-0000-4000-8000-000000000001', 'tower-entrance-dusk', 3),
  ('ea000000-0000-4000-8000-000000000002', 'tower-entrance-dusk', 0),
  ('ea000000-0000-4000-8000-000000000002', 'living-room-day', 1),
  ('ea000000-0000-4000-8000-000000000002', 'bedroom-01', 2),
  ('ea000000-0000-4000-8000-000000000002', 'bathroom-01', 3),
  ('ea000000-0000-4000-8000-000000000003', 'resort-pool-deck', 0),
  ('ea000000-0000-4000-8000-000000000003', 'villa-pool-terrace', 1),
  ('ea000000-0000-4000-8000-000000000003', 'bedroom-02', 2),
  ('ea000000-0000-4000-8000-000000000003', 'terrace-lounge-night', 3),
  ('ea000000-0000-4000-8000-000000000004', 'bedroom-01', 0),
  ('ea000000-0000-4000-8000-000000000004', 'living-room-dusk', 1),
  ('ea000000-0000-4000-8000-000000000004', 'bathroom-01', 2),
  ('ea000000-0000-4000-8000-000000000005', 'bedroom-02', 0),
  ('ea000000-0000-4000-8000-000000000005', 'living-room-day', 1),
  ('ea000000-0000-4000-8000-000000000005', 'restaurant-02-lounge', 2),
  ('ea000000-0000-4000-8000-000000000005', 'tower-entrance-dusk', 3)
) as p(accommodation_id, name, position)
join public.accommodations a on a.id = p.accommodation_id
on conflict (accommodation_id, position) do nothing;

/* --------------------------------------------------------------- amenities */

insert into public.accommodation_amenities (accommodation_id, amenity_id)
select l.accommodation_id, am.id
from (values
  ('ea000000-0000-4000-8000-000000000001'::uuid, array['wifi','ac','parking','gym','generator','security','elevator','tv']),
  ('ea000000-0000-4000-8000-000000000002', array['wifi','ac','parking','gym','pool','generator','security','elevator','kitchen','laundry','balcony']),
  ('ea000000-0000-4000-8000-000000000003', array['wifi','ac','parking','pool','generator','security','garden','balcony']),
  ('ea000000-0000-4000-8000-000000000004', array['wifi','ac','parking','generator','security','garden','tv']),
  ('ea000000-0000-4000-8000-000000000005', array['wifi','ac','parking','generator','security','elevator','tv'])
) as l(accommodation_id, codes)
join public.amenities am on am.code = any (l.codes)
on conflict do nothing;

/* -------------------------------------------------------------- room types */

insert into public.room_types (
  id, accommodation_id, name, category, description, sleeps, beds, size_sqm, units_total, base_rate_minor, status, is_demo
) values
  ('ec000000-0000-4000-8000-000000000001', 'ea000000-0000-4000-8000-000000000001', 'Classic Double', 'double',
   'A queen bed, a desk and a city view.', 2, '[{"kind":"queen","count":1}]'::jsonb, 26, 40, 8500000, 'PUBLISHED', true),
  ('ec000000-0000-4000-8000-000000000002', 'ea000000-0000-4000-8000-000000000001', 'Twin Room', 'twin',
   'Two single beds, for colleagues travelling together.', 2, '[{"kind":"single","count":2}]'::jsonb, 26, 30, 9500000, 'PUBLISHED', true),
  ('ec000000-0000-4000-8000-000000000003', 'ea000000-0000-4000-8000-000000000001', 'Executive Suite', 'suite',
   'A separate sitting room, a king bed and the lagoon from both.', 3, '[{"kind":"king","count":1}]'::jsonb, 52, 12, 18000000, 'PUBLISHED', true),
  ('ec000000-0000-4000-8000-000000000004', 'ea000000-0000-4000-8000-000000000002', 'One Bedroom Apartment', 'suite',
   'A bedroom, a living room with a kitchen and a balcony over the water.', 2, '[{"kind":"queen","count":1}]'::jsonb, 68, 18, 12000000, 'PUBLISHED', true),
  ('ec000000-0000-4000-8000-000000000005', 'ea000000-0000-4000-8000-000000000002', 'Two Bedroom Apartment', 'family',
   'Two bedrooms, two bathrooms, a full kitchen and a dining table for six.', 4, '[{"kind":"queen","count":2}]'::jsonb, 110, 10, 21000000, 'PUBLISHED', true),
  ('ec000000-0000-4000-8000-000000000006', 'ea000000-0000-4000-8000-000000000003', 'Garden Room', 'double',
   'A king bed and a private patio onto the gardens, a minute from the pool.', 2, '[{"kind":"king","count":1}]'::jsonb, 34, 24, 15000000, 'PUBLISHED', true),
  ('ec000000-0000-4000-8000-000000000007', 'ea000000-0000-4000-8000-000000000003', 'Lagoon Villa', 'family',
   'Two bedrooms, a living room and a terrace on the water with its own plunge pool.', 4, '[{"kind":"king","count":1},{"kind":"queen","count":1}]'::jsonb, 120, 6, 32000000, 'PUBLISHED', true),
  ('ec000000-0000-4000-8000-000000000008', 'ea000000-0000-4000-8000-000000000004', 'Standard Single', 'single',
   'A single bed, a desk and a window onto the garden.', 1, '[{"kind":"single","count":1}]'::jsonb, 16, 6, 3500000, 'PUBLISHED', true),
  ('ec000000-0000-4000-8000-000000000009', 'ea000000-0000-4000-8000-000000000004', 'Standard Double', 'double',
   'A double bed and a small sitting corner.', 2, '[{"kind":"double","count":1}]'::jsonb, 22, 6, 4800000, 'PUBLISHED', true),
  ('ec000000-0000-4000-8000-00000000000a', 'ea000000-0000-4000-8000-000000000005', 'Deluxe Double', 'double',
   'A queen bed, a work desk and blackout curtains.', 2, '[{"kind":"queen","count":1}]'::jsonb, 28, 28, 7000000, 'PUBLISHED', true),
  ('ec000000-0000-4000-8000-00000000000b', 'ea000000-0000-4000-8000-000000000005', 'Junior Suite', 'suite',
   'A king bed with a sitting area and the city from the top floors.', 3, '[{"kind":"king","count":1}]'::jsonb, 44, 12, 12500000, 'PUBLISHED', true)
on conflict (id) do nothing;

/* -------------------------------------------------------------- rate plans */

-- Two plans per room type: a flexible rate with breakfast at ten percent over
-- the base, and the room-only non-refundable rate at the base. Integer kobo
-- throughout (base * 110 / 100 is bigint division).
insert into public.rate_plans (id, room_type_id, name, meal_plan, cancellation_policy_id, rate_minor, min_stay_nights, max_stay_nights, active)
select
  ('ee000000-0000-4000-8000-' || lpad(to_hex((row_number() over (order by rt.id)) * 2 - 1), 12, '0'))::uuid,
  rt.id, 'Flexible with breakfast', 'breakfast', 'ef000000-0000-4000-8000-000000000001',
  rt.base_rate_minor * 110 / 100, 1, 30, true
from public.room_types rt
where rt.accommodation_id in (select id from public.accommodations where is_demo)
on conflict (room_type_id, name) do nothing;

insert into public.rate_plans (id, room_type_id, name, meal_plan, cancellation_policy_id, rate_minor, min_stay_nights, max_stay_nights, active)
select
  ('ee000000-0000-4000-8000-' || lpad(to_hex((row_number() over (order by rt.id)) * 2), 12, '0'))::uuid,
  rt.id, 'Room only, non-refundable', 'room_only', 'ef000000-0000-4000-8000-000000000002',
  rt.base_rate_minor, 1, 30, true
from public.room_types rt
where rt.accommodation_id in (select id from public.accommodations where is_demo)
on conflict (room_type_id, name) do nothing;

/* --------------------------------------------- rate calendar, ninety nights */

insert into public.rate_calendar (rate_plan_id, date, rate_minor, closed)
select rp.id, d::date,
       case when extract(dow from d) in (5, 6) then rp.rate_minor * 115 / 100 else null end,
       false
from public.rate_plans rp
join public.room_types rt on rt.id = rp.room_type_id
join public.accommodations a on a.id = rt.accommodation_id and a.is_demo
cross join generate_series(current_date, current_date + 89, interval '1 day') d
on conflict (rate_plan_id, date) do nothing;

/* ---------------------------------------------- room inventory, ninety nights */

insert into public.room_inventory (room_type_id, date, units_open, units_booked)
select rt.id, d::date, rt.units_total, 0
from public.room_types rt
join public.accommodations a on a.id = rt.accommodation_id and a.is_demo
cross join generate_series(current_date, current_date + 89, interval '1 day') d
on conflict (room_type_id, date) do nothing;

/* ------------------------------------------------------------- restaurants */

insert into public.restaurant_profiles (business_id, cuisines, price_band, menu_url, dress_code, parking, power_backup, outdoor)
values
  ('eb000000-0000-4000-8000-000000000006', array['seafood','grill','nigerian'], 3, null, 'Smart casual', true, true, true),
  ('eb000000-0000-4000-8000-000000000007', array['nigerian','grill','suya'], 2, null, null, true, true, true)
on conflict (business_id) do nothing;

-- Harbour Lights: lunch and dinner Monday to Saturday, a late bar on Friday
-- and Saturday, one long Sunday service. Jabi Lakeside: dinner daily, lunch
-- at the weekend. weekday 0 is Sunday.
insert into public.service_windows (business_id, weekday, opens, last_seating, closes, covers)
select 'eb000000-0000-4000-8000-000000000006'::uuid, w::smallint, '12:00'::time, '14:30'::time, '16:00'::time, 60
from generate_series(1, 6) w
union all
select 'eb000000-0000-4000-8000-000000000006'::uuid, w::smallint, '18:00'::time, '21:30'::time,
       case when w in (5, 6) then '23:59'::time else '23:00'::time end, 80
from generate_series(1, 6) w
union all
select 'eb000000-0000-4000-8000-000000000006'::uuid, 0::smallint, '13:00'::time, '20:00'::time, '21:30'::time, 70
union all
select 'eb000000-0000-4000-8000-000000000007'::uuid, w::smallint, '17:00'::time, '21:30'::time, '23:00'::time, 90
from generate_series(0, 6) w
union all
select 'eb000000-0000-4000-8000-000000000007'::uuid, w::smallint, '12:00'::time, '15:30'::time, '16:30'::time, 60
from generate_series(0, 6) w
where w in (0, 6)
on conflict (business_id, weekday, opens) do nothing;

/* ------------------------------ photographs on the sixty-four example listings */

-- One set per property type, rotated by the listing's rank inside its type so
-- a shelf of apartments does not repeat one cover. Land carries none: there
-- is nothing built to photograph. Only listings with no photographs at all
-- are touched, so a listing that later gains real photography is left alone.
with sets as (
  select * from (values
    ('home',       array['villa-exterior-gate', 'villa-pool-skyline-01', 'living-room-dusk', 'bedroom-02']),
    ('villa',      array['villa-exterior-gate', 'villa-pool-skyline-01', 'living-room-dusk', 'bedroom-02']),
    ('rental',     array['villa-exterior-gate', 'villa-pool-skyline-01', 'living-room-dusk', 'bedroom-02']),
    ('apartment',  array['tower-entrance-dusk', 'living-room-day', 'bedroom-01', 'bathroom-01']),
    ('shortlet',   array['villa-pool-portrait', 'bedroom-01', 'bathroom-01', 'terrace-lounge-night']),
    ('hotel',      array['bedroom-02', 'resort-pool-deck', 'restaurant-03-bar']),
    ('restaurant', array['restaurant-01', 'restaurant-02-lounge', 'restaurant-03-bar']),
    ('office',     array['tower-entrance-dusk', 'living-room-day']),
    ('shop',       array['tower-entrance-dusk', 'living-room-day'])
  ) as t(kind, names)
),
ranked as (
  select l.id, l.property_type::text as kind,
         (row_number() over (partition by l.property_type order by l.id)) - 1 as n
  from public.listings l
  where l.is_demo
    and not exists (select 1 from public.listing_photos lp where lp.listing_id = l.id)
)
insert into public.listing_photos (listing_id, storage_path, position)
select r.id,
       '/brand/photos/' || s.names[((r.n + i - 1) % cardinality(s.names)) + 1] || '.jpg',
       i - 1
from ranked r
join sets s on s.kind = r.kind
cross join lateral generate_series(1, cardinality(s.names)) as i
on conflict (listing_id, position) do nothing;
