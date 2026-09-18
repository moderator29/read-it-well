-- M9 of the two-side platform: unaccent, the one search projection, the
-- triggers that keep it true, the rebuild, the backfill, and the twelve-filter
-- stays search that reads it.
--
-- THE PROJECTION. public.catalogue_entries is a thin read-model row per
-- discoverable thing: a listing, an accommodation, or a restaurant business.
-- It exists so that discovery is ONE query over ONE indexed relation (one GIN
-- for text, one GiST for place, one partial index for the shelf) without
-- forcing rooms into listings. Nothing owns data here: it is maintained by
-- AFTER triggers on its sources and can be dropped and refilled by
-- private.rebuild_catalogue_entries() at any time. A wrong backfill is a
-- rebuild, not a repair.
--
-- THE FOUR SHELF FLAGS (HOST_ONBOARDING_RESEARCH section 5): rating_avg and
-- rating_count from reviews; has_breakfast from any active rate plan whose
-- meal plan is not room_only; has_free_cancellation from any active rate plan
-- whose policy carries is_free_until_hours; room_categories from the published
-- room types. Each is denormalised here because a filter over the merged
-- shelf cannot afford a join per row, and each is recomputed by the trigger on
-- the table it comes from.
--
-- TEXT SEARCH. `search` is a generated tsvector over title, area and city in
-- the 'simple' configuration with unaccent: Yoruba, Hausa and Igbo have no
-- Postgres stemmer and English stemming over Nigerian proper nouns hurts more
-- than it helps. unaccent() itself is STABLE (it resolves its dictionary by
-- search_path), so a generated column needs the immutable two-argument form
-- behind a wrapper that names the dictionary. The wrapper is public because
-- the query side (an anonymous search) must call the same function, and anon
-- has no USAGE on private.
--
-- VERIFIED is structurally first-party: true only when source = first_party,
-- the row is not an example, and the human behind it wears the badge
-- (agent_badges.verified through listings.agent_id or businesses.agent_id).
--
-- THE SEARCH. public.stays_search is SECURITY INVOKER so RLS on the projection
-- decides what a visitor sees, exactly as listings_in_bounds does. Every
-- filter is `p_x is null or ...`, so there is one function and no dynamic
-- SQL. For dated queries it joins availability: an accommodation matches only
-- when some published room type has a row in room_inventory for EVERY night
-- with enough units free, and some active rate plan admits the stay length
-- and is not closed on any of those nights; the total is the sum of nightly
-- rates (calendar override first) times rooms, all kobo. A whole-place
-- nightly listing matches when no PENDING or CONFIRMED booking overlaps and
-- no availability row in the range is anything but available. A missing
-- inventory row is "not offered", never "available". Rows without a date
-- dimension (rentals, restaurants) rank after priced rows on a dated query.
--
-- RLS: public SELECT of PUBLISHED rows, admin SELECT all; no client writes,
-- the triggers are SECURITY DEFINER.

create extension if not exists unaccent with schema extensions;

create or replace function public.unaccent_immutable(input text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(input, ''));
$$;

comment on function public.unaccent_immutable(text) is
  'unaccent with the dictionary named, so it is immutable and can sit in a generated column and in the query that searches it.';

create type public.catalogue_entity_kind as enum ('listing', 'accommodation', 'restaurant');

create table public.catalogue_entries (
  id                     uuid primary key default gen_random_uuid(),
  entity_kind            public.catalogue_entity_kind not null,
  entity_id              uuid not null,
  title                  text not null,
  area                   text,
  city                   text,
  state_code             text,
  -- The market category: property_type::text for a listing, business_kind::text otherwise.
  kind                   text not null,
  source                 public.source_kind not null,
  verified               boolean not null default false,
  is_demo                boolean not null default false,
  status                 public.listing_status not null,
  featured               boolean not null default false,
  published_at           timestamptz,
  headline_price_minor   bigint check (headline_price_minor is null or headline_price_minor >= 0),
  -- 'night', 'sale', 'move_in', 'month', 'quarter', 'year', or null when unpriced.
  headline_price_period  text,
  price_band             smallint check (price_band is null or price_band between 1 and 4),
  max_sleeps             smallint,
  cover_path             text,
  latitude               double precision,
  longitude              double precision,
  location               extensions.geography(Point, 4326),
  rating_avg             numeric(3, 2) check (rating_avg is null or rating_avg between 1 and 5),
  rating_count           integer not null default 0 check (rating_count >= 0),
  has_breakfast          boolean not null default false,
  has_free_cancellation  boolean not null default false,
  room_categories        public.room_category[] not null default '{}'::public.room_category[],
  amenity_codes          text[] not null default '{}'::text[],
  search                 tsvector generated always as (
    to_tsvector('simple', public.unaccent_immutable(coalesce(title, '') || ' ' || coalesce(area, '') || ' ' || coalesce(city, '')))
  ) stored,
  updated_at             timestamptz not null default now(),
  unique (entity_kind, entity_id)
);

comment on table public.catalogue_entries is
  'The one search projection: a thin row per listing, accommodation or restaurant, maintained by triggers on the source tables. Rebuildable; owns nothing.';

create index catalogue_entries_search_gin on public.catalogue_entries using gin (search);
create index catalogue_entries_location_gist
  on public.catalogue_entries using gist (location extensions.gist_geography_ops)
  where status = 'PUBLISHED' and location is not null;
create index catalogue_entries_shelf_idx
  on public.catalogue_entries (entity_kind, state_code, city, featured desc, published_at desc)
  where status = 'PUBLISHED';
create index catalogue_entries_amenities_gin on public.catalogue_entries using gin (amenity_codes) where status = 'PUBLISHED';
create index catalogue_entries_price_idx on public.catalogue_entries (headline_price_minor) where status = 'PUBLISHED';

create trigger catalogue_entries_set_updated_at
  before update on public.catalogue_entries
  for each row execute function public.set_updated_at();

create trigger catalogue_entries_location_sync
  before insert or update of latitude, longitude on public.catalogue_entries
  for each row execute function private.sync_row_location();

/* ---------------------------------------------------- the three refreshes */

create or replace function private.catalogue_refresh_listing(p_listing uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.listings%rowtype;
begin
  select * into l from public.listings where id = p_listing;
  if not found then
    delete from public.catalogue_entries where entity_kind = 'listing' and entity_id = p_listing;
    return;
  end if;

  insert into public.catalogue_entries as ce (
    entity_kind, entity_id, title, area, city, state_code, kind, source, verified, is_demo, status,
    featured, published_at, headline_price_minor, headline_price_period, price_band, max_sleeps,
    cover_path, latitude, longitude, rating_avg, rating_count, has_breakfast, has_free_cancellation,
    room_categories, amenity_codes
  )
  select
    'listing', l.id, l.title, l.area, l.city, l.state_code, l.property_type::text, 'first_party',
    (not l.is_demo) and coalesce((select ab.verified from public.agent_badges ab where ab.agent_id = l.agent_id), false),
    l.is_demo, l.status, l.featured, l.published_at,
    case
      when l.rate_period = 'night' and l.rate_minor > 0 then l.rate_minor
      when l.listing_intent = 'sale' then l.sale_price_minor
      else coalesce(l.total_move_in_cost_minor, l.rent_amount_minor, nullif(l.rate_minor, 0))
    end,
    case
      when l.rate_period = 'night' and l.rate_minor > 0 then 'night'
      when l.listing_intent = 'sale' then 'sale'
      when l.total_move_in_cost_minor is not null then 'move_in'
      when l.rent_amount_minor is not null then coalesce(l.rent_period::text, 'year')
      when l.rate_minor > 0 then coalesce(l.rate_period::text, 'night')
      else null
    end,
    null, null,
    (select lp.storage_path from public.listing_photos lp where lp.listing_id = l.id order by lp.position limit 1),
    l.latitude, l.longitude,
    (select round(avg(r.rating)::numeric, 2) from public.reviews r where r.listing_id = l.id),
    (select count(*) from public.reviews r where r.listing_id = l.id),
    false, false, '{}'::public.room_category[],
    coalesce((select array_agg(a.code order by a.code) from public.listing_amenities la join public.amenities a on a.id = la.amenity_id where la.listing_id = l.id), '{}'::text[])
  on conflict (entity_kind, entity_id) do update set
    title = excluded.title, area = excluded.area, city = excluded.city, state_code = excluded.state_code,
    kind = excluded.kind, source = excluded.source, verified = excluded.verified, is_demo = excluded.is_demo,
    status = excluded.status, featured = excluded.featured, published_at = excluded.published_at,
    headline_price_minor = excluded.headline_price_minor, headline_price_period = excluded.headline_price_period,
    price_band = excluded.price_band, max_sleeps = excluded.max_sleeps, cover_path = excluded.cover_path,
    latitude = excluded.latitude, longitude = excluded.longitude,
    rating_avg = excluded.rating_avg, rating_count = excluded.rating_count,
    has_breakfast = excluded.has_breakfast, has_free_cancellation = excluded.has_free_cancellation,
    room_categories = excluded.room_categories, amenity_codes = excluded.amenity_codes;
end;
$$;

create or replace function private.catalogue_refresh_accommodation(p_accommodation uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.accommodations%rowtype;
  b public.businesses%rowtype;
begin
  select * into a from public.accommodations where id = p_accommodation;
  if not found then
    delete from public.catalogue_entries where entity_kind = 'accommodation' and entity_id = p_accommodation;
    return;
  end if;
  select * into b from public.businesses where id = a.business_id;

  insert into public.catalogue_entries as ce (
    entity_kind, entity_id, title, area, city, state_code, kind, source, verified, is_demo, status,
    featured, published_at, headline_price_minor, headline_price_period, price_band, max_sleeps,
    cover_path, latitude, longitude, rating_avg, rating_count, has_breakfast, has_free_cancellation,
    room_categories, amenity_codes
  )
  select
    'accommodation', a.id, a.name,
    coalesce(a.area, b.area), coalesce(a.city, b.city), coalesce(a.state_code, b.state_code),
    b.kind::text, a.source,
    a.source = 'first_party' and not a.is_demo
      and coalesce((select ab.verified from public.agent_badges ab where ab.agent_id = b.agent_id), false),
    a.is_demo,
    -- On the shelf only when the business is too: a published property under
    -- an unpublished business carries the business's status here.
    case when b.status = 'PUBLISHED' then a.status
         when a.status = 'PUBLISHED' then b.status
         else a.status end,
    a.featured, a.published_at,
    (select min(coalesce(
        (select min(rp.rate_minor) from public.rate_plans rp where rp.room_type_id = rt.id and rp.active),
        rt.base_rate_minor))
       from public.room_types rt where rt.accommodation_id = a.id and rt.status = 'PUBLISHED'),
    'night',
    null,
    (select max(rt.sleeps) from public.room_types rt where rt.accommodation_id = a.id and rt.status = 'PUBLISHED'),
    (select ap.storage_path from public.accommodation_photos ap where ap.accommodation_id = a.id order by ap.position limit 1),
    coalesce(a.latitude, b.latitude), coalesce(a.longitude, b.longitude),
    null, 0,
    exists (select 1 from public.rate_plans rp join public.room_types rt on rt.id = rp.room_type_id
             where rt.accommodation_id = a.id and rt.status = 'PUBLISHED' and rp.active and rp.meal_plan <> 'room_only'),
    exists (select 1 from public.rate_plans rp join public.room_types rt on rt.id = rp.room_type_id
             join public.cancellation_policies cp on cp.id = rp.cancellation_policy_id
             where rt.accommodation_id = a.id and rt.status = 'PUBLISHED' and rp.active and cp.is_free_until_hours is not null),
    coalesce((select array_agg(distinct rt.category) from public.room_types rt where rt.accommodation_id = a.id and rt.status = 'PUBLISHED'), '{}'::public.room_category[]),
    coalesce((select array_agg(am.code order by am.code) from public.accommodation_amenities aa join public.amenities am on am.id = aa.amenity_id where aa.accommodation_id = a.id), '{}'::text[])
  on conflict (entity_kind, entity_id) do update set
    title = excluded.title, area = excluded.area, city = excluded.city, state_code = excluded.state_code,
    kind = excluded.kind, source = excluded.source, verified = excluded.verified, is_demo = excluded.is_demo,
    status = excluded.status, featured = excluded.featured, published_at = excluded.published_at,
    headline_price_minor = excluded.headline_price_minor, headline_price_period = excluded.headline_price_period,
    price_band = excluded.price_band, max_sleeps = excluded.max_sleeps, cover_path = excluded.cover_path,
    latitude = excluded.latitude, longitude = excluded.longitude,
    rating_avg = excluded.rating_avg, rating_count = excluded.rating_count,
    has_breakfast = excluded.has_breakfast, has_free_cancellation = excluded.has_free_cancellation,
    room_categories = excluded.room_categories, amenity_codes = excluded.amenity_codes;
end;
$$;

create or replace function private.catalogue_refresh_restaurant(p_business uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.businesses%rowtype;
begin
  select * into b from public.businesses where id = p_business and kind = 'restaurant';
  if not found then
    delete from public.catalogue_entries where entity_kind = 'restaurant' and entity_id = p_business;
    return;
  end if;

  insert into public.catalogue_entries as ce (
    entity_kind, entity_id, title, area, city, state_code, kind, source, verified, is_demo, status,
    featured, published_at, headline_price_minor, headline_price_period, price_band, max_sleeps,
    cover_path, latitude, longitude, rating_avg, rating_count, has_breakfast, has_free_cancellation,
    room_categories, amenity_codes
  )
  select
    'restaurant', b.id, b.name, b.area, b.city, b.state_code, 'restaurant', b.source,
    b.source = 'first_party' and not b.is_demo
      and coalesce((select ab.verified from public.agent_badges ab where ab.agent_id = b.agent_id), false),
    b.is_demo, b.status, false, b.published_at,
    null, null,
    (select rp.price_band from public.restaurant_profiles rp where rp.business_id = b.id),
    null, null,
    b.latitude, b.longitude,
    null, 0, false, false, '{}'::public.room_category[],
    coalesce((select array_remove(array[
        case when rp.parking then 'parking' end,
        case when rp.power_backup then 'generator' end,
        case when rp.outdoor then 'outdoor' end
      ], null) from public.restaurant_profiles rp where rp.business_id = b.id), '{}'::text[])
  on conflict (entity_kind, entity_id) do update set
    title = excluded.title, area = excluded.area, city = excluded.city, state_code = excluded.state_code,
    kind = excluded.kind, source = excluded.source, verified = excluded.verified, is_demo = excluded.is_demo,
    status = excluded.status, featured = excluded.featured, published_at = excluded.published_at,
    headline_price_minor = excluded.headline_price_minor, headline_price_period = excluded.headline_price_period,
    price_band = excluded.price_band, max_sleeps = excluded.max_sleeps, cover_path = excluded.cover_path,
    latitude = excluded.latitude, longitude = excluded.longitude,
    rating_avg = excluded.rating_avg, rating_count = excluded.rating_count,
    has_breakfast = excluded.has_breakfast, has_free_cancellation = excluded.has_free_cancellation,
    room_categories = excluded.room_categories, amenity_codes = excluded.amenity_codes;
end;
$$;

/* ------------------------------------------------ the trigger functions */

create or replace function private.catalogue_on_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.catalogue_refresh_listing(coalesce(new.id, old.id));
  return null;
end;
$$;

create or replace function private.catalogue_on_listing_child()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op <> 'DELETE' then perform private.catalogue_refresh_listing(new.listing_id); end if;
  if tg_op <> 'INSERT' and (tg_op = 'DELETE' or old.listing_id is distinct from new.listing_id) then
    perform private.catalogue_refresh_listing(old.listing_id);
  end if;
  return null;
end;
$$;

create or replace function private.catalogue_on_accommodation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.catalogue_refresh_accommodation(coalesce(new.id, old.id));
  return null;
end;
$$;

create or replace function private.catalogue_on_accommodation_child()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op <> 'DELETE' then perform private.catalogue_refresh_accommodation(new.accommodation_id); end if;
  if tg_op <> 'INSERT' and (tg_op = 'DELETE' or old.accommodation_id is distinct from new.accommodation_id) then
    perform private.catalogue_refresh_accommodation(old.accommodation_id);
  end if;
  return null;
end;
$$;

-- rate_plans: through the room type to the accommodation.
create or replace function private.catalogue_on_rate_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc uuid;
begin
  select rt.accommodation_id into acc from public.room_types rt where rt.id = coalesce(new.room_type_id, old.room_type_id);
  if acc is not null then perform private.catalogue_refresh_accommodation(acc); end if;
  return null;
end;
$$;

-- cancellation_policies: every accommodation with an active plan on the policy.
create or replace function private.catalogue_on_cancellation_policy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc uuid;
begin
  if tg_op = 'UPDATE' and new.is_free_until_hours is not distinct from old.is_free_until_hours then
    return null;
  end if;
  for acc in
    select distinct rt.accommodation_id
    from public.rate_plans rp
    join public.room_types rt on rt.id = rp.room_type_id
    where rp.cancellation_policy_id = coalesce(new.id, old.id)
  loop
    perform private.catalogue_refresh_accommodation(acc);
  end loop;
  return null;
end;
$$;

-- businesses: the restaurant entry, and every accommodation under it (status,
-- source, kind, badge and location all flow down).
create or replace function private.catalogue_on_business()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc uuid;
begin
  perform private.catalogue_refresh_restaurant(coalesce(new.id, old.id));
  for acc in select a.id from public.accommodations a where a.business_id = coalesce(new.id, old.id) loop
    perform private.catalogue_refresh_accommodation(acc);
  end loop;
  return null;
end;
$$;

create or replace function private.catalogue_on_restaurant_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.catalogue_refresh_restaurant(coalesce(new.business_id, old.business_id));
  return null;
end;
$$;

-- agent_badges: the badge flipping flips verified on every row behind that agent.
create or replace function private.catalogue_on_agent_badge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.agent_id, old.agent_id);
  r uuid;
begin
  for r in select l.id from public.listings l where l.agent_id = target loop
    perform private.catalogue_refresh_listing(r);
  end loop;
  for r in select b.id from public.businesses b where b.agent_id = target loop
    perform private.catalogue_refresh_restaurant(r);
  end loop;
  for r in select a.id from public.accommodations a join public.businesses b on b.id = a.business_id where b.agent_id = target loop
    perform private.catalogue_refresh_accommodation(r);
  end loop;
  return null;
end;
$$;

/* ------------------------------------------------------- the triggers */

create trigger listings_catalogue_sync
  after insert or update or delete on public.listings
  for each row execute function private.catalogue_on_listing();
create trigger listing_amenities_catalogue_sync
  after insert or update or delete on public.listing_amenities
  for each row execute function private.catalogue_on_listing_child();
create trigger listing_photos_catalogue_sync
  after insert or update or delete on public.listing_photos
  for each row execute function private.catalogue_on_listing_child();
create trigger reviews_catalogue_sync
  after insert or update or delete on public.reviews
  for each row execute function private.catalogue_on_listing_child();

create trigger accommodations_catalogue_sync
  after insert or update or delete on public.accommodations
  for each row execute function private.catalogue_on_accommodation();
create trigger accommodation_amenities_catalogue_sync
  after insert or update or delete on public.accommodation_amenities
  for each row execute function private.catalogue_on_accommodation_child();
create trigger accommodation_photos_catalogue_sync
  after insert or update or delete on public.accommodation_photos
  for each row execute function private.catalogue_on_accommodation_child();
create trigger room_types_catalogue_sync
  after insert or update or delete on public.room_types
  for each row execute function private.catalogue_on_accommodation_child();
create trigger rate_plans_catalogue_sync
  after insert or update or delete on public.rate_plans
  for each row execute function private.catalogue_on_rate_plan();
create trigger cancellation_policies_catalogue_sync
  after update or delete on public.cancellation_policies
  for each row execute function private.catalogue_on_cancellation_policy();

create trigger businesses_catalogue_sync
  after insert or update or delete on public.businesses
  for each row execute function private.catalogue_on_business();
create trigger restaurant_profiles_catalogue_sync
  after insert or update or delete on public.restaurant_profiles
  for each row execute function private.catalogue_on_restaurant_profile();
create trigger agent_badges_catalogue_sync
  after insert or update of verified or delete on public.agent_badges
  for each row execute function private.catalogue_on_agent_badge();

/* --------------------------------------------- the rebuild and backfill */

create or replace function private.rebuild_catalogue_entries()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r uuid;
  n integer;
begin
  delete from public.catalogue_entries;
  for r in select id from public.listings loop
    perform private.catalogue_refresh_listing(r);
  end loop;
  for r in select id from public.accommodations loop
    perform private.catalogue_refresh_accommodation(r);
  end loop;
  for r in select id from public.businesses where kind = 'restaurant' loop
    perform private.catalogue_refresh_restaurant(r);
  end loop;
  select count(*) into n from public.catalogue_entries;
  return n;
end;
$$;

comment on function private.rebuild_catalogue_entries() is
  'Drops and refills the projection from its three sources. Legal at any time; the projection owns nothing. Returns the row count.';

revoke all on function private.rebuild_catalogue_entries() from public, anon, authenticated;

select private.rebuild_catalogue_entries();

/* ------------------------------------------------------------- RLS */

alter table public.catalogue_entries enable row level security;

create policy catalogue_entries_select_published
  on public.catalogue_entries for select
  using (status = 'PUBLISHED');

create policy catalogue_entries_admin_select
  on public.catalogue_entries for select
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

/* ------------------------------------------------------- the search */

create or replace function public.stays_search(
  p_entity_kinds      public.catalogue_entity_kind[] default null,
  p_q                 text default null,
  p_state_code        text default null,
  p_city              text default null,
  p_area              text default null,
  p_check_in          date default null,
  p_check_out         date default null,
  p_rooms             integer default 1,
  p_guests            integer default null,
  p_min_price_minor   bigint default null,
  p_max_price_minor   bigint default null,
  p_min_rating        numeric default null,
  p_room_categories   public.room_category[] default null,
  p_amenities         text[] default null,
  p_breakfast         boolean default null,
  p_free_cancellation boolean default null,
  p_verified          boolean default null,
  p_lat               double precision default null,
  p_lng               double precision default null,
  p_radius_m          integer default null,
  p_sort              text default 'recommended',
  p_limit             integer default 40,
  p_offset            integer default 0
)
returns table (
  id                    uuid,
  entity_kind           public.catalogue_entity_kind,
  entity_id             uuid,
  title                 text,
  area                  text,
  city                  text,
  state_code            text,
  kind                  text,
  source                public.source_kind,
  verified              boolean,
  is_demo               boolean,
  featured              boolean,
  headline_price_minor  bigint,
  headline_price_period text,
  price_band            smallint,
  max_sleeps            smallint,
  cover_path            text,
  latitude              double precision,
  longitude             double precision,
  rating_avg            numeric,
  rating_count          integer,
  has_breakfast         boolean,
  has_free_cancellation boolean,
  room_categories       public.room_category[],
  amenity_codes         text[],
  distance_m            double precision,
  nights                integer,
  room_type_id          uuid,
  rate_plan_id          uuid,
  nightly_minor         bigint,
  total_minor           bigint,
  total_count           bigint
)
language sql
stable
set search_path = ''
as $$
  with params as (
    select
      case when p_check_in is not null and p_check_out is not null and p_check_out > p_check_in
           then (p_check_out - p_check_in) else null end as nights,
      greatest(coalesce(p_rooms, 1), 1) as rooms,
      case when p_lat is not null and p_lng is not null
           then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
           else null end as origin,
      case when length(btrim(coalesce(p_q, ''))) >= 2
           then websearch_to_tsquery('simple', public.unaccent_immutable(p_q))
           else null end as query
  ),
  base as (
    select ce.*, pr.nights, pr.rooms, pr.origin,
      case when pr.origin is not null and ce.location is not null
           then extensions.st_distance(ce.location, pr.origin) else null end as distance_m
    from public.catalogue_entries ce, params pr
    where ce.status = 'PUBLISHED'
      and (p_entity_kinds is null or ce.entity_kind = any (p_entity_kinds))
      and (pr.query is null or ce.search @@ pr.query)
      and (p_state_code is null or ce.state_code = p_state_code)
      and (p_city is null or lower(ce.city) = lower(p_city))
      and (p_area is null or lower(ce.area) = lower(p_area))
      and (p_min_rating is null or ce.rating_avg >= p_min_rating)
      and (p_room_categories is null or ce.room_categories && p_room_categories)
      and (p_amenities is null or ce.amenity_codes @> p_amenities)
      and (p_breakfast is not true or ce.has_breakfast)
      and (p_free_cancellation is not true or ce.has_free_cancellation)
      and (p_verified is not true or ce.verified)
      and (p_guests is null or ce.max_sleeps is null or ce.max_sleeps * pr.rooms >= p_guests)
      and (pr.origin is null or p_radius_m is null or ce.location is null
           or extensions.st_dwithin(ce.location, pr.origin, p_radius_m))
  ),
  priced as (
    select b.*,
      q.room_type_id, q.rate_plan_id, q.nightly_minor, q.total_minor
    from base b
    left join lateral (
      -- Accommodation: the cheapest admitting plan on a room type free every night.
      select rt.id as room_type_id, rp.id as rate_plan_id,
             (nt.total / b.nights)::bigint as nightly_minor,
             (nt.total * b.rooms)::bigint as total_minor
      from public.room_types rt
      join public.rate_plans rp on rp.room_type_id = rt.id and rp.active
      cross join lateral (
        select sum(coalesce(rc.rate_minor, rp.rate_minor)) as total
        from generate_series(p_check_in, p_check_out - 1, interval '1 day') d
        left join public.rate_calendar rc on rc.rate_plan_id = rp.id and rc.date = d::date
      ) nt
      where b.entity_kind = 'accommodation' and b.nights is not null
        and rt.accommodation_id = b.entity_id
        and rt.status = 'PUBLISHED'
        and (p_guests is null or rt.sleeps * b.rooms >= p_guests)
        and (p_room_categories is null or rt.category = any (p_room_categories))
        and rp.min_stay_nights <= b.nights
        and (rp.max_stay_nights is null or rp.max_stay_nights >= b.nights)
        and (p_breakfast is not true or rp.meal_plan <> 'room_only')
        and (p_free_cancellation is not true or exists (
              select 1 from public.cancellation_policies cp where cp.id = rp.cancellation_policy_id and cp.is_free_until_hours is not null))
        and not exists (
              select 1 from public.rate_calendar rc
              where rc.rate_plan_id = rp.id and rc.date >= p_check_in and rc.date < p_check_out and rc.closed)
        and (select count(*) from public.room_inventory ri
              where ri.room_type_id = rt.id and ri.date >= p_check_in and ri.date < p_check_out
                and ri.units_open - ri.units_booked >= b.rooms) = b.nights
      union all
      -- Whole-place nightly listing: no overlapping hold, no blocked night.
      select null, null, b.headline_price_minor, (b.headline_price_minor * b.nights)::bigint
      where b.entity_kind = 'listing' and b.nights is not null
        and b.headline_price_period = 'night' and b.headline_price_minor is not null
        and not exists (
              select 1 from public.bookings bk
              where bk.listing_id = b.entity_id and bk.status in ('PENDING', 'CONFIRMED')
                and bk.check_in < p_check_out and bk.check_out > p_check_in)
        and not exists (
              select 1 from public.availability av
              where av.listing_id = b.entity_id and av.date >= p_check_in and av.date < p_check_out
                and av.status <> 'available')
      order by 4 asc nulls last
      limit 1
    ) q on true
    where
      -- On a dated query, a stay that sells nights must actually have them.
      b.nights is null
      or q.total_minor is not null
      or (b.entity_kind = 'listing' and b.headline_price_period is distinct from 'night')
      or b.entity_kind = 'restaurant'
  ),
  filtered as (
    select p.*,
      coalesce(p.total_minor, p.headline_price_minor) as price_for_filter
    from priced p
    where (p_min_price_minor is null or coalesce(p.total_minor, p.headline_price_minor, -1) >= p_min_price_minor)
      and (p_max_price_minor is null or coalesce(p.total_minor, p.headline_price_minor, -1) between 0 and p_max_price_minor)
  )
  select
    f.id, f.entity_kind, f.entity_id, f.title, f.area, f.city, f.state_code, f.kind, f.source,
    f.verified, f.is_demo, f.featured, f.headline_price_minor, f.headline_price_period, f.price_band,
    f.max_sleeps, f.cover_path, f.latitude, f.longitude, f.rating_avg, f.rating_count,
    f.has_breakfast, f.has_free_cancellation, f.room_categories, f.amenity_codes,
    f.distance_m, f.nights, f.room_type_id, f.rate_plan_id, f.nightly_minor, f.total_minor,
    count(*) over () as total_count
  from filtered f
  order by
    -- Dated inventory first on a dated query; first party above partner at equal relevance.
    case when f.nights is not null and f.total_minor is not null then 0 else 1 end,
    case when f.source = 'first_party' then 0 else 1 end,
    case when p_sort = 'price-asc'  then f.price_for_filter end asc nulls last,
    case when p_sort = 'price-desc' then f.price_for_filter end desc nulls last,
    case when p_sort = 'top-rated'  then f.rating_avg end desc nulls last,
    case when p_sort = 'distance'   then f.distance_m end asc nulls last,
    f.featured desc, f.published_at desc nulls last, f.id
  limit least(greatest(coalesce(p_limit, 40), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

comment on function public.stays_search is
  'The one search over catalogue_entries with the twelve filters (price, rating, location, room type, facilities, breakfast, air conditioning, parking, wifi and every other amenity code, verified, free cancellation, distance from a point) and, for dated queries, the availability-aware room join priced from the rate calendar. NOT security definer: RLS on the projection decides visibility. Money is kobo throughout; total_minor is the whole stay for p_rooms rooms.';

grant execute on function public.stays_search to anon, authenticated, service_role;
