-- M3 of the two-side platform: accommodations, their photos and amenities, and
-- the storage bucket the photos land in.
--
-- WHAT AN ACCOMMODATION IS. One bookable property of a business: a hotel
-- building, a guest house, an aparthotel site. A business may run several. The
-- room types (M4) and the inventory (M5) hang off it; the shelf (M9) projects
-- it. Whole-place shortlets stay on `listings`; this table is for places that
-- sell rooms by count.
--
-- SOURCE IS DENORMALISED BY TRIGGER, NOT WRITTEN. A row must be self-describing
-- (every reader branches on `source` without a join), and it must agree with
-- its business. So the BEFORE trigger copies `businesses.source` over whatever
-- the writer supplied, and a change to the business's source fans out to its
-- accommodations. The same trigger carries `is_demo` down: an accommodation of
-- an example business is an example, whatever the writer said.
--
-- FULFILMENT. `source = 'first_party'` implies `fulfilment = 'vallo'`, as a
-- CHECK. In v1 every row is first party, so the CHECK is trivially true and
-- the column is the Model 2 seam HANDOFF_04 section 5 asks for, not a branch.
--
-- THE DEMO-REFUSAL TRIGGER IS EXTENDED HERE, before any booking can name an
-- accommodation. `public.refuse_transaction_on_demo_listing` read `new.listing_id`
-- directly, which is fine when every table it guards has that column and
-- breaks the day one gains `accommodation_id` instead. Reading the row as jsonb
-- lets one function guard both spines and any table that carries either
-- column. Existing behaviour on listing_id is unchanged, statement for
-- statement.
--
-- PHOTOS mirror listing_photos: up to ten, position 0 is the cover, one row
-- per position. The bucket `accommodation-photos` is public with the same
-- 10MB image ceiling as `listing-photos`, and the same path convention: the
-- first folder is the uploader's user id, which is what the owner policies
-- check.
--
-- RLS. Accommodations: public read of PUBLISHED rows; the business owner does
-- everything to their own; admins everything. Photos and amenities: readable
-- when the parent is published, or by the owner, or by an admin; written by
-- the owner and admins.

create table public.accommodations (
  id                     uuid primary key default gen_random_uuid(),
  business_id            uuid not null references public.businesses (id) on delete cascade,
  name                   text not null check (length(btrim(name)) between 2 and 120),
  slug                   text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 140),
  description            text check (description is null or length(description) <= 6000),
  -- Copied from the business by trigger. Never trusted from the writer.
  source                 public.source_kind not null default 'first_party',
  fulfilment             public.fulfilment_mode not null default 'vallo',
  star_rating            smallint check (star_rating is null or star_rating between 1 and 5),
  check_in_from          time,
  check_out_by           time,
  house_rules            text check (house_rules is null or length(house_rules) <= 4000),
  cancellation_policy_id uuid references public.cancellation_policies (id) on delete set null,
  status                 public.listing_status not null default 'DRAFT',
  -- Location, the listings shape.
  state_code             text references public.states (code),
  city                   text,
  area                   text,
  address                text,
  latitude               double precision check (latitude is null or latitude between -90 and 90),
  longitude              double precision check (longitude is null or longitude between -180 and 180),
  location               extensions.geography(Point, 4326),
  featured               boolean not null default false,
  is_demo                boolean not null default false,
  submitted_at           timestamptz,
  reviewed_at            timestamptz,
  reviewer_id            uuid references auth.users (id) on delete set null,
  review_notes           text,
  published_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- First party is fulfilled by Vallo. The seam for Model 2, not a branch today.
  constraint accommodations_first_party_is_vallo_chk
    check (source <> 'first_party' or fulfilment = 'vallo')
);

comment on table public.accommodations is
  'One bookable property of a business, selling rooms by count. source and is_demo are copied from the business by trigger so the row is self-describing and cannot disagree with its parent.';

comment on column public.accommodations.location is
  'Derived by accommodations_location_sync from latitude and longitude. Never written directly.';

create unique index accommodations_slug_key on public.accommodations (slug);
create index accommodations_business_idx on public.accommodations (business_id);
create index accommodations_status_idx on public.accommodations (status);
create index accommodations_policy_idx on public.accommodations (cancellation_policy_id);
create index accommodations_reviewer_idx on public.accommodations (reviewer_id);
create index accommodations_state_idx on public.accommodations (state_code, city);
create index accommodations_location_gist
  on public.accommodations using gist (location extensions.gist_geography_ops)
  where status = 'PUBLISHED' and location is not null;
create index accommodations_name_trgm_idx
  on public.accommodations using gin (name extensions.gin_trgm_ops)
  where status = 'PUBLISHED';

create trigger accommodations_set_updated_at
  before update on public.accommodations
  for each row execute function public.set_updated_at();

create trigger accommodations_location_sync
  before insert or update of latitude, longitude on public.accommodations
  for each row execute function private.sync_row_location();

-- source and is_demo come from the business, always.
create or replace function private.sync_accommodation_from_business()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_source public.source_kind;
  parent_demo   boolean;
begin
  select b.source, b.is_demo into parent_source, parent_demo
    from public.businesses b
   where b.id = new.business_id;

  if parent_source is null then
    raise exception 'accommodation refers to a business that does not exist'
      using errcode = 'foreign_key_violation';
  end if;

  new.source  := parent_source;
  new.is_demo := new.is_demo or parent_demo;
  return new;
end;
$$;

create trigger accommodations_sync_from_business
  before insert or update of business_id, source, is_demo on public.accommodations
  for each row execute function private.sync_accommodation_from_business();

-- The other direction: a business whose source or demo flag changes carries
-- its accommodations with it.
create or replace function private.fan_out_business_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source is distinct from old.source or new.is_demo is distinct from old.is_demo then
    update public.accommodations a
       set source  = new.source,
           is_demo = a.is_demo or new.is_demo
     where a.business_id = new.id;
  end if;
  return new;
end;
$$;

create trigger businesses_fan_out_source
  after update of source, is_demo on public.businesses
  for each row execute function private.fan_out_business_source();

create table public.accommodation_photos (
  id               uuid primary key default gen_random_uuid(),
  accommodation_id uuid not null references public.accommodations (id) on delete cascade,
  storage_path     text not null,
  -- Position 0 is the cover, as on listing_photos.
  position         integer not null default 0 check (position >= 0 and position < 10),
  created_at       timestamptz not null default now(),
  unique (accommodation_id, position)
);

comment on table public.accommodation_photos is 'Up to 10 photos per accommodation. Position 0 is the cover.';

create table public.accommodation_amenities (
  accommodation_id uuid not null references public.accommodations (id) on delete cascade,
  amenity_id       uuid not null references public.amenities (id) on delete cascade,
  primary key (accommodation_id, amenity_id)
);

create index accommodation_amenities_amenity_idx on public.accommodation_amenities (amenity_id);

-- Owner helpers for the child tables.
create function private.owns_accommodation(target_accommodation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.accommodations a
    join public.businesses b on b.id = a.business_id
    where a.id = target_accommodation_id and b.owner_id = auth.uid()
  );
$$;

revoke execute on function private.owns_accommodation(uuid) from public, anon;
grant  execute on function private.owns_accommodation(uuid) to authenticated;

-- Is this accommodation on the public shelf? Its own status, and its
-- business's, both PUBLISHED. Used by every child-table read policy so that
-- suspending a business takes its rooms off the shelf with it.
create function private.accommodation_is_public(target_accommodation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.accommodations a
    join public.businesses b on b.id = a.business_id
    where a.id = target_accommodation_id
      and a.status = 'PUBLISHED'
      and b.status = 'PUBLISHED'
  );
$$;

revoke execute on function private.accommodation_is_public(uuid) from public;
grant  execute on function private.accommodation_is_public(uuid) to anon, authenticated;

alter table public.accommodations         enable row level security;
alter table public.accommodation_photos   enable row level security;
alter table public.accommodation_amenities enable row level security;

create policy accommodations_select_published
  on public.accommodations for select
  using (status = 'PUBLISHED');

create policy accommodations_owner_all
  on public.accommodations for all
  using (private.owns_business(business_id))
  with check (private.owns_business(business_id));

create policy accommodations_admin_all
  on public.accommodations for all
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

create policy accommodation_photos_select
  on public.accommodation_photos for select
  using (
    private.accommodation_is_public(accommodation_id)
    or private.owns_accommodation(accommodation_id)
    or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin')
  );

create policy accommodation_photos_write
  on public.accommodation_photos for all
  using (private.owns_accommodation(accommodation_id) or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.owns_accommodation(accommodation_id) or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

create policy accommodation_amenities_select
  on public.accommodation_amenities for select
  using (
    private.accommodation_is_public(accommodation_id)
    or private.owns_accommodation(accommodation_id)
    or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin')
  );

create policy accommodation_amenities_write
  on public.accommodation_amenities for all
  using (private.owns_accommodation(accommodation_id) or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.owns_accommodation(accommodation_id) or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

/* ------------------------------------------------ the demo-refusal trigger

   Same function, same four triggers, one more column it knows how to read.
   `to_jsonb(new)` makes a missing column a null rather than an error, so the
   function can sit on a table that has listing_id, accommodation_id or both.
   -------------------------------------------------------------------------- */
create or replace function public.refuse_transaction_on_demo_listing()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  row_data jsonb := to_jsonb(new);
  target uuid;
  demo boolean;
begin
  target := (row_data ->> 'listing_id')::uuid;
  if target is not null then
    select l.is_demo into demo from public.listings l where l.id = target;
    if coalesce(demo, false) then
      raise exception
        'This listing is an example of what the catalogue will hold. No such property is available, so nothing can be arranged against it.'
        using errcode = 'check_violation',
              hint = 'Only listings with is_demo = false can carry a booking, an inspection or a review.';
    end if;
  end if;

  target := (row_data ->> 'accommodation_id')::uuid;
  if target is not null then
    select a.is_demo into demo from public.accommodations a where a.id = target;
    if coalesce(demo, false) then
      raise exception
        'This property is an example of what the catalogue will hold. No such property is available, so nothing can be arranged against it.'
        using errcode = 'check_violation',
              hint = 'Only accommodations with is_demo = false can carry a booking or a review.';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.refuse_transaction_on_demo_listing() is
  'Refuses any row that points a booking, inspection or review at an example '
  'listing or an example accommodation. Reads the row as jsonb so it can guard '
  'a table carrying either column. Payment and escrow are covered transitively, '
  'because both hang off a booking.';

/* ---------------------------------------------------------- the bucket */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'accommodation-photos',
  'accommodation-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "accommodation photos public read"
  on storage.objects for select
  using (bucket_id = 'accommodation-photos');

create policy "accommodation photos owner insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'accommodation-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "accommodation photos owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'accommodation-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'accommodation-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "accommodation photos owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'accommodation-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
