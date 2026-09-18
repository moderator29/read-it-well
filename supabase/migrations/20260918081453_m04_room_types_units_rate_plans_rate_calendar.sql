-- M4 of the two-side platform: what an accommodation sells, and at what price.
--
-- ROOM TYPES are the unit of sale: "Deluxe Double, sleeps 2, 14 of them".
-- `category` is the filterable class beside the free-text name, because "twin"
-- has to be a query and not a LIKE (HOST_ONBOARDING_RESEARCH section 5).
-- `beds` is a jsonb array the application validates; nothing filters on it in
-- SQL. `units_total` is how many physical rooms of this type exist and is the
-- ceiling M5's inventory trigger enforces. `base_rate_minor` is the nightly
-- rate in kobo when no rate plan says otherwise. `status` reuses listing_status
-- so a room type is DRAFT until its Host says it is ready and PUBLISHED when
-- it may sell; there is no separate admin gate on a room type, the gate is on
-- the accommodation and the business above it.
--
-- UNITS are optional physical rooms ("Room 204") for operators who assign
-- them. V1 books by count, never by unit; the table exists so the console can
-- grow room assignment without a schema change. A seam, not a room.
--
-- RATE PLANS are how a room type is sold: with breakfast or without, free to
-- cancel or not, two nights minimum or one. `cancellation_policy_id` is NOT
-- NULL because a price without a cancellation rule is a price a guest cannot
-- judge. Rates are nightly kobo, NGN only by CHECK; a partner price in another
-- currency converts at the edge with the conversion recorded, never here.
--
-- RATE CALENDAR is the nightly override: a different price for a date, or a
-- closed date for the plan (a blackout that leaves the inventory untouched).
-- An absent row means the plan's own rate.
--
-- IS_DEMO on room types is copied from the accommodation by trigger, the same
-- way an accommodation copies from its business, so an example property's
-- rooms are examples and the demo-refusal trigger can read it off the row.
--
-- RLS. Public reads when the accommodation is on the shelf (both it and its
-- business PUBLISHED, via private.accommodation_is_public); the owner and
-- admins do everything. Rate calendars and rate plans read the same way,
-- because a stay page shows a signed-out visitor the price.

create table public.room_types (
  id               uuid primary key default gen_random_uuid(),
  accommodation_id uuid not null references public.accommodations (id) on delete cascade,
  name             text not null check (length(btrim(name)) between 2 and 80),
  category         public.room_category not null,
  description      text check (description is null or length(description) <= 2000),
  sleeps           smallint not null check (sleeps > 0 and sleeps <= 20),
  -- [{"kind": "double", "count": 1}, {"kind": "single", "count": 2}], validated in the app.
  beds             jsonb not null default '[]'::jsonb check (jsonb_typeof(beds) = 'array'),
  size_sqm         numeric(7, 2) check (size_sqm is null or size_sqm > 0),
  units_total      integer not null check (units_total > 0),
  base_rate_minor  bigint not null check (base_rate_minor >= 0),
  currency         text not null default 'NGN' check (currency = 'NGN'),
  status           public.listing_status not null default 'DRAFT',
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (accommodation_id, name)
);

comment on table public.room_types is
  'What an accommodation sells: a class of room with a count, a capacity and a base nightly rate in kobo. category is the filterable class beside the free-text name.';

create index room_types_accommodation_idx on public.room_types (accommodation_id, status);
create index room_types_category_idx on public.room_types (category) where status = 'PUBLISHED';

create trigger room_types_set_updated_at
  before update on public.room_types
  for each row execute function public.set_updated_at();

create or replace function private.sync_room_type_from_accommodation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_demo boolean;
begin
  select a.is_demo into parent_demo from public.accommodations a where a.id = new.accommodation_id;
  if parent_demo is null then
    raise exception 'room type refers to an accommodation that does not exist'
      using errcode = 'foreign_key_violation';
  end if;
  new.is_demo := new.is_demo or parent_demo;
  return new;
end;
$$;

create trigger room_types_sync_from_accommodation
  before insert or update of accommodation_id, is_demo on public.room_types
  for each row execute function private.sync_room_type_from_accommodation();

create or replace function private.fan_out_accommodation_demo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_demo and not old.is_demo then
    update public.room_types rt set is_demo = true where rt.accommodation_id = new.id;
  end if;
  return new;
end;
$$;

create trigger accommodations_fan_out_demo
  after update of is_demo on public.accommodations
  for each row execute function private.fan_out_accommodation_demo();

create table public.units (
  id           uuid primary key default gen_random_uuid(),
  room_type_id uuid not null references public.room_types (id) on delete cascade,
  label        text not null check (length(btrim(label)) between 1 and 40),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (room_type_id, label)
);

comment on table public.units is
  'Optional physical rooms of a room type ("Room 204"). V1 allocates by count, not by unit; this table is the seam for room assignment later.';

create index units_room_type_idx on public.units (room_type_id);

create trigger units_set_updated_at
  before update on public.units
  for each row execute function public.set_updated_at();

create table public.rate_plans (
  id                     uuid primary key default gen_random_uuid(),
  room_type_id           uuid not null references public.room_types (id) on delete cascade,
  name                   text not null check (length(btrim(name)) between 2 and 80),
  meal_plan              public.meal_plan not null default 'room_only',
  cancellation_policy_id uuid not null references public.cancellation_policies (id) on delete restrict,
  rate_minor             bigint not null check (rate_minor >= 0),
  currency               text not null default 'NGN' check (currency = 'NGN'),
  min_stay_nights        smallint not null default 1 check (min_stay_nights >= 1),
  max_stay_nights        smallint check (max_stay_nights is null or max_stay_nights >= min_stay_nights),
  active                 boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (room_type_id, name)
);

comment on table public.rate_plans is
  'How a room type is sold: meal plan, cancellation policy, nightly rate in kobo, stay bounds. A plan with no cancellation policy cannot exist.';

create index rate_plans_room_type_idx on public.rate_plans (room_type_id, active);
create index rate_plans_policy_idx on public.rate_plans (cancellation_policy_id);

create trigger rate_plans_set_updated_at
  before update on public.rate_plans
  for each row execute function public.set_updated_at();

create table public.rate_calendar (
  rate_plan_id uuid not null references public.rate_plans (id) on delete cascade,
  date         date not null,
  rate_minor   bigint check (rate_minor is null or rate_minor >= 0),
  closed       boolean not null default false,
  primary key (rate_plan_id, date)
);

comment on table public.rate_calendar is
  'Nightly overrides for a rate plan: a different price, or a closed night. An absent row means the plan''s own rate.';

-- Owner helper for the room-level tables.
create function private.owns_room_type(target_room_type_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_types rt
    join public.accommodations a on a.id = rt.accommodation_id
    join public.businesses b on b.id = a.business_id
    where rt.id = target_room_type_id and b.owner_id = auth.uid()
  );
$$;

revoke execute on function private.owns_room_type(uuid) from public;
grant  execute on function private.owns_room_type(uuid) to anon, authenticated;

-- Is this room type on the shelf? Its own status and its accommodation's shelf state.
create function private.room_type_is_public(target_room_type_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.room_types rt
    where rt.id = target_room_type_id
      and rt.status = 'PUBLISHED'
      and private.accommodation_is_public(rt.accommodation_id)
  );
$$;

revoke execute on function private.room_type_is_public(uuid) from public;
grant  execute on function private.room_type_is_public(uuid) to anon, authenticated;

alter table public.room_types    enable row level security;
alter table public.units         enable row level security;
alter table public.rate_plans    enable row level security;
alter table public.rate_calendar enable row level security;

create policy room_types_select
  on public.room_types for select
  using (
    (status = 'PUBLISHED' and private.accommodation_is_public(accommodation_id))
    or private.owns_accommodation(accommodation_id)
    or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin')
  );

create policy room_types_write
  on public.room_types for all
  using (private.owns_accommodation(accommodation_id) or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.owns_accommodation(accommodation_id) or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

-- Units are the operator's own business; nobody else reads a room number.
create policy units_owner_all
  on public.units for all
  using (private.owns_room_type(room_type_id) or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.owns_room_type(room_type_id) or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

create policy rate_plans_select
  on public.rate_plans for select
  using (
    private.room_type_is_public(room_type_id)
    or private.owns_room_type(room_type_id)
    or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin')
  );

create policy rate_plans_write
  on public.rate_plans for all
  using (private.owns_room_type(room_type_id) or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.owns_room_type(room_type_id) or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

create policy rate_calendar_select
  on public.rate_calendar for select
  using (
    exists (select 1 from public.rate_plans rp where rp.id = rate_calendar.rate_plan_id and private.room_type_is_public(rp.room_type_id))
    or exists (select 1 from public.rate_plans rp where rp.id = rate_calendar.rate_plan_id and private.owns_room_type(rp.room_type_id))
    or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin')
  );

create policy rate_calendar_write
  on public.rate_calendar for all
  using (
    exists (select 1 from public.rate_plans rp where rp.id = rate_calendar.rate_plan_id and private.owns_room_type(rp.room_type_id))
    or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin')
  )
  with check (
    exists (select 1 from public.rate_plans rp where rp.id = rate_calendar.rate_plan_id and private.owns_room_type(rp.room_type_id))
    or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin')
  );
