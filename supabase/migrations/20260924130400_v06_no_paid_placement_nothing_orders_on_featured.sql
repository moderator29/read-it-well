-- V-06, NO PAID PLACEMENT, EVER: NOTHING THIS REPOSITORY OWNS ORDERS ON
-- `listings.featured`, AND NOTHING CAN SET IT.
--
-- "Recommended" ordered the catalogue by `featured desc, published_at desc,
-- created_at desc`, on a boolean (20260728152229_listings_core) that nothing in
-- the console sets. On every one of today's listings it is false, so the order
-- was plain recency, which rewards reposting. And a column called `featured`
-- with no writer is exactly the lever a future sales conversation reaches for:
-- every Nigerian portal's revenue is visibility, and the date on a listing
-- there means the agent paid. Vallo does not sell placement.
--
-- WHY THE COLUMN IS NOT DROPPED HERE (review of batch 1, blocker). Two live
-- functions the audit session applied and owns, `public.listings_in_bounds_exact`
-- and `public.listings_in_bounds_public`, both `order by l.featured desc`. A
-- drop would take them down ("column l.featured does not exist"). So this
-- file does only what is safe, and the drop is handed to the audit session:
-- drop listings.featured after re-creating those two without it.
--
-- WHAT REPLACES IT is not a column. Recommended is a published formula in
-- `apps/web/src/lib/listings/ranking.ts`, stated in words on /standards from
-- the SAME constants, so the prose and the code cannot drift.
--
-- WHAT THIS FILE DOES:
--
--   1. `private.catalogue_refresh_listing` wrote `l.featured` into
--      `catalogue_entries`. Re-created identically except that a listing's
--      catalogue row is always `featured = false`.
--   2. `public.listings_in_bounds` (the map, which this repository's code
--      calls) ordered by `l.featured desc`. Re-created without it.
--      `create or replace` keeps its grants.
--   3. A CHECK that `listings.featured` is false, so the lever cannot be
--      pulled while the column waits to be dropped. Every row is false today
--      (the probe reads it back), and `private.guard_owner_write` already
--      resets it to false on an owner's insert.

/* 1 ---------------------------------------------------- the catalogue sync */

create or replace function private.catalogue_refresh_listing(p_listing uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
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
    l.is_demo, l.status,
    /* V-06: a listing is never featured. There is no column to read. */
    false,
    l.published_at,
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
$function$;

/* Every existing listing row in the catalogue loses a flag nothing set. */
update public.catalogue_entries set featured = false where entity_kind = 'listing' and featured;

/* 2 ------------------------------------------------------------- the map */

create or replace function public.listings_in_bounds(
  p_west double precision, p_south double precision, p_east double precision, p_north double precision,
  p_intent public.listing_intent default null::public.listing_intent,
  p_property_type public.property_type default null::public.property_type,
  p_min_price_minor bigint default null::bigint, p_max_price_minor bigint default null::bigint,
  p_bedrooms integer default null::integer, p_limit integer default 500)
returns table (id uuid, title text, property_type public.property_type, listing_intent public.listing_intent,
               city text, area text, state_code text, latitude double precision, longitude double precision,
               bedrooms integer, bathrooms integer, price_minor bigint, is_demo boolean)
language sql
stable
set search_path to ''
as $function$
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
      else coalesce(l.total_move_in_cost_minor, l.rent_amount_minor, nullif(l.rate_minor, 0))
    end as price_minor,
    l.is_demo
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
  order by l.published_at desc nulls last, l.id
  limit least(greatest(coalesce(p_limit, 500), 1), 1000);
$function$;

/* 3 -------------------------------------------------- the lever, locked */

alter table public.listings drop constraint if exists listings_featured_is_never_set;
alter table public.listings add constraint listings_featured_is_never_set check (featured = false);

do $readback$
declare bad text := '';
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.listings'::regclass and conname = 'listings_featured_is_never_set') then
    bad := bad || ' [featured can still be set]';
  end if;
  if pg_get_functiondef('public.listings_in_bounds(double precision,double precision,double precision,double precision,public.listing_intent,public.property_type,bigint,bigint,integer,integer)'::regprocedure) ilike '%featured%' then
    bad := bad || ' [the map still orders on featured]';
  end if;
  if not has_function_privilege('anon', 'public.listings_in_bounds(double precision,double precision,double precision,double precision,public.listing_intent,public.property_type,bigint,bigint,integer,integer)', 'execute') then
    bad := bad || ' [the map lost its anon grant]';
  end if;
  if bad <> '' then raise exception 'READ-BACK FAILED:%', bad; end if;
end;
$readback$;
