-- Listings domain: listings, photos, amenities, per-night availability.
--
-- Shapes the 7-step List Apartment wizard confirmed as canonical (Ref 03, owner
-- decision 2026-07-28): Basic Info, Photos, Location, Amenities, Pricing and
-- Availability, Preview, Submit. Photos only for MVP; video, virtual tours and
-- documents are deferred. Every money field is integer kobo (bigint), never a
-- float (Master Rule 50, ADR-004).
--
-- Review reuses the same canonical status vocabulary as agents, with an explicit
-- PUBLISHED state after APPROVED and MORE_INFO_REQUIRED for the admin Request
-- Changes action (intake C-03). RLS: an agent manages only their own listings;
-- anyone, signed in or not, may read a PUBLISHED listing and its photos,
-- amenities and availability for discovery; admins read all and drive review.

create type public.property_type as enum ('apartment', 'hotel', 'home', 'villa', 'shortlet');

create type public.listing_status as enum (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'MORE_INFO_REQUIRED',
  'APPROVED',
  'PUBLISHED',
  'REJECTED',
  'SUSPENDED'
);

create type public.availability_status as enum ('available', 'booked', 'unavailable');

create table public.listings (
  id                   uuid primary key default gen_random_uuid(),
  agent_id             uuid not null references public.agents (id) on delete cascade,
  title                text not null,
  description          text,
  property_type        public.property_type not null,
  status               public.listing_status not null default 'DRAFT',
  -- Location. State is canonical; city, area, address, landmark match the UI.
  state_code           text references public.states (code),
  city                 text,
  area                 text,
  address              text,
  landmark             text,
  latitude             double precision,
  longitude            double precision,
  -- Basic info.
  max_guests           integer not null default 1 check (max_guests > 0),
  bedrooms             integer not null default 0 check (bedrooms >= 0),
  beds                 integer not null default 1 check (beds >= 0),
  bathrooms            integer not null default 1 check (bathrooms >= 0),
  -- Pricing, integer kobo.
  price_per_night_minor bigint not null default 0 check (price_per_night_minor >= 0),
  cleaning_fee_minor    bigint not null default 0 check (cleaning_fee_minor >= 0),
  service_fee_minor     bigint not null default 0 check (service_fee_minor >= 0),
  min_stay_nights       integer not null default 1 check (min_stay_nights > 0),
  instant_book          boolean not null default false,
  featured              boolean not null default false,
  submitted_at          timestamptz,
  reviewed_at           timestamptz,
  reviewer_id           uuid references auth.users (id),
  review_notes          text,
  published_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.listings is 'A property listing. Money fields are integer kobo.';

create index listings_agent_idx    on public.listings (agent_id);
create index listings_status_idx   on public.listings (status);
create index listings_location_idx on public.listings (state_code, city);
create index listings_type_idx     on public.listings (property_type);

create table public.amenities (
  id       uuid primary key default gen_random_uuid(),
  code     text not null unique,
  label    text not null,
  category text not null default 'general'
);

comment on table public.amenities is 'Reference list of amenities an agent can attach to a listing.';

insert into public.amenities (code, label, category) values
  ('wifi',      'WiFi',            'connectivity'),
  ('ac',        'Air Conditioning','comfort'),
  ('tv',        'TV',              'comfort'),
  ('kitchen',   'Kitchen',         'facilities'),
  ('parking',   'Parking',         'facilities'),
  ('pool',      'Swimming Pool',   'facilities'),
  ('gym',       'Gym',             'facilities'),
  ('security',  'Security',        'safety'),
  ('elevator',  'Elevator',        'facilities'),
  ('furnished', 'Furnished',       'comfort'),
  ('balcony',   'Balcony',         'comfort'),
  ('garden',    'Garden',          'comfort'),
  ('laundry',   'Laundry',         'facilities'),
  ('generator', 'Backup Power',    'facilities'),
  ('water',     'Running Water',   'facilities');

create table public.listing_amenities (
  listing_id uuid not null references public.listings (id) on delete cascade,
  amenity_id uuid not null references public.amenities (id) on delete cascade,
  primary key (listing_id, amenity_id)
);

create table public.listing_photos (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  -- Position 0 is the cover, per Ref 09 "first photo is the main image".
  position     integer not null default 0 check (position >= 0 and position < 10),
  created_at   timestamptz not null default now(),
  unique (listing_id, position)
);

comment on table public.listing_photos is 'Up to 10 photos per listing. Position 0 is the cover.';

create table public.availability (
  listing_id uuid not null references public.listings (id) on delete cascade,
  date       date not null,
  status     public.availability_status not null default 'available',
  primary key (listing_id, date)
);

comment on table public.availability is 'Per-night availability with check-in and check-out edge semantics (intake).';

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- Helper: does the current user own this listing (through the agents table)?
-- Kept in the private schema so it is usable by RLS but not exposed as an API.
create function private.owns_listing(target_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.listings l
    join public.agents a on a.id = l.agent_id
    where l.id = target_listing_id and a.user_id = auth.uid()
  );
$$;

revoke execute on function private.owns_listing(uuid) from public, anon;
grant  execute on function private.owns_listing(uuid) to authenticated;

-- Row Level Security.
alter table public.listings          enable row level security;
alter table public.amenities         enable row level security;
alter table public.listing_amenities enable row level security;
alter table public.listing_photos    enable row level security;
alter table public.availability      enable row level security;

-- Listings: public reads only PUBLISHED. The owning agent does everything to
-- their own rows. Admins read all and drive review.
create policy listings_select_published
  on public.listings for select
  using (status = 'PUBLISHED');

create policy listings_owner_all
  on public.listings for all
  using (exists (select 1 from public.agents a where a.id = listings.agent_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.agents a where a.id = listings.agent_id and a.user_id = auth.uid()));

create policy listings_admin_all
  on public.listings for all
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'))
  with check (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin'));

-- Amenities: reference data, world-readable.
create policy amenities_select_all
  on public.amenities for select
  using (true);

-- Join rows and photos: readable when the parent listing is published, or by the
-- owning agent, or by an admin; writable by the owning agent and admins.
create policy listing_amenities_select
  on public.listing_amenities for select
  using (
    exists (select 1 from public.listings l where l.id = listing_amenities.listing_id and l.status = 'PUBLISHED')
    or private.owns_listing(listing_amenities.listing_id)
    or private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin')
  );

create policy listing_amenities_write
  on public.listing_amenities for all
  using (private.owns_listing(listing_amenities.listing_id))
  with check (private.owns_listing(listing_amenities.listing_id));

create policy listing_photos_select
  on public.listing_photos for select
  using (
    exists (select 1 from public.listings l where l.id = listing_photos.listing_id and l.status = 'PUBLISHED')
    or private.owns_listing(listing_photos.listing_id)
    or private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin')
  );

create policy listing_photos_write
  on public.listing_photos for all
  using (private.owns_listing(listing_photos.listing_id))
  with check (private.owns_listing(listing_photos.listing_id));

-- Availability: readable for published listings (discovery) or by the owner and
-- admins; the owning agent maintains it. The booking service writes booked
-- nights through the service role.
create policy availability_select
  on public.availability for select
  using (
    exists (select 1 from public.listings l where l.id = availability.listing_id and l.status = 'PUBLISHED')
    or private.owns_listing(availability.listing_id)
    or private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'super_admin')
  );

create policy availability_write
  on public.availability for all
  using (private.owns_listing(availability.listing_id))
  with check (private.owns_listing(availability.listing_id));
