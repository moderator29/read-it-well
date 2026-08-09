-- The physical facts, a video table, and a record of who checked.
--
-- Facts that apply whether a place is let or sold, and that the schema simply
-- did not carry.
--
-- THE WORST OF THE GAPS: `land` has been a valid property_type since
-- 20260804142055_property_type_commercial_and_land, and there is no size
-- column anywhere on this table. A land listing could therefore state
-- bedrooms, bathrooms, max_guests and a nightly rate, and could not state how
-- big the plot was. That is not an incomplete land listing, it is a land
-- listing with no content: size is the entire specification of a plot. Every
-- land row published before this file is unshoppable by construction.
--
-- TOILETS, COUNTED SEPARATELY FROM BATHROOMS. Not a quirk to be normalised
-- away. Nigerian listings quote "3 bedrooms, 3 bathrooms, 4 toilets" because
-- the guest WC is a real and separately valued room, and a four toilet flat is
-- advertised as a four toilet flat. Folding the two together loses the number
-- people actually search on and makes our listings read as though written by
-- somebody who has not seen one.
--
-- THE VERIFICATION BLOCK. Three timestamps and a person. The verified badge
-- has meant "the AGENT passed checks" and has said nothing about the PROPERTY.
-- Those are different promises and conflating them is how a verified agent's
-- fictional listing gets a blue tick. address_verified_at says somebody
-- confirmed the address exists and is what it says; physically_inspected_at
-- says somebody from RentMe stood in it. The second is the strongest claim
-- this platform can make about anything and it needs its own column, its own
-- date and a name attached.
--
-- SAFETY. public.listings holds 0 rows. Everything added is nullable or
-- defaulted. listing_videos is new and empty.

begin;

/* ------------------------------------------------------------------ shape */

alter table public.listings
  add column if not exists size_sqm numeric(10, 2),
  add column if not exists toilets smallint,
  add column if not exists parking_spaces smallint,
  add column if not exists floor smallint,
  add column if not exists total_floors smallint,
  add column if not exists condition public.build_condition;

comment on column public.listings.size_sqm is
  'Covered floor area for a building, plot area for land, in square metres to two decimal places. Numeric rather than integer because plots are quoted in fractions of a hectare and rounding 1,239.5 sqm to 1,240 is a change to the thing being sold. THE ONLY SIZE COLUMN ON THIS TABLE: before it, a land listing could state bedrooms and a nightly rate and could not state how big the land was.';
comment on column public.listings.toilets is
  'Toilets, counted separately from bathrooms because Nigerian listings count them separately. A guest WC with no shower is a toilet and not a bathroom, and "3 bedrooms 4 toilets" is how the market describes and searches for property.';
comment on column public.listings.parking_spaces is
  'Off street spaces that come with the property. Zero is a real and important answer on the mainland, and is not the same as null.';
comment on column public.listings.floor is
  'Which floor the unit is on. 0 is the ground floor. Load bearing here rather than cosmetic: a fourth floor flat with no lift is a different proposition, and so is a ground floor flat where the area floods.';
comment on column public.listings.total_floors is
  'Storeys in the building the unit sits in. Read together with floor to answer "how many flights".';
comment on column public.listings.condition is
  'Newly built, renovated, old, or off plan. Off plan means the building does not exist yet.';

alter table public.listings
  add constraint listings_size_sqm_positive
    check (size_sqm is null or size_sqm > 0),
  add constraint listings_toilets_nonneg
    check (toilets is null or toilets >= 0),
  add constraint listings_parking_nonneg
    check (parking_spaces is null or parking_spaces >= 0),
  add constraint listings_floor_plausible
    -- Below ground exists (a basement shop), so the floor is allowed to be
    -- negative. The bounds are sanity limits, not architecture.
    check (floor is null or (floor >= -5 and floor <= 200)),
  add constraint listings_total_floors_plausible
    check (total_floors is null or (total_floors >= 1 and total_floors <= 200)),
  -- A unit cannot be on the ninth floor of a four storey building.
  add constraint listings_floor_within_building
    check (floor is null or total_floors is null or floor <= total_floors);

-- Size is the primary filter on land and a strong secondary one everywhere
-- else, so it is indexed where it can be used.
create index if not exists listings_size_sqm_idx
  on public.listings (size_sqm)
  where status = 'PUBLISHED' and size_sqm is not null;

/* ---------------------------------------------------------- who checked it

   Three columns, and the important thing about them is that they are TIMES
   rather than booleans. "Inspected" with no date is a claim with no shelf
   life; a property inspected in March 2024 and let in 2027 was inspected, and
   a reader is entitled to work out that this means very little now.
   -------------------------------------------------------------------------- */
alter table public.listings
  add column if not exists address_verified_at timestamptz,
  add column if not exists physically_inspected_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id) on delete set null;

comment on column public.listings.address_verified_at is
  'When somebody at RentMe confirmed the address exists and matches the listing. A desk check: documents, a pin, a utility bill. Null means nobody has.';
comment on column public.listings.physically_inspected_at is
  'When somebody from RentMe physically stood in this property. The strongest claim this platform can make about a listing, and the reason it is a timestamp and not a flag: an inspection from two years ago is not the same statement as one from last week, and a reader must be able to see which they are being offered.';
comment on column public.listings.verified_by is
  'The staff account that carried out the most recent of the two checks above. Nulled rather than cascaded when that person''s account is closed, so the timestamps survive the staff member leaving; a check that happened still happened.';

-- Nulled, not cascaded, so a check outlives the checker's account. This index
-- covers that foreign key, which the project has been strict about since
-- 20260807101114_the_last_foreign_key_without_a_covering_index.
create index if not exists listings_verified_by_idx
  on public.listings (verified_by)
  where verified_by is not null;

-- The set a "physically inspected only" filter reads. Tiny by construction,
-- which is exactly why it deserves an index: it is the rarest and most
-- valuable slice of the catalogue.
create index if not exists listings_inspected_idx
  on public.listings (physically_inspected_at desc)
  where status = 'PUBLISHED' and physically_inspected_at is not null;

/* ------------------------------------------------------------------ videos

   A walkthrough is the single most effective thing against a fake listing.
   Photographs are trivially stolen from another listing or another country; a
   continuous walk through a flat, past a window, out to the gate, is
   substantially harder to fake and is what a serious renter asks for before
   spending a Saturday travelling to an inspection.

   Modelled on listing_photos deliberately: same shape, same ownership rule,
   same position ordering, same storage_path indirection so the bucket can move
   without a data migration. A reader who understands one understands the
   other.
   -------------------------------------------------------------------------- */
create table if not exists public.listing_videos (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  -- Path inside the storage bucket, never a URL. A signed or public URL is
  -- minted at read time, so the bucket can change without rewriting rows.
  storage_path text not null,
  -- The still shown before play. Its own path rather than a frame grab,
  -- because a chosen frame is always better than the first one.
  poster_path  text,
  -- Seconds. Null while the media pipeline has not measured it yet. A duration
  -- is what lets a card say "1:40" instead of making somebody tap to find out.
  duration_seconds smallint,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  constraint listing_videos_storage_path_len check (char_length(storage_path) between 1 and 500),
  constraint listing_videos_poster_path_len check (poster_path is null or char_length(poster_path) between 1 and 500),
  constraint listing_videos_duration_sane check (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 1800)),
  constraint listing_videos_position_nonneg check (position >= 0)
);

comment on table public.listing_videos is
  'Walkthrough videos for a listing. Ordered by position, best first, exactly like listing_photos. A continuous walkthrough is the strongest evidence a listing is real that a lister can supply without an inspection, because it is far harder to steal from somebody else''s property than a photograph is.';

-- Covers the foreign key and serves the only read there is: every video for
-- one listing, in order.
create index if not exists listing_videos_listing_position_idx
  on public.listing_videos (listing_id, position, created_at);

alter table public.listing_videos enable row level security;

/*
 * The same two policies listing_photos carries, and they must stay the same.
 *
 * Read: anybody may see the videos of a PUBLISHED listing, and the owner and
 * admins may see them at any status, which is what makes a draft previewable.
 * Write: the owner, and nobody else. `private.owns_listing` is the existing
 * helper, already executable by anon so that an anonymous read cannot fail
 * with 42501 while evaluating the OR chain. That is not a detail: see
 * 20260730021956_anon_execute_on_rls_helpers for the outage it prevents.
 */
drop policy if exists "listing_videos_select" on public.listing_videos;
create policy "listing_videos_select" on public.listing_videos
  for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_videos.listing_id and l.status = 'PUBLISHED'
    )
    or private.owns_listing(listing_id)
    or private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

drop policy if exists "listing_videos_write" on public.listing_videos;
create policy "listing_videos_write" on public.listing_videos
  for all
  using (private.owns_listing(listing_id))
  with check (private.owns_listing(listing_id));

/*
 * The grant, stated rather than inherited.
 *
 * The Supabase default privileges in this project grant ALL on any new public
 * table to anon and authenticated, which is how listing_photos ended up
 * holding DELETE, TRUNCATE, REFERENCES and TRIGGER for anon. RLS is the gate
 * and that table is safe, but nobody chose those privileges and nobody will
 * re-read them.
 *
 * This table names its surface instead: read for everybody, write for a
 * signed-in user, and RLS deciding which rows in both directions. That is a
 * deliberate divergence from listing_photos and it changes no behaviour that
 * PostgREST can reach, since nothing here truncates a table or creates a
 * trigger over HTTP.
 */
revoke all on table public.listing_videos from anon, authenticated;
grant select on table public.listing_videos to anon, authenticated;
grant insert, update, delete on table public.listing_videos to authenticated;

commit;
