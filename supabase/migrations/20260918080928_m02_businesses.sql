-- M2 of the two-side platform: public.businesses, the operator entity and the
-- root of source attribution.
--
-- WHAT A BUSINESS IS. A hotel, a serviced-apartment operator, a guest house, a
-- resort, a shortlet operator or a restaurant, run by a person who signed up
-- as a Host. It is the row an accommodation (M3) or a restaurant profile (M7)
-- hangs off, the row the verified badge is derived through, and the row that
-- says where its inventory came from. Verification columns are deliberately
-- NOT here: the ladder lives in agent_verification_checks against the agent,
-- and a business points at that agent through agent_id.
--
-- THE OWNER CHECK. `(source = 'first_party') = (owner_id is not null)`: a
-- first-party business always has a human owner and a partner row never does.
-- Every v1 row is first_party, so owner_id is effectively NOT NULL today and
-- the widener phase adds nothing to this table but rows. `provider_name`,
-- `provider_ref` and `attribution` are deferred to Phase F on purpose: they
-- have no first-party meaning (TWO_MODE_BACKEND_RESEARCH 5.3).
--
-- THE BADGE. `agent_id` names the verified human. A partner row may not carry
-- one, and an example row may not carry a verified one: the badge means a
-- person was checked, and neither a feed nor a fixture was.
--
-- LOCATION follows the listings pattern exactly: latitude and longitude are
-- what the wizard writes, `location` is derived by trigger, and the GiST index
-- is partial on published rows with a pin. `private.sync_row_location` is the
-- body of `private.sync_listing_location` under a name that admits it is not
-- about listings, so M3, M8 and M9 can share it.
--
-- STATUS reuses the existing listing_status enum and its admin approval gate,
-- so the businesses queue is the listings queue with a different noun.
--
-- RLS: public SELECT of PUBLISHED rows only; the owner does everything to their
-- own rows; admins do everything. A signed-out visitor reading a restaurant
-- page is the first policy; the Host console is the second.

create or replace function private.sync_row_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Both or neither. A latitude with no longitude is not half a location.
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

comment on function private.sync_row_location() is
  'Keeps a location geography column in step with latitude and longitude on any table that carries all three. Same body as private.sync_listing_location; ST_MakePoint takes longitude then latitude.';

create table public.businesses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users (id) on delete cascade,
  -- The verified human behind a first-party business. The badge hangs here.
  agent_id    uuid references public.agents (id) on delete set null,
  kind        public.business_kind not null,
  name        text not null check (length(btrim(name)) between 2 and 120),
  slug        text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 140),
  description text check (description is null or length(description) <= 4000),
  source      public.source_kind not null default 'first_party',
  status      public.listing_status not null default 'DRAFT',
  -- Location. State is canonical; city, area and address match the listings shape.
  state_code  text references public.states (code),
  city        text,
  area        text,
  address     text,
  latitude    double precision check (latitude is null or latitude between -90 and 90),
  longitude   double precision check (longitude is null or longitude between -180 and 180),
  location    extensions.geography(Point, 4326),
  -- Never rendered raw on partner rows; on first-party rows the Host chooses.
  phone       text check (phone is null or phone ~ '^\+234[7-9][0-9]{9}$'),
  email       text check (email is null or (length(email) <= 160 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  is_demo     boolean not null default false,
  submitted_at timestamptz,
  reviewed_at  timestamptz,
  reviewer_id  uuid references auth.users (id) on delete set null,
  review_notes text,
  published_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- A first-party business has a human owner; a partner row never does.
  constraint businesses_owner_matches_source_chk
    check ((source = 'first_party') = (owner_id is not null)),
  -- The badge is derived through agent_id and only a first-party row may carry one.
  constraint businesses_partner_carries_no_agent_chk
    check (source = 'first_party' or agent_id is null)
);

comment on table public.businesses is
  'An operator: hotel, serviced apartments, guest house, resort, shortlet operator, restaurant or agency. Root of source attribution; accommodations and restaurant profiles hang off it. Verification lives on the agent it points at, never here.';

comment on column public.businesses.location is
  'Derived by businesses_location_sync from latitude and longitude. Never written directly.';

create unique index businesses_slug_key on public.businesses (slug);
create index businesses_kind_status_idx on public.businesses (kind, status);
create index businesses_owner_idx on public.businesses (owner_id);
create index businesses_agent_idx on public.businesses (agent_id);
create index businesses_state_idx on public.businesses (state_code, city);
create index businesses_reviewer_idx on public.businesses (reviewer_id);
create index businesses_location_gist
  on public.businesses using gist (location extensions.gist_geography_ops)
  where status = 'PUBLISHED' and location is not null;
create index businesses_name_trgm_idx
  on public.businesses using gin (name extensions.gin_trgm_ops)
  where status = 'PUBLISHED';

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

create trigger businesses_location_sync
  before insert or update of latitude, longitude on public.businesses
  for each row execute function private.sync_row_location();

-- An example business may not be attributed to a verified human, for the same
-- reason an example listing may not (20260809081841): the badge means a person
-- was checked, and a fixture is not a person.
create or replace function private.enforce_demo_business_has_unverified_agent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  agent_is_verified boolean;
begin
  if new.is_demo is not true or new.agent_id is null then
    return new;
  end if;

  select a.verified or a.verification_tier > 0
    into agent_is_verified
    from public.agents a
   where a.id = new.agent_id;

  if coalesce(agent_is_verified, false) then
    raise exception
      'An example business may not be attributed to a verified agent (agent %).', new.agent_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger businesses_demo_agent_is_unverified
  before insert or update of is_demo, agent_id on public.businesses
  for each row execute function private.enforce_demo_business_has_unverified_agent();

-- Does the current user own this business? In private so RLS on the child
-- tables (accommodations, photos, room types, inventory) can ask one question.
create function private.owns_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = target_business_id and b.owner_id = auth.uid()
  );
$$;

revoke execute on function private.owns_business(uuid) from public, anon;
grant  execute on function private.owns_business(uuid) to authenticated;

alter table public.businesses enable row level security;

create policy businesses_select_published
  on public.businesses for select
  using (status = 'PUBLISHED');

create policy businesses_owner_all
  on public.businesses for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy businesses_admin_all
  on public.businesses for all
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));
