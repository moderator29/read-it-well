-- The three questions a Nigerian guest asks before the price.
--
-- Is there light. Is there water. Will they let me through the gate. No
-- competitor answers any of them structurally, and one "Backup Power" tick box
-- cannot tell a Band A feeder apart from a generator somebody runs from seven
-- to eleven. This has to land before the catalogue fills, because no agent is
-- going back through sixty listings to add a field.
--
-- POWER is two facts, not one. The grid band is what the distribution company
-- gives you and the backup is what the host does about it, and a guest needs
-- both: "Band A" with no backup and "rarely on" with a 24 hour generator are
-- opposite listings that a single column would flatten into the same answer.
-- The generator hours are a number because "generator" alone is the answer
-- that means nothing.
--
-- WATER is one closed list. Treated mains, a borehole, pumped storage and
-- tanker deliveries are genuinely different experiences and everybody here
-- knows which one they are looking at.
--
-- ACCESS IS NOT ON THIS TABLE, and that is the whole point. `listings` is
-- readable by the entire internet once PUBLISHED, so a gate code stored on it
-- would be a gate code published. It gets its own table whose select policy
-- names exactly three kinds of reader: the host, an admin, and a guest holding
-- a CONFIRMED booking on that listing. Until then the public page says the
-- estate has a gate and that the details arrive on confirmation, which is the
-- same "inspect before you pay" logic applied to arriving.
--
-- `private.owns_listing(target_listing_id uuid)` already existed and is reused
-- rather than redefined: `create or replace` cannot rename a parameter, and
-- dropping a function three other policies depend on to rename one argument
-- would be vandalism dressed as tidiness.

-- ---------------------------------------------------------------------------
-- Power and water, public facts
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'power_grid') then
    create type public.power_grid as enum ('BAND_A', 'MOSTLY_ON', 'PATCHY', 'RARELY', 'NONE');
  end if;
  if not exists (select 1 from pg_type where typname = 'power_backup') then
    create type public.power_backup as enum ('NONE', 'GENERATOR', 'INVERTER', 'SOLAR', 'GENERATOR_INVERTER');
  end if;
  if not exists (select 1 from pg_type where typname = 'water_supply') then
    create type public.water_supply as enum ('TREATED_MAINS', 'BOREHOLE', 'PUMPED_STORAGE', 'TANKER', 'NONE');
  end if;
end $$;

alter table public.listings
  add column if not exists power_grid          public.power_grid,
  add column if not exists power_backup        public.power_backup,
  add column if not exists power_backup_hours  smallint,
  add column if not exists water_supply        public.water_supply,
  add column if not exists prepaid_meter       boolean;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'listings_backup_hours_chk') then
    alter table public.listings
      add constraint listings_backup_hours_chk
      check (power_backup_hours is null or (power_backup_hours >= 0 and power_backup_hours <= 24));
  end if;
  -- Hours belong to a backup that exists. Claiming eight hours of nothing is
  -- not a typo a guest can spot, so the database refuses it.
  if not exists (select 1 from pg_constraint where conname = 'listings_backup_hours_need_backup_chk') then
    alter table public.listings
      add constraint listings_backup_hours_need_backup_chk
      check (
        power_backup_hours is null
        or (power_backup is not null and power_backup <> 'NONE')
      );
  end if;
end $$;

comment on column public.listings.power_grid is
  'What the distribution company gives this address. Null means the host has not said, which the UI shows as unanswered rather than as good news.';
comment on column public.listings.power_backup is
  'What the host does about the grid. Read together with power_backup_hours.';
comment on column public.listings.power_backup_hours is
  'Hours a day the backup actually runs, 0 to 24. Only meaningful with a backup, and the database enforces that.';
comment on column public.listings.water_supply is
  'Where the water comes from. A closed list, because four spellings of borehole cannot be filtered on.';
comment on column public.listings.prepaid_meter is
  'True when the unit is on a prepaid meter, which decides whether a guest can be asked to buy units.';

create index if not exists listings_power_idx on public.listings (power_grid, power_backup)
  where status = 'PUBLISHED';
create index if not exists listings_water_idx on public.listings (water_supply)
  where status = 'PUBLISHED';

-- ---------------------------------------------------------------------------
-- Getting through the gate, released on confirmation
-- ---------------------------------------------------------------------------

create table if not exists public.listing_access (
  listing_id      uuid primary key references public.listings (id) on delete cascade,
  estate_name     text,
  gate_directions text,
  security_phone  text,
  access_code     text,
  updated_at      timestamptz not null default now(),
  constraint listing_access_estate_len_chk     check (estate_name is null or length(estate_name) <= 120),
  constraint listing_access_directions_len_chk check (gate_directions is null or length(gate_directions) <= 600),
  constraint listing_access_phone_len_chk      check (security_phone is null or length(security_phone) <= 32),
  constraint listing_access_code_len_chk       check (access_code is null or length(access_code) <= 40)
);

comment on table public.listing_access is
  'How a guest actually gets in. Never public: read by the host, by an admin, and by a guest holding a CONFIRMED booking on the listing, and by nobody else.';

alter table public.listing_access enable row level security;

/*
 * One helper, so the rule lives in one place and every policy that needs it
 * asks the same question. Security definer because it reads bookings and
 * listings on behalf of a caller who may not be able to read either.
 */
create or replace function private.can_see_listing_access(p_listing uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select
    private.owns_listing(p_listing)
    or private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
    or exists (
      select 1
      from public.bookings b
      where b.listing_id = p_listing
        and b.guest_id = (select auth.uid())
        and b.status = 'CONFIRMED'
    );
$fn$;

revoke execute on function private.can_see_listing_access(uuid) from public;
grant execute on function private.can_see_listing_access(uuid) to authenticated;

drop policy if exists listing_access_select on public.listing_access;
create policy listing_access_select on public.listing_access for select
  using (private.can_see_listing_access(listing_id));

drop policy if exists listing_access_write_own on public.listing_access;
create policy listing_access_write_own on public.listing_access for insert
  with check (private.owns_listing(listing_id));

drop policy if exists listing_access_update_own on public.listing_access;
create policy listing_access_update_own on public.listing_access for update
  using (private.owns_listing(listing_id))
  with check (private.owns_listing(listing_id));

drop policy if exists listing_access_delete_own on public.listing_access;
create policy listing_access_delete_own on public.listing_access for delete
  using (private.owns_listing(listing_id));

drop policy if exists listing_access_admin on public.listing_access;
create policy listing_access_admin on public.listing_access for all
  using (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));

drop trigger if exists listing_access_set_updated_at on public.listing_access;
create trigger listing_access_set_updated_at
  before update on public.listing_access
  for each row execute function public.set_updated_at();

-- A guest asking "does this estate have a gate at all" must get an answer
-- before they book, without any of the details. One boolean on the public
-- table, kept in step by trigger so it can never disagree with the private row.
alter table public.listings
  add column if not exists has_estate_access boolean not null default false;

comment on column public.listings.has_estate_access is
  'True when a listing_access row carries anything a guest would need at the gate. Maintained by trigger; the details themselves are never on this table.';

create or replace function private.sync_listing_has_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  target uuid := coalesce(new.listing_id, old.listing_id);
  present boolean;
begin
  select exists (
    select 1 from public.listing_access la
    where la.listing_id = target
      and coalesce(nullif(btrim(la.estate_name), ''),
                   nullif(btrim(la.gate_directions), ''),
                   nullif(btrim(la.security_phone), ''),
                   nullif(btrim(la.access_code), '')) is not null
  ) into present;

  update public.listings set has_estate_access = present where id = target;
  return null;
end;
$fn$;

revoke execute on function private.sync_listing_has_access() from public, anon, authenticated;

drop trigger if exists listing_access_sync_flag on public.listing_access;
create trigger listing_access_sync_flag
  after insert or update or delete on public.listing_access
  for each row execute function private.sync_listing_has_access();
