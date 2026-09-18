-- M5 of the two-side platform: availability at stays scale, and the one
-- statement that makes overselling impossible.
--
-- WHY NOT public.availability. That table is one row per listing per night
-- with a three-value status, which is exactly right for a whole-place shortlet
-- and exactly wrong for "fourteen Deluxe Doubles, nine of them sold on
-- Friday". room_inventory is one row per room type per night carrying a count
-- offered and a count sold. Blackout is units_open = 0. A missing row is "not
-- offered", never "available"; the search treats absence as absence.
--
-- CONCURRENCY IS THE HOUSE METHOD: constraints and locks in the database, not
-- hope in the application. private.reserve_room_nights does ONE counted
-- UPDATE across the nights of the stay with `units_booked + rooms <=
-- units_open` in its WHERE. Postgres row-locks each night it touches; a
-- second transaction wanting the same night waits on that lock, re-evaluates
-- the WHERE when the first commits, finds the room gone and touches zero rows.
-- The function then compares rows touched with nights wanted and raises on
-- any difference, which rolls back whatever it did touch. Two guests tapping
-- Reserve on the last room in the same second: one holds it, one is told so.
-- The CHECK `units_booked <= units_open` is the backstop the way the GiST
-- exclusion is for bookings; the one-statement update is the lock. This is
-- proved in scripts/probes/m5_oversell.sh with two concurrent psql sessions,
-- and the captured run sits beside it.
--
-- MIN AND MAX STAY live on the rate plan and are checked here, so no caller
-- can hold three nights on a plan that sells seven-night blocks. With a plan
-- named, that plan's bounds and its closed nights apply; without one, some
-- active plan of the room type must admit a stay of that length.
--
-- units_booked IS WRITTEN ONLY BY THESE TWO FUNCTIONS. A trigger refuses any
-- other change to the column. The owner manages units_open (how many to sell
-- tonight) and never the count sold; a booking is the only thing that sells.
-- The functions mark their own writes with a transaction-local setting, which
-- is the same idea as escrow's audit trigger reading who is acting.
--
-- units_open <= units_total by trigger, in both directions: an inventory row
-- may not offer more rooms than the type has, and a room type may not shrink
-- below what an inventory row already offers.
--
-- THE DOOR. PostgREST cannot see the private schema, so a public pass-through
-- exists for each function, service_role only, on the model of
-- 20260809080815. A booking is never held from a browser.

create table public.room_inventory (
  room_type_id uuid not null references public.room_types (id) on delete cascade,
  date         date not null,
  units_open   integer not null check (units_open >= 0),
  units_booked integer not null default 0 check (units_booked >= 0 and units_booked <= units_open),
  updated_at   timestamptz not null default now(),
  primary key (room_type_id, date)
);

comment on table public.room_inventory is
  'One row per room type per night: units offered and units sold. Absent row means not offered. units_booked changes only through private.reserve_room_nights and private.release_room_nights.';

create index room_inventory_date_idx on public.room_inventory (date, room_type_id);

create trigger room_inventory_set_updated_at
  before update on public.room_inventory
  for each row execute function public.set_updated_at();

-- units_open never exceeds the room type's units_total.
create or replace function private.room_inventory_within_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  total integer;
begin
  select rt.units_total into total from public.room_types rt where rt.id = new.room_type_id;
  if total is null then
    raise exception 'inventory refers to a room type that does not exist'
      using errcode = 'foreign_key_violation';
  end if;
  if new.units_open > total then
    raise exception 'Only % room(s) of this type exist; % cannot be offered.', total, new.units_open
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger room_inventory_open_within_total
  before insert or update of units_open, room_type_id on public.room_inventory
  for each row execute function private.room_inventory_within_total();

-- And the other direction: a room type may not shrink below an offered night.
create or replace function private.room_type_total_covers_inventory()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  offered integer;
begin
  if new.units_total >= old.units_total then
    return new;
  end if;
  select max(ri.units_open) into offered from public.room_inventory ri where ri.room_type_id = new.id;
  if coalesce(offered, 0) > new.units_total then
    raise exception 'A night already offers % room(s) of this type; units_total cannot drop to %.', offered, new.units_total
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger room_types_total_covers_inventory
  before update of units_total on public.room_types
  for each row execute function private.room_type_total_covers_inventory();

-- units_booked is the booking functions' column and nobody else's.
create or replace function private.room_inventory_booked_by_function_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  writer text := current_setting('vallo.inventory_writer', true);
begin
  if writer in ('reserve_room_nights', 'release_room_nights') then
    return new;
  end if;
  if tg_op = 'INSERT' and new.units_booked <> 0 then
    raise exception 'units_booked starts at zero; only a booking sells a room.'
      using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' and new.units_booked is distinct from old.units_booked then
    raise exception 'units_booked is written only by reserve_room_nights and release_room_nights.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger room_inventory_booked_by_function_only
  before insert or update of units_booked on public.room_inventory
  for each row execute function private.room_inventory_booked_by_function_only();

-- >>> reserve_room_nights (the exact text scripts/probes/m5_oversell.sh loads)
create or replace function private.reserve_room_nights(
  p_room_type uuid,
  p_check_in  date,
  p_check_out date,
  p_rooms     integer,
  p_rate_plan uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  nights   integer;
  affected integer;
  plan     record;
begin
  if p_room_type is null or p_check_in is null or p_check_out is null then
    raise exception 'A hold needs a room type, a check-in and a check-out.' using errcode = '22023';
  end if;
  if p_check_out <= p_check_in then
    raise exception 'Check-out must be after check-in.' using errcode = '22023';
  end if;
  if p_rooms is null or p_rooms < 1 then
    raise exception 'A hold is for at least one room.' using errcode = '22023';
  end if;

  nights := p_check_out - p_check_in;

  if p_rate_plan is not null then
    select rp.room_type_id, rp.active, rp.min_stay_nights, rp.max_stay_nights
      into plan
      from public.rate_plans rp
     where rp.id = p_rate_plan;
    if plan.room_type_id is null then
      raise exception 'That rate plan no longer exists.' using errcode = 'P0002';
    end if;
    if plan.room_type_id <> p_room_type then
      raise exception 'That rate plan does not sell this room type.' using errcode = '22023';
    end if;
    if not plan.active then
      raise exception 'That rate plan is not on sale.' using errcode = '22023';
    end if;
    if nights < plan.min_stay_nights then
      raise exception 'This rate needs a stay of at least % night(s).', plan.min_stay_nights using errcode = '22023';
    end if;
    if plan.max_stay_nights is not null and nights > plan.max_stay_nights then
      raise exception 'This rate allows a stay of at most % night(s).', plan.max_stay_nights using errcode = '22023';
    end if;
    if exists (
      select 1 from public.rate_calendar rc
       where rc.rate_plan_id = p_rate_plan
         and rc.date >= p_check_in and rc.date < p_check_out
         and rc.closed
    ) then
      raise exception 'This rate is closed on one of those nights.' using errcode = '22023';
    end if;
  else
    if not exists (
      select 1 from public.rate_plans rp
       where rp.room_type_id = p_room_type
         and rp.active
         and rp.min_stay_nights <= nights
         and (rp.max_stay_nights is null or rp.max_stay_nights >= nights)
    ) then
      raise exception 'No rate on this room admits a stay of % night(s).', nights using errcode = '22023';
    end if;
  end if;

  perform set_config('vallo.inventory_writer', 'reserve_room_nights', true);

  -- THE ONE STATEMENT. Each night it touches is row-locked until commit; a
  -- rival waits, re-checks the WHERE, and touches nothing.
  update public.room_inventory ri
     set units_booked = ri.units_booked + p_rooms
   where ri.room_type_id = p_room_type
     and ri.date >= p_check_in
     and ri.date <  p_check_out
     and ri.units_booked + p_rooms <= ri.units_open;

  get diagnostics affected = row_count;

  perform set_config('vallo.inventory_writer', '', true);

  if affected <> nights then
    raise exception 'Only % of % night(s) had % room(s) free. Nothing was held.', affected, nights, p_rooms
      using errcode = 'check_violation',
            hint = 'The nights that were free are released with this error; try other dates or fewer rooms.';
  end if;

  return nights;
end;
$$;

comment on function private.reserve_room_nights(uuid, date, date, integer, uuid) is
  'Holds p_rooms of a room type for every night in [p_check_in, p_check_out) in one counted UPDATE. Raises, rolling the statement back, when any night falls short, so two concurrent holds on the last room cannot both succeed. Validates min and max stay from the rate plan (the named one, or any active one). Returns the number of nights held.';

create or replace function private.release_room_nights(
  p_room_type uuid,
  p_check_in  date,
  p_check_out date,
  p_rooms     integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  nights   integer;
  affected integer;
begin
  if p_room_type is null or p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'A release needs a room type and a check-in before a check-out.' using errcode = '22023';
  end if;
  if p_rooms is null or p_rooms < 1 then
    raise exception 'A release is for at least one room.' using errcode = '22023';
  end if;

  nights := p_check_out - p_check_in;

  perform set_config('vallo.inventory_writer', 'release_room_nights', true);

  update public.room_inventory ri
     set units_booked = ri.units_booked - p_rooms
   where ri.room_type_id = p_room_type
     and ri.date >= p_check_in
     and ri.date <  p_check_out
     and ri.units_booked >= p_rooms;

  get diagnostics affected = row_count;

  perform set_config('vallo.inventory_writer', '', true);

  if affected <> nights then
    raise exception 'Only % of % night(s) had % room(s) held to release. Nothing was released.', affected, nights, p_rooms
      using errcode = 'check_violation';
  end if;

  return nights;
end;
$$;

comment on function private.release_room_nights(uuid, date, date, integer) is
  'The inverse of reserve_room_nights: gives p_rooms back on every night of the range in one counted UPDATE, raising if any night did not hold that many.';
-- <<< reserve_room_nights

revoke all on function private.reserve_room_nights(uuid, date, date, integer, uuid) from public, anon, authenticated;
revoke all on function private.release_room_nights(uuid, date, date, integer) from public, anon, authenticated;

-- The doors. PostgREST cannot see private; the booking action reaches these
-- through the service role and nothing else.
create or replace function public.reserve_room_nights(
  p_room_type uuid,
  p_check_in  date,
  p_check_out date,
  p_rooms     integer,
  p_rate_plan uuid default null
)
returns integer
language sql
security definer
set search_path = public
as $$
  select private.reserve_room_nights(p_room_type, p_check_in, p_check_out, p_rooms, p_rate_plan);
$$;

create or replace function public.release_room_nights(
  p_room_type uuid,
  p_check_in  date,
  p_check_out date,
  p_rooms     integer
)
returns integer
language sql
security definer
set search_path = public
as $$
  select private.release_room_nights(p_room_type, p_check_in, p_check_out, p_rooms);
$$;

comment on function public.reserve_room_nights(uuid, date, date, integer, uuid) is
  'Pass-through to private.reserve_room_nights so the booking action can reach it. Service role only: a room is never held from a browser.';
comment on function public.release_room_nights(uuid, date, date, integer) is
  'Pass-through to private.release_room_nights. Service role only.';

revoke all on function public.reserve_room_nights(uuid, date, date, integer, uuid) from public, anon, authenticated;
revoke all on function public.release_room_nights(uuid, date, date, integer) from public, anon, authenticated;
grant execute on function public.reserve_room_nights(uuid, date, date, integer, uuid) to service_role;
grant execute on function public.release_room_nights(uuid, date, date, integer) to service_role;

alter table public.room_inventory enable row level security;

create policy room_inventory_select
  on public.room_inventory for select
  using (
    private.room_type_is_public(room_type_id)
    or private.owns_room_type(room_type_id)
    or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin')
  );

create policy room_inventory_owner_write
  on public.room_inventory for all
  using (private.owns_room_type(room_type_id) or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.owns_room_type(room_type_id) or private.has_role((select auth.uid()), 'admin') or private.has_role((select auth.uid()), 'super_admin'));
