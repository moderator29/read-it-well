-- Google Places id cache. PENDING: the lead applies this, not the provider.
--
-- Google's Places API terms let us keep a `place_id` indefinitely but allow only
-- brief caching of place DETAILS. This table exists to hold exactly the half we
-- are permitted to keep, and its column list is the enforcement: place_id, the
-- search text it was found under, the covered city that search was biased to,
-- and timestamps. No display name, no address, no rating, no opening hours, no
-- photo reference, no price level. If a future change wants any of those stored
-- here, that change is a licence question first and a schema question second.
--
-- The details half lives in an in-process cache with a three minute TTL inside
-- `apps/web/src/lib/inventory/providers/places.ts`, and every partner restaurant
-- view refetches from Google. Nothing details-shaped is ever written to Postgres.
--
-- Nothing reads this table on the render path: the provider searches Google on
-- every discovery query and refetches details on every view. It is written so we
-- know which venues the catalogue has surfaced, so a future backfill or a
-- coverage report has a stable id set to work from, and so the id half of the
-- cache survives a deployment. That is also why every write is fire and forget:
-- if this table does not exist yet, or the write fails, discovery does not
-- notice and no visitor is affected.
--
-- Access: server side only, through the service role. RLS is enabled with no
-- policies at all, which is deliberate rather than an omission. There is no
-- anon or authenticated read path and no client insert path, so a cache of
-- third-party ids can never be scraped through the public API, and the service
-- role bypasses RLS for the provider's own upsert.

create table if not exists public.places_cache (
  -- Google's stable place identifier. Keepable indefinitely, unlike details.
  place_id      text primary key,
  -- The text query this id was first seen under, for coverage reporting.
  found_for     text        not null,
  -- The covered city the search was biased to, matching Listing.city.
  city          text        not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

comment on table public.places_cache is
  'Google Places place_ids only. Place details must never be stored here: the '
  'Places terms permit indefinite caching of place_id and only brief caching of '
  'details, which the provider layer holds in process for three minutes.';

-- Coverage queries ask "what have we seen in Lagos lately", so the index that
-- earns its keep is city plus recency.
create index if not exists places_cache_city_last_seen_idx
  on public.places_cache (city, last_seen_at desc);

alter table public.places_cache enable row level security;

-- No policies by design: no client of ours reads or writes this table. The
-- provider layer uses the service role, which bypasses RLS.

-- The upsert refreshes last_seen_at on every sighting while first_seen_at keeps
-- the original, so a venue's age in our catalogue stays truthful.
create or replace function private.touch_places_cache()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.first_seen_at := coalesce(old.first_seen_at, new.first_seen_at, now());
  new.last_seen_at := now();
  return new;
end;
$$;

drop trigger if exists places_cache_touch on public.places_cache;
create trigger places_cache_touch
  before update on public.places_cache
  for each row execute function private.touch_places_cache();

revoke all on table public.places_cache from anon, authenticated;
revoke execute on function private.touch_places_cache() from public, anon, authenticated;
