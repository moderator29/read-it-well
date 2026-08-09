-- PostGIS, a real geography column, a GiST index, and a bounding box RPC.
--
-- WHAT IS TRUE TODAY, BEFORE THIS FILE.
--
-- `listings.latitude` and `listings.longitude` are two nullable doubles with
-- no index of any kind between them. There is no spatial type, no spatial
-- index, and no query in the database that can answer "what is inside this
-- rectangle". The application compensates in the only way it can:
-- SupabaseListingRepository pulls a maximum of 200 rows and filters them IN
-- MEMORY in Node.
--
-- That is not a slow map, it is not a map. Two hundred rows is not a page size
-- chosen for a viewport, it is a ceiling chosen because there was nothing
-- better available, and the 201st listing in Lagos simply does not exist as
-- far as the map is concerned. Pan the map and the server re-reads the same
-- arbitrary two hundred. Zoom out and it still reads two hundred. The failure
-- is invisible in development, where the whole catalogue fits, and total in
-- production, where it does not.
--
-- PostGIS 3.3.7 is AVAILABLE in this project and NOT INSTALLED, which is the
-- only reason this was ever a hard problem. Installing it is one statement.
--
-- THE SHAPE OF THE FIX.
--
--   1. `location geography(Point, 4326)`, maintained by a trigger from the
--      existing latitude and longitude doubles. The doubles stay: they are
--      what the listing wizard writes, what the API returns and what every
--      current reader expects, and breaking all of that to change a storage
--      format would be a rewrite disguised as an index.
--   2. A GiST index on it. This is the whole point; without it PostGIS gives
--      correctness and the same sequential scan.
--   3. `public.listings_in_bounds(...)`, which takes a bounding box plus the
--      filters the map actually carries and does the work in Postgres.
--
-- WHY `geography` AND NOT `geometry`. Geography measures on a spheroid, so
-- ST_DWithin gives metres without anybody choosing a projection. Nigeria
-- spans UTM zones 31N through 33N, so a single projected SRID would be wrong
-- somewhere in the country, and "distance in metres" is a question this
-- product will ask constantly: how far to the estate gate, to the bus stop, to
-- the office. Geography costs a little more per operation and removes a class
-- of error that is invisible until somebody in Maiduguri gets the wrong
-- answer.
--
-- WHY A TRIGGER AND NOT A GENERATED COLUMN. A stored generated column would be
-- tidier, and Postgres requires generation expressions to be IMMUTABLE.
-- ST_SetSRID(ST_MakePoint(...)) is not marked immutable in every PostGIS
-- build, and depending on that classification would make this migration
-- succeed or fail depending on the point release. A trigger is explicit, works
-- everywhere, and can be read.
--
-- SAFETY. public.listings holds 0 rows, so the backfill touches nothing and
-- the index builds instantly. The trigger fires only when latitude or
-- longitude actually change, so it costs nothing on the writes that do not
-- move a pin.

begin;

/* ------------------------------------------------------------ 1. postgis

   Into the `extensions` schema, which is where this project's Supabase
   instance puts extensions and is already outside the default search_path.
   Putting PostGIS in `public` litters that schema with several hundred
   functions and a spatial_ref_sys table, all of which then appear on the REST
   surface.
   -------------------------------------------------------------------------- */
create extension if not exists postgis with schema extensions;

/* ------------------------------------------------------- 2. the column */

alter table public.listings
  add column if not exists location extensions.geography(Point, 4326);

comment on column public.listings.location is
  'Where the property is, as a PostGIS point on the WGS84 spheroid. DERIVED, never written directly: the trigger listings_location_sync maintains it from latitude and longitude, which remain the columns the listing wizard writes and every API reader expects. Geography rather than geometry so distances come back in metres without picking a projection, which matters in a country spanning three UTM zones. Null wherever the pin is null, which is a real state: the wizard does not force one.';

/* ------------------------------------------------------- 3. the trigger */

create or replace function private.sync_listing_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Both or neither. A latitude with no longitude is not half a location, it
  -- is a broken row, and storing a point on the prime meridian for it would
  -- put a flat in Lekki somewhere in the Atlantic off Ghana.
  if new.latitude is null or new.longitude is null then
    new.location := null;
  else
    new.location := extensions.st_setsrid(
      extensions.st_makepoint(new.longitude, new.latitude),
      4326
    )::extensions.geography;
  end if;
  return new;
end;
$$;

comment on function private.sync_listing_location() is
  'Keeps listings.location in step with latitude and longitude. Note the argument order: ST_MakePoint takes X then Y, which is LONGITUDE then LATITUDE, the opposite of how every human being says a coordinate. Swapping them is the classic error and it is silent, because most of Nigeria''s latitudes are also plausible longitudes: 6.5 N, 3.4 E reversed puts Lagos in Somalia rather than in the sea, so it does not look wrong on a map, it looks like a different listing.';

drop trigger if exists listings_location_sync on public.listings;
create trigger listings_location_sync
  before insert or update of latitude, longitude on public.listings
  for each row
  execute function private.sync_listing_location();

-- Backfill. No rows today; correct against a later restore.
update public.listings
set location = case
  when latitude is null or longitude is null then null
  else extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
end
where location is null and latitude is not null and longitude is not null;

/* --------------------------------------------------------- 4. the index

   GiST, partial on rows that have a pin AND are published.

   Partial is not a micro-optimisation here. Drafts, rejections and suspended
   rows are never on a map, and an index that carries them is larger and
   colder for every query that does not want them. Excluding the null
   locations excludes every listing whose lister skipped the pin, which is a
   real fraction of them and none of which a bounding box can ever match.
   -------------------------------------------------------------------------- */
create index if not exists listings_location_gist
  on public.listings using gist (location extensions.gist_geography_ops)
  where status = 'PUBLISHED' and location is not null;

/*
 * The operator class is named explicitly, and that is not decoration.
 *
 * CREATE INDEX resolves an unqualified default opclass through the session's
 * search_path, and PostGIS lives in `extensions` here rather than in `public`.
 * A migration session whose search_path does not include `extensions` would
 * fail with "data type geography has no default operator class for access
 * method gist", which reads like PostGIS is broken rather than like a
 * search_path problem, and is the kind of error that gets worked around by
 * moving the extension into public.
 */

/* ------------------------------------------------- 5. the bounding box RPC

   What the map asks for, answered in the database.

   ST_MakeEnvelope builds the viewport rectangle from its south-west and
   north-east corners, and `&&` is the bounding box overlap operator, which is
   the operator the GiST index actually accelerates. Using ST_Intersects or
   ST_Within here would be more precise and, for a rectangle against a point,
   precisely as correct while being slower: a point either is inside the
   rectangle or is not, so the index's own bounding box test is the whole
   answer.

   The cast dance is unavoidable and worth reading once. The column is
   geography; ST_MakeEnvelope returns geometry. Comparing them directly would
   make Postgres pick a cast on its own, so the column is cast down to geometry
   for the overlap test. That is correct for a rectangle in degrees, which is
   what a web map viewport is, and it is what keeps the GiST index usable.

   `operator(extensions.&&)` rather than a bare `&&`, for the same reason the
   index names its opclass. This function pins `search_path = ''`, which is
   correct for anything reachable over the REST API, and an unqualified
   operator is resolved through search_path exactly like an unqualified
   function is. A bare `&&` here would raise "operator does not exist" the
   moment the pin was added, and the tempting fix is to unpin the search_path,
   which is the wrong direction on a function anon can call.

   Every filter is optional and each one is written as `p_x is null or ...`, so
   a call that passes nothing gets everything in the box. That is deliberate:
   the alternative is a function per combination of filters, or dynamic SQL,
   and dynamic SQL in a SECURITY DEFINER function is how injection gets into a
   database.

   NOT SECURITY DEFINER. This runs as the caller, so RLS on public.listings
   applies exactly as it does to a direct select and an anonymous visitor sees
   published rows and nothing else. A definer function here would have to
   re-implement the publication rule, and the second implementation is the one
   that goes wrong.
   -------------------------------------------------------------------------- */
create or replace function public.listings_in_bounds(
  p_west  double precision,
  p_south double precision,
  p_east  double precision,
  p_north double precision,
  p_intent public.listing_intent default null,
  p_property_type public.property_type default null,
  p_min_price_minor bigint default null,
  p_max_price_minor bigint default null,
  p_bedrooms integer default null,
  p_limit integer default 500
)
returns table (
  id uuid,
  title text,
  property_type public.property_type,
  listing_intent public.listing_intent,
  city text,
  area text,
  state_code text,
  latitude double precision,
  longitude double precision,
  bedrooms integer,
  bathrooms integer,
  -- One money column, chosen by intent, so the caller does not have to know
  -- which of three price columns is the one on this row.
  price_minor bigint
)
language sql
stable
set search_path = ''
as $$
  select
    l.id,
    l.title,
    l.property_type,
    l.listing_intent,
    l.city,
    l.area,
    l.state_code,
    l.latitude,
    l.longitude,
    l.bedrooms,
    l.bathrooms,
    case
      when l.listing_intent = 'sale' then l.sale_price_minor
      -- The move-in total is the honest number for a tenancy and the one a
      -- map should colour by. Falling back to the rent, then to the nightly
      -- rate, means a shortlet still carries a price.
      else coalesce(l.total_move_in_cost_minor, l.rent_amount_minor, nullif(l.rate_minor, 0))
    end as price_minor
  from public.listings l
  where l.status = 'PUBLISHED'
    and l.location is not null
    and l.location::extensions.geometry
        operator(extensions.&&) extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
    and (p_intent is null or l.listing_intent = p_intent)
    and (p_property_type is null or l.property_type = p_property_type)
    and (p_bedrooms is null or l.bedrooms >= p_bedrooms)
    and (
      p_min_price_minor is null
      or coalesce(
           case when l.listing_intent = 'sale' then l.sale_price_minor
                else coalesce(l.total_move_in_cost_minor, l.rent_amount_minor, nullif(l.rate_minor, 0)) end,
           -1
         ) >= p_min_price_minor
    )
    and (
      p_max_price_minor is null
      or coalesce(
           case when l.listing_intent = 'sale' then l.sale_price_minor
                else coalesce(l.total_move_in_cost_minor, l.rent_amount_minor, nullif(l.rate_minor, 0)) end,
           -1
         ) between 0 and p_max_price_minor
    )
  order by l.featured desc, l.published_at desc nulls last, l.id
  -- Bounded, because a viewport over the whole country would otherwise ask for
  -- the entire catalogue. 500 is a cap on the WORST case rather than the
  -- arbitrary ceiling the in-memory filter had: the box has already done the
  -- selecting, so a normal viewport returns far fewer and returns the right
  -- ones.
  limit least(greatest(coalesce(p_limit, 500), 1), 1000);
$$;

comment on function public.listings_in_bounds is
  'Published listings whose pin falls inside a viewport rectangle, with the filters a map carries, evaluated in Postgres against a GiST index. This replaces reading a maximum of 200 rows and filtering them in Node, which was not a slow map but an incomplete one: the 201st listing in Lagos did not exist. Deliberately NOT security definer, so RLS decides which rows are visible exactly as it does for a direct select, rather than this function re-implementing the publication rule and eventually disagreeing with it. An unstated price sorts as -1 so it can never satisfy a budget floor and never passes a ceiling, which is the same ruling the shared filter makes: zero means we were not told, not free.';

-- Anon may read the map. Same audience the catalogue already has.
grant execute on function public.listings_in_bounds(
  double precision, double precision, double precision, double precision,
  public.listing_intent, public.property_type, bigint, bigint, integer, integer
) to anon, authenticated, service_role;

commit;
