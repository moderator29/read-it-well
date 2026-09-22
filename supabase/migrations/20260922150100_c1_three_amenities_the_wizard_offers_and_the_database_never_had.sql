-- THREE AMENITIES THE WIZARD OFFERS AND THE DATABASE NEVER HAD.
--
-- `AMENITY_CHOICES` in `lib/agent/listings-schema.ts` lists eighteen chips.
-- `public.amenities` was seeded with fifteen in `20260728152229_listings_core`
-- and no later migration added the other three: `shower`, `breakfast` and
-- `workspace`.
--
-- AND NOTHING SAID SO. `setAmenities` resolves codes to ids with a lookup and
-- silently keeps only what it finds
-- (`lib/agent/listings-actions.ts:789-792`), so a lister who ticked Hot
-- Shower saved a listing with no hot shower on it and was told nothing. Worse,
-- the two paths through the wizard disagreed: the configured path renders
-- amenities read FROM the database, so those three never appeared at all,
-- while the unconfigured path hands the wizard `AMENITY_CHOICES` directly and
-- shows all eighteen. A chip that exists on one path, vanishes on the other
-- and fails silently on both is the worst of the three possible states.
--
-- THE FIX IS THE DATABASE'S AND NOT THE INTERFACE'S. The alternative was to
-- delete the three chips, and that is the wrong way round: a hot shower, a
-- breakfast and somewhere to work are real facts about a place, two of them
-- specific to shortlets, which this platform sells. The labels below are the
-- database's existing style (`Running Water`, `Backup Power`) rather than the
-- interface's ("Free WiFi"), because the catalogue reads its labels from here.
--
-- `on conflict do nothing` so this is safe to re-run and safe on an estate
-- where somebody has already added one by hand.

insert into public.amenities (code, label, category) values
  ('shower',    'Hot Shower', 'comfort'),
  ('breakfast', 'Breakfast',  'facilities'),
  ('workspace', 'Workspace',  'facilities')
on conflict (code) do nothing;
