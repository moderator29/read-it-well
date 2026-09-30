-- HOST C2b (third draft): A BOOKING ON ANOTHER SITE HOLDS ONE ROOM, AND
-- EVERY WRITER RESPECTS THE HOLD (30 September 2026).
-- PENDING: written by the host build team for re-review (rounds 2 and 3 in
-- docs/MIGRATION_REVIEW_2026-09-30.md). Idempotent. Adds columns to
-- room_inventory, rate_calendar and calendar_import_nights, four functions and
-- four triggers; replaces private.calendar_import_release and
-- public.apply_calendar_import (same signatures and grants). No row is
-- deleted, no column dropped. How a stay is priced does not change: pricing
-- and search read `rate_calendar.closed`, `units_open` and `units_booked`
-- exactly as before; this file only decides what those hold.
--
-- WHY. The live C2 (20260930084937) closed every rate plan of a room type for
-- one booking elsewhere, so one Airbnb booking took all twelve Deluxe rooms
-- off Vallo. The first C2b kept the hold only in the absolute `units_open`,
-- which later writes and missing rows lost.
--
-- THE RULE, ENFORCED WHERE EVERY WRITER PASSES:
--   rooms on sale  <=  rooms of the type  -  rooms held by other sites
-- where "held" counts the linked calendars that list the night
-- (`calendar_import_nights`, one room each).
--
--   room_inventory_zz_respects_import_holds, BEFORE UPDATE OF units_open,
--     units_booked, units_held_back: caps the write at `units_total - held`
--     ALWAYS (with or without a hold, so nothing can put more than the room
--     total on sale), never below the rooms Vallo guests hold, and records
--     how many rooms of the request it held back (`units_held_back`, which a
--     member can no longer forge: a direct write to it is recomputed).
--     A host's write is a request; a booking-function write or this file's
--     refresh carries the standing request (`units_open + units_held_back`),
--     so a cancelling Vallo guest's room goes to the hold, and a released
--     hold gives the host's rooms back up to what they asked, never more.
--   BEFORE INSERT: the proposed row is left as asked (units_held_back forced
--     to 0), so an UPSERT's conflict update sees the host's real request in
--     EXCLUDED, not a clamped copy. room_inventory_after_insert_holds then
--     clamps a genuinely inserted row at once, in the same statement.
--   Nights with no inventory row: the rate plans are closed, as the live C2
--     did, until a row exists; then the clamp holds the room and the import's
--     closure is lifted.
--   Closures carry their source. rate_calendar gains `host_closed` and
--     `import_closed`, with `closed = host_closed or import_closed`, kept by
--     a trigger: an import can only set or clear its own part (inside this
--     file, flagged), a host write sets only the host's part. So a second
--     import on a night the first closed never mistakes that for the host's
--     closure, and lifting an import's closure never reopens the host's.
--   Conflicts (Vallo guests hold more rooms than the holds leave) are told
--     once per night and told again only if they clear and recur.
-- A whole-place listing is unchanged (`availability`).
--
-- Proven by supabase/tests/pending/calendar-holds.sql (moves to probes/ once
-- this is applied): free night, plain update, UPSERT, forged units_held_back,
-- over-total request, a full night and a cancelled Vallo room, a night with
-- no row, two imports on a night with no row, host closure kept, release.

-- --------------------------------------------------------------- columns

alter table public.room_inventory add column if not exists units_held_back integer not null default 0;
alter table public.room_inventory drop constraint if exists room_inventory_units_held_back_chk;
alter table public.room_inventory add constraint room_inventory_units_held_back_chk check (units_held_back >= 0);

alter table public.calendar_import_nights add column if not exists plans_closed boolean not null default false;
alter table public.calendar_import_nights add column if not exists conflict_told boolean not null default false;

alter table public.rate_calendar add column if not exists host_closed boolean not null default false;
alter table public.rate_calendar add column if not exists import_closed boolean not null default false;
-- Every closure that exists today is a host's (or the seed's): no import
-- night existed when this was written.
update public.rate_calendar set host_closed = true where closed and not host_closed and not import_closed;

do $$
begin
  if exists (select 1 from public.calendar_import_nights cin join public.calendar_imports ci on ci.id = cin.import_id
              where ci.room_type_id is not null) then
    raise exception 'host c2b: room-type import nights from the live C2 exist; convert them by hand before applying';
  end if;
end $$;

-- ------------------------------------------------- closures carry a source

create or replace function private.rate_calendar_closure_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  flag text := coalesce(current_setting('vallo.import_closure', true), '');
begin
  if tg_op = 'INSERT' then
    if flag = 'close' then
      new.host_closed := false;
      new.import_closed := true;
    else
      new.host_closed := coalesce(new.closed, false) or coalesce(new.host_closed, false);
      new.import_closed := false;
    end if;
  elsif flag in ('close', 'open') then
    -- This file's own writes touch the import's part only.
    new.host_closed := old.host_closed;
    new.import_closed := (flag = 'close');
  else
    -- Anybody else: the host's part, from `host_closed` when it was written,
    -- else from `closed` when that changed; never the import's part.
    new.import_closed := old.import_closed;
    if new.host_closed is distinct from old.host_closed then
      null;
    elsif new.closed is distinct from old.closed then
      new.host_closed := new.closed;
    else
      new.host_closed := old.host_closed;
    end if;
  end if;
  new.closed := new.host_closed or new.import_closed;
  return new;
end;
$function$;
revoke all on function private.rate_calendar_closure_source() from public, anon, authenticated;
drop trigger if exists rate_calendar_closure_source on public.rate_calendar;
create trigger rate_calendar_closure_source before insert or update on public.rate_calendar
  for each row execute function private.rate_calendar_closure_source();

-- Close or lift the import's part of one night for every plan of a room type.
create or replace function private.set_import_closure(p_room_type uuid, p_date date, p_close boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform set_config('vallo.import_closure', case when p_close then 'close' else 'open' end, true);
  if p_close then
    insert into public.rate_calendar (rate_plan_id, date, closed)
    select rp.id, p_date, true from public.rate_plans rp where rp.room_type_id = p_room_type
    on conflict (rate_plan_id, date) do update set closed = true;
  else
    update public.rate_calendar rc set closed = false
     where rc.date = p_date and rc.import_closed
       and rc.rate_plan_id in (select rp.id from public.rate_plans rp where rp.room_type_id = p_room_type);
  end if;
  perform set_config('vallo.import_closure', '', true);
end;
$function$;
revoke all on function private.set_import_closure(uuid, date, boolean) from public, anon, authenticated;

-- ------------------------------------------------------ the hold and the rule

create or replace function private.room_import_holds(p_room_type uuid, p_date date)
returns integer
language sql
stable security definer
set search_path = ''
as $function$
  select count(*)::integer
    from public.calendar_import_nights cin
    join public.calendar_imports ci on ci.id = cin.import_id
   where ci.room_type_id = p_room_type and cin.date = p_date;
$function$;
revoke all on function private.room_import_holds(uuid, date) from public, anon, authenticated;

create or replace function private.room_inventory_respects_import_holds()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  total     integer;
  requested integer;
  ceiling   integer;
  carried   boolean;
begin
  if tg_op = 'INSERT' then
    -- Left as asked, so an upsert's conflict update sees the real request;
    -- a real insert is clamped by the AFTER INSERT trigger in this statement.
    new.units_held_back := 0;
    return new;
  end if;
  carried := coalesce(current_setting('vallo.inventory_writer', true), '') in ('reserve_room_nights', 'release_room_nights')
          or coalesce(current_setting('vallo.import_hold_refresh', true), '') = 'on';
  if carried then
    requested := old.units_open + old.units_held_back;
  else
    requested := new.units_open;
  end if;
  select rt.units_total into total from public.room_types rt where rt.id = new.room_type_id;
  requested := least(requested, coalesce(total, 0));
  ceiling := greatest(coalesce(total, 0) - private.room_import_holds(new.room_type_id, new.date), 0);
  if carried then
    new.units_open := greatest(least(requested, ceiling), new.units_booked);
  else
    -- Fewer than are booked is still refused by the table's CHECK, with the
    -- sentence the host knows; the holds alone never push below bookings.
    new.units_open := greatest(least(requested, ceiling), least(new.units_booked, requested));
  end if;
  new.units_held_back := greatest(requested - new.units_open, 0);
  return new;
end;
$function$;
revoke all on function private.room_inventory_respects_import_holds() from public, anon, authenticated;
drop trigger if exists room_inventory_zz_respects_import_holds on public.room_inventory;
create trigger room_inventory_zz_respects_import_holds
  before insert or update of units_open, units_booked, units_held_back on public.room_inventory
  for each row execute function private.room_inventory_respects_import_holds();

-- Re-apply the rule to one night (carrying the standing request).
create or replace function private.refresh_import_holds(p_room_type uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform set_config('vallo.import_hold_refresh', 'on', true);
  update public.room_inventory ri set units_open = ri.units_open
   where ri.room_type_id = p_room_type and ri.date = p_date;
  perform set_config('vallo.import_hold_refresh', '', true);
end;
$function$;
revoke all on function private.refresh_import_holds(uuid, date) from public, anon, authenticated;

-- A row just inserted: clamp it now, and lift the import's fallback closure,
-- which the clamp makes unnecessary.
create or replace function private.room_inventory_after_insert_holds()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  -- Rooms of a type no calendar is linked to need nothing (and a host opening
  -- a year of nights pays nothing for this trigger).
  if not exists (select 1 from public.calendar_imports ci where ci.room_type_id = new.room_type_id) then
    return null;
  end if;
  perform private.refresh_import_holds(new.room_type_id, new.date);
  if exists (select 1 from public.calendar_import_nights cin join public.calendar_imports ci on ci.id = cin.import_id
              where ci.room_type_id = new.room_type_id and cin.date = new.date and cin.plans_closed) then
    perform private.set_import_closure(new.room_type_id, new.date, false);
    update public.calendar_import_nights cin set plans_closed = false
      from public.calendar_imports ci
     where ci.id = cin.import_id and ci.room_type_id = new.room_type_id and cin.date = new.date and cin.plans_closed;
  end if;
  return null;
end;
$function$;
revoke all on function private.room_inventory_after_insert_holds() from public, anon, authenticated;
-- The second draft's name for the closure half of this trigger.
drop trigger if exists room_inventory_takes_over_import_closures on public.room_inventory;
drop function if exists private.room_inventory_takes_over_import_closures();
drop trigger if exists room_inventory_after_insert_holds on public.room_inventory;
create trigger room_inventory_after_insert_holds after insert on public.room_inventory
  for each row execute function private.room_inventory_after_insert_holds();

-- ------------------------------------------------------- pull and release

create or replace function private.calendar_import_release(p_import uuid, p_dates date[])
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  i        public.calendar_imports%rowtype;
  n        record;
  released integer := 0;
begin
  select * into i from public.calendar_imports where id = p_import;
  if i.id is null then return 0; end if;
  for n in
    delete from public.calendar_import_nights cin
     where cin.import_id = p_import and cin.date = any (p_dates)
    returning cin.date, cin.was_closed, cin.plans_closed
  loop
    released := released + 1;
    if i.room_type_id is not null then
      -- The import's closure goes when no other import still needs it; the
      -- host's own closure is a different part and is never touched.
      if not exists (select 1 from public.calendar_import_nights o join public.calendar_imports oi on oi.id = o.import_id
                      where oi.room_type_id = i.room_type_id and o.date = n.date and o.plans_closed) then
        perform private.set_import_closure(i.room_type_id, n.date, false);
      end if;
      perform private.refresh_import_holds(i.room_type_id, n.date);
    else
      continue when n.was_closed;
      continue when exists (select 1 from public.calendar_import_nights o join public.calendar_imports oi on oi.id = o.import_id
                             where oi.listing_id = i.listing_id and o.date = n.date);
      update public.availability av set status = 'available'
       where av.listing_id = i.listing_id and av.date = n.date and av.status = 'unavailable';
    end if;
  end loop;
  return released;
end;
$function$;
revoke all on function private.calendar_import_release(uuid, date[]) from public, anon, authenticated;

create or replace function public.apply_calendar_import(p_import uuid, p_nights date[], p_error text default null)
returns jsonb
language plpgsql
volatile security definer
set search_path = ''
as $function$
declare
  i           public.calendar_imports%rowtype;
  today       date := (now() at time zone 'Africa/Lagos')::date;
  wanted      date[];
  added       date[];
  dropped     date[];
  d           date;
  prior       boolean;
  has_row     boolean;
  v_conflicts integer := 0;
  v_new       integer := 0;
  place       text;
  site        text;
begin
  select * into i from public.calendar_imports where id = p_import for update;
  if i.id is null then return jsonb_build_object('status', 'not_found'); end if;

  site := case i.source when 'airbnb' then 'Airbnb' when 'booking_com' then 'Booking.com' else 'your other site' end;
  if i.room_type_id is not null then
    select ac.name || ', ' || rt.name into place from public.room_types rt
      join public.accommodations ac on ac.id = rt.accommodation_id where rt.id = i.room_type_id;
  else
    select l.title into place from public.listings l where l.id = i.listing_id;
  end if;

  if p_error is not null then
    update public.calendar_imports
       set last_attempt_at = now(), failures = failures + 1, last_error = left(p_error, 300)
     where id = i.id;
    if i.failures + 1 = 2 then
      perform private.notify(i.owner_id, 'booking'::public.notification_kind,
        'Calendar sync needs a look',
        'We could not read your ' || site || ' calendar for ' || coalesce(place, 'your room') ||
        ' twice in a row, so nights booked there are not being held on Vallo. Check the link in your calendar.',
        '/host/calendar');
    end if;
    return jsonb_build_object('status', 'failed', 'failures', i.failures + 1);
  end if;

  wanted := array(
    select distinct x from unnest(coalesce(p_nights, '{}'::date[])) as x
     where x >= today and x <= today + 540
     order by x limit 800);
  added := array(select x from unnest(wanted) x
                  where not exists (select 1 from public.calendar_import_nights c where c.import_id = i.id and c.date = x));
  dropped := array(select c.date from public.calendar_import_nights c
                    where c.import_id = i.id and c.date >= today and not (c.date = any (wanted)));

  -- Nights that have gone are forgotten without giving anything back.
  delete from public.calendar_import_nights c where c.import_id = i.id and c.date < today;
  perform private.calendar_import_release(i.id, dropped);

  foreach d in array added loop
    if i.room_type_id is not null then
      -- The hold is the row: record it first, so the rule counts it.
      insert into public.calendar_import_nights (import_id, date, was_closed) values (i.id, d, false)
      on conflict (import_id, date) do nothing;
      has_row := exists (select 1 from public.room_inventory ri where ri.room_type_id = i.room_type_id and ri.date = d);
      if has_row then
        perform private.refresh_import_holds(i.room_type_id, d);
      else
        -- No row yet: the import's part of the closure, until one exists.
        perform private.set_import_closure(i.room_type_id, d, true);
      end if;
      update public.calendar_import_nights set plans_closed = not has_row where import_id = i.id and date = d;
    else
      prior := exists (select 1 from public.availability av where av.listing_id = i.listing_id and av.date = d and av.status = 'unavailable')
               and not exists (select 1 from public.calendar_import_nights o join public.calendar_imports oi on oi.id = o.import_id
                                where oi.listing_id = i.listing_id and o.date = d);
      if exists (select 1 from public.availability av where av.listing_id = i.listing_id and av.date = d and av.status = 'booked')
         or exists (select 1 from public.bookings b where b.listing_id = i.listing_id and b.status in ('PENDING', 'CONFIRMED')
                     and b.check_in <= d and b.check_out > d) then
        v_new := v_new + 1;
      end if;
      insert into public.availability (listing_id, date, status) values (i.listing_id, d, 'unavailable')
      on conflict (listing_id, date) do update set status = 'unavailable' where public.availability.status = 'available';
      insert into public.calendar_import_nights (import_id, date, was_closed) values (i.id, d, prior)
      on conflict (import_id, date) do nothing;
    end if;
  end loop;

  if i.room_type_id is not null then
    -- Every night this import holds: a conflict is Vallo guests holding more
    -- rooms than the holds leave. Told once; again only if it clears and recurs.
    with nights as (
      select cin.date,
             exists (select 1 from public.room_inventory ri join public.room_types rt on rt.id = ri.room_type_id
                      where ri.room_type_id = i.room_type_id and ri.date = cin.date
                        and ri.units_booked > rt.units_total - private.room_import_holds(i.room_type_id, cin.date)) as clash,
             cin.conflict_told
        from public.calendar_import_nights cin
       where cin.import_id = i.id and cin.date >= today)
    select count(*) filter (where clash), count(*) filter (where clash and not conflict_told)
      into v_conflicts, v_new
      from nights;
    update public.calendar_import_nights cin
       set conflict_told = exists (select 1 from public.room_inventory ri join public.room_types rt on rt.id = ri.room_type_id
                                    where ri.room_type_id = i.room_type_id and ri.date = cin.date
                                      and ri.units_booked > rt.units_total - private.room_import_holds(i.room_type_id, cin.date))
     where cin.import_id = i.id and cin.date >= today;
  else
    v_conflicts := v_new;
  end if;

  update public.calendar_imports
     set last_attempt_at = now(), last_synced_at = now(), failures = 0, last_error = null,
         nights_blocked = (select count(*) from public.calendar_import_nights c where c.import_id = i.id),
         conflicts = v_conflicts
   where id = i.id;

  if v_new > 0 then
    perform private.notify(i.owner_id, 'booking'::public.notification_kind,
      'A night may be booked twice',
      coalesce(place, 'Your room') || ' is booked on Vallo on ' || v_new || ' night(s) that ' || site ||
      ' also shows as booked, with no room left over. Open your calendar and sort it out with the guests before they travel.',
      '/host/calendar');
  end if;

  return jsonb_build_object('status', 'ok', 'added', coalesce(cardinality(added), 0),
                            'released', coalesce(cardinality(dropped), 0), 'conflicts', v_conflicts);
end;
$function$;
revoke all on function public.apply_calendar_import(uuid, date[], text) from public, anon, authenticated;
grant execute on function public.apply_calendar_import(uuid, date[], text) to service_role;

-- ------------------------------------------------------------ read-back
do $$
declare
  def   text;
  names text[];
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'room_inventory' and column_name = 'units_held_back')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'rate_calendar' and column_name = 'import_closed') then
    raise exception 'host c2b: a column is missing';
  end if;
  -- The real BEFORE-trigger order on room_inventory (by name): the total
  -- check must see the raw request before the hold rule caps it.
  names := array(select t.tgname::text from pg_trigger t
                  where t.tgrelid = 'public.room_inventory'::regclass and not t.tgisinternal
                    and (t.tgtype & 2) = 2 order by t.tgname);
  if array_position(names, 'room_inventory_open_within_total') is null
     or array_position(names, 'room_inventory_zz_respects_import_holds') is null
     or array_position(names, 'room_inventory_zz_respects_import_holds') < array_position(names, 'room_inventory_open_within_total') then
    raise exception 'host c2b: the hold rule would run before the total check (%)', names;
  end if;
  -- The rule fires on a direct write to units_held_back, so it cannot be forged.
  if position('units_held_back' in pg_get_triggerdef((select oid from pg_trigger where tgname = 'room_inventory_zz_respects_import_holds'
                                                          and tgrelid = 'public.room_inventory'::regclass))) = 0 then
    raise exception 'host c2b: a direct write to units_held_back would not be recomputed';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'room_inventory_after_insert_holds' and tgrelid = 'public.room_inventory'::regclass)
     or not exists (select 1 from pg_trigger where tgname = 'rate_calendar_closure_source' and tgrelid = 'public.rate_calendar'::regclass) then
    raise exception 'host c2b: a trigger is missing';
  end if;
  if exists (select 1 from public.rate_calendar where closed is distinct from (host_closed or import_closed)) then
    raise exception 'host c2b: a rate_calendar closure has no source';
  end if;
  def := pg_get_functiondef('public.apply_calendar_import(uuid,date[],text)'::regprocedure);
  if position('set_import_closure' in def) = 0 or position('refresh_import_holds' in def) = 0 or position('conflict_told' in def) = 0 then
    raise exception 'host c2b: apply_calendar_import is not the held-room version';
  end if;
  if has_function_privilege('authenticated', 'public.apply_calendar_import(uuid,date[],text)', 'execute')
     or has_function_privilege('authenticated', 'private.refresh_import_holds(uuid,date)', 'execute')
     or has_function_privilege('authenticated', 'private.set_import_closure(uuid,date,boolean)', 'execute') then
    raise exception 'host c2b: a hold function is open to members';
  end if;
  if exists (select 1 from public.room_inventory where units_held_back <> 0)
     and not exists (select 1 from public.calendar_import_nights) then
    raise exception 'host c2b: rooms are held back with no import';
  end if;
end $$;
