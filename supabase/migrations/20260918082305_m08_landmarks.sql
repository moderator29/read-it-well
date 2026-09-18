-- M8 of the two-side platform: landmarks, location intelligence as data.
--
-- "Near Victoria Island", "near the airport", "close to Eko Hotel" are the
-- questions a stays search actually gets, and none of them is a bounding
-- box. A landmark is a named point with a kind, so the search resolves the
-- name by trigram over name and aliases, then asks PostGIS for everything
-- within a radius of it, and "near the airport" is kind = 'airport' scoped by
-- city. Distance is rendered from ST_Distance in metres.
--
-- SOURCE IS ON THE ROW. Seeded rows are first_party curation: a person chose
-- them and typed the coordinates. A licensed feed would say so on its rows.
-- Nothing here is scraped. The curated Lagos and Abuja seed is a separate
-- DRAFT (supabase/migrations/pending/m08_landmarks_seed.sql) with a one-page
-- human list (pending/LANDMARKS.md) for the founder to approve first; this
-- migration ships the table empty.
--
-- ALIASES are the names people actually say: "VI" for Victoria Island, "MMIA"
-- for the international airport. They are searched through one expression
-- index over the joined array, so a new alias is a row edit and not a schema
-- change.
--
-- RLS: world-readable (a landmark is public geography), admin write. Hosts
-- and guests never author one.

create table public.landmarks (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) between 2 and 120),
  slug       text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 140),
  kind       public.landmark_kind not null,
  state_code text not null references public.states (code),
  city       text not null check (length(btrim(city)) between 2 and 80),
  latitude   double precision not null check (latitude between -90 and 90),
  longitude  double precision not null check (longitude between -180 and 180),
  location   extensions.geography(Point, 4326),
  aliases    text[] not null default '{}'::text[] check (cardinality(aliases) <= 12),
  source     public.source_kind not null default 'first_party',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.landmarks is
  'Named points a search can be near: airports, districts, malls, stadiums, beaches. Curated, never scraped; source says who curated. aliases hold the names people say.';

comment on column public.landmarks.location is
  'Derived by landmarks_location_sync from latitude and longitude. Never written directly.';

-- array_to_string is only STABLE in Postgres (element output functions are
-- not promised immutable in general), so it cannot sit in an index
-- expression directly. For text[] the join is a pure function of its input,
-- and this wrapper says so. The search must call the same wrapper for the
-- index to be used.
create or replace function private.join_text_array(items text[])
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select array_to_string(items, ' ');
$$;

revoke all on function private.join_text_array(text[]) from public;
grant execute on function private.join_text_array(text[]) to anon, authenticated;

create unique index landmarks_slug_key on public.landmarks (slug);
create index landmarks_state_city_idx on public.landmarks (state_code, city);
create index landmarks_kind_idx on public.landmarks (kind);
create index landmarks_location_gist
  on public.landmarks using gist (location extensions.gist_geography_ops);
create index landmarks_name_trgm_idx
  on public.landmarks using gin (name extensions.gin_trgm_ops);
create index landmarks_aliases_trgm_idx
  on public.landmarks using gin ((private.join_text_array(aliases)) extensions.gin_trgm_ops);

create trigger landmarks_set_updated_at
  before update on public.landmarks
  for each row execute function public.set_updated_at();

create trigger landmarks_location_sync
  before insert or update of latitude, longitude on public.landmarks
  for each row execute function private.sync_row_location();

alter table public.landmarks enable row level security;

create policy landmarks_select_all
  on public.landmarks for select
  using (true);

create policy landmarks_admin_all
  on public.landmarks for all
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));
