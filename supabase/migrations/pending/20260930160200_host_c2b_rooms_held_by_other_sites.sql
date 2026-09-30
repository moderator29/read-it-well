-- HOST C2b (second draft): A BOOKING ON ANOTHER SITE HOLDS ONE ROOM, AND
-- EVERY WRITER RESPECTS THE HOLD (30 September 2026).
-- PENDING: written by the host build team for re-review, replacing the held
-- 20260930160000 draft (docs/MIGRATION_REVIEW_2026-09-30.md). Idempotent.
-- Adds one column to room_inventory and two to calendar_import_nights, three
-- functions and two triggers; replaces private.calendar_import_release and
-- public.apply_calendar_import (same signatures and grants). No row is
-- deleted, no column dropped, nothing about price or payment is touched.
--
-- WHAT WAS WRONG WITH THE LIVE C2 (20260930084937). One Airbnb booking of one
-- Deluxe room closed every rate plan of the room type that night, so Vallo
-- stopped selling all twelve Deluxe rooms.
-- WHAT WAS WRONG WITH THE FIRST C2b. It kept the hold only in the absolute
-- `units_open`, which (1) has no row beyond the 90-day horizon, (2) is
-- overwritten by the host's own writes, and (3) was never re-taken on a night
-- that was full at the first pull. Each lost the hold for good.
--
-- THE RULE NOW, ENFORCED WHERE EVERY WRITER PASSES:
--   rooms on sale  <=  rooms of the type  -  rooms held by other sites
-- where "rooms held" is the number of linked calendars that list the night
-- (`calendar_import_nights`, one room each). A BEFORE INSERT/UPDATE trigger on
-- room_inventory (`room_inventory_zz_respects_import_holds`) clamps every
-- write to that ceiling and records how many rooms it held back
-- (`units_held_back`), so:
--   * a row created later (the host opening nights 91+ days out) is born
--     clamped, because the hold is in the ledger, not in the row;
--   * a host's absolute write ("12 on sale") is treated as a request, clamped
--     to 11 while Airbnb holds one, and given its 12th room back only when the
--     hold ends; a host's deliberate lower number is never raised by a release;
--   * a night full of Vallo guests at the first pull is still held: the rule
--     is re-applied whenever a Vallo booking is released, so the room a
--     cancelling Vallo guest frees goes to the hold, not back on sale;
--   * never below what Vallo guests already hold (units_booked): a night where
--     the rule cannot be met is a conflict, told to the host once
--     (`conflict_told`), and told again only if it recurs after clearing.
-- FALLBACK, as the live C2 did: a night with no inventory row yet has its
-- rate plans closed (`plans_closed`), so nothing can price or reserve it. The
-- moment an inventory row is created for that night the clamp holds the room
-- and the import's closure is lifted (AFTER INSERT trigger), so the other
-- rooms are not kept off sale for nothing. A closure the host made is never
-- lifted (`was_closed`).
-- A whole-place listing is unchanged: one booking elsewhere is the whole
-- place (`availability`).
--
-- The behaviour is proven by supabase/tests/probes/calendar-holds.sql (a
-- night with no inventory row, a host upsert, a full night, a release).

-- --------------------------------------------------------------- columns

alter table public.room_inventory add column if not exists units_held_back integer not null default 0;
alter table public.room_inventory drop constraint if exists room_inventory_units_held_back_chk;
alter table public.room_inventory add constraint room_inventory_units_held_back_chk check (units_held_back >= 0);

alter table public.calendar_import_nights add column if not exists plans_closed boolean not null default false;
alter table public.calendar_import_nights add column if not exists conflict_told boolean not null default false;

do $$
begin
  -- Room-type nights written by the live C2 closed rate plans without saying
  -- so in `plans_closed`; the new release could not give them back. None
  -- existed when this was written (0 import nights on 30 September).
  if exists (select 1 from public.calendar_import_nights cin join public.calendar_imports ci on ci.id = cin.import_id
              where ci.room_type_id is not null and not cin.plans_closed and not cin.was_closed) then
    raise exception 'host c2b: room-type import nights from the first C2 exist; convert them by hand before applying';
  end if;
end $$;

-- ------------------------------------------------------ the hold and the rule

-- How many rooms of a type other sites hold on a night: one per linked
-- calendar that lists it.
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
  held      integer;
  requested integer;
  ceiling   integer;
  carried   boolean;
begin
  held := private.room_import_holds(new.room_type_id, new.date);
  -- A write that is not a new request carries the standing one forward: the
  -- booking functions (which move units_booked only) and this file's refresh.
  carried := tg_op = 'UPDATE' and (
    coalesce(current_setting('vallo.inventory_writer', true), '') in ('reserve_room_nights', 'release_room_nights')
    or coalesce(current_setting('vallo.import_hold_refresh', true), '') = 'on');
  if carried then
    requested := old.units_open + old.units_held_back;
  else
    requested := new.units_open;
  end if;
  if held = 0 then
    ceiling := requested;
  else
    select rt.units_total into total from public.room_types rt where rt.id = new.room_type_id;
    ceiling := greatest(coalesce(total, 0) - held, 0);
  end if;
  if carried then
    -- Never below the rooms Vallo guests hold.
    new.units_open := greatest(least(requested, ceiling), new.units_booked);
  else
    -- A host asking for fewer than are booked is still refused by the table's
    -- own CHECK, with the sentence the host already knows; the holds alone
    -- never push a night below its bookings.
    new.units_open := greatest(least(requested, ceiling), least(new.units_booked, requested));
  end if;
  new.units_held_back := greatest(requested - new.units_open, 0);
  return new;
end;
$function$;
revoke all on function private.room_inventory_respects_import_holds() from public, anon, authenticated;
-- Named to run after room_inventory_open_within_total, which checks the raw
-- request against the room total first.
drop trigger if exists room_inventory_zz_respects_import_holds on public.room_inventory;
create trigger room_inventory_zz_respects_import_holds
  before insert or update of units_open, units_booked on public.room_inventory
  for each row execute function private.room_inventory_respects_import_holds();

-- Re-apply the rule to one night after a hold starts or ends.
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

-- A night that had no inventory row was held by closing its rate plans. Once
-- a row exists the clamp holds the room, so the import's closure is lifted.
create or replace function private.room_inventory_takes_over_import_closures()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not exists (select 1 from public.calendar_import_nights cin join public.calendar_imports ci on ci.id = cin.import_id
                  where ci.room_type_id = new.room_type_id and cin.date = new.date and cin.plans_closed) then
    return null;
  end if;
  if not exists (select 1 from public.calendar_import_nights cin join public.calendar_imports ci on ci.id = cin.import_id
                  where ci.room_type_id = new.room_type_id and cin.date = new.date and cin.was_closed) then
    update public.rate_calendar rc set closed = false
     where rc.date = new.date and rc.closed
       and rc.rate_plan_id in (select rp.id from public.rate_plans rp where rp.room_type_id = new.room_type_id);
  end if;
  update public.calendar_import_nights cin set plans_closed = false
    from public.calendar_imports ci
   where ci.id = cin.import_id and ci.room_type_id = new.room_type_id and cin.date = new.date and cin.plans_closed;
  return null;
end;
$function$;
revoke all on function private.room_inventory_takes_over_import_closures() from public, anon, authenticated;
drop trigger if exists room_inventory_takes_over_import_closures on public.room_inventory;
create trigger room_inventory_takes_over_import_closures after insert on public.room_inventory
  for each row execute function private.room_inventory_takes_over_import_closures();

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
      -- The fallback closure goes when no other import still relies on it.
      if n.plans_closed and not n.was_closed
         and not exists (select 1 from public.calendar_import_nights o join public.calendar_imports oi on oi.id = o.import_id
                          where oi.room_type_id = i.room_type_id and o.date = n.date and o.plans_closed) then
        update public.rate_calendar rc set closed = false
         where rc.date = n.date and rc.closed
           and rc.rate_plan_id in (select rp.id from public.rate_plans rp where rp.room_type_id = i.room_type_id);
      end if;
      -- One hold fewer: the rule gives back what it held back, up to the request.
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
  closed_now  boolean;
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
      prior := exists (select 1 from public.rate_calendar rc join public.rate_plans rp on rp.id = rc.rate_plan_id
                        where rp.room_type_id = i.room_type_id and rc.date = d and rc.closed);
      closed_now := false;
      -- The hold is the row: record it first, so the rule counts it.
      insert into public.calendar_import_nights (import_id, date, was_closed) values (i.id, d, prior)
      on conflict (import_id, date) do nothing;
      if exists (select 1 from public.room_inventory ri where ri.room_type_id = i.room_type_id and ri.date = d) then
        perform private.refresh_import_holds(i.room_type_id, d);
      elsif not prior then
        -- No row yet: close the night on every plan until one exists.
        insert into public.rate_calendar (rate_plan_id, date, closed)
        select rp.id, d, true from public.rate_plans rp where rp.room_type_id = i.room_type_id
        on conflict (rate_plan_id, date) do update set closed = true;
        closed_now := true;
      end if;
      update public.calendar_import_nights set plans_closed = closed_now where import_id = i.id and date = d;
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
    -- Every night this import holds, not just the new ones: a night becomes a
    -- conflict when Vallo guests hold more rooms than the type has left after
    -- the holds. Told once; told again only if it clears and recurs.
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
  def text;
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'room_inventory' and column_name = 'units_held_back') then
    raise exception 'host c2b: room_inventory.units_held_back is missing';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'room_inventory_zz_respects_import_holds' and tgrelid = 'public.room_inventory'::regclass)
     or not exists (select 1 from pg_trigger where tgname = 'room_inventory_takes_over_import_closures' and tgrelid = 'public.room_inventory'::regclass) then
    raise exception 'host c2b: a room_inventory trigger is missing';
  end if;
  -- The clamp must run after the total check, so a request over the total is
  -- still refused rather than quietly clamped.
  if 'room_inventory_zz_respects_import_holds' < 'room_inventory_open_within_total' then
    raise exception 'host c2b: the hold trigger would run before the total check';
  end if;
  def := pg_get_functiondef('public.apply_calendar_import(uuid,date[],text)'::regprocedure);
  if position('refresh_import_holds' in def) = 0 or position('plans_closed' in def) = 0 or position('conflict_told' in def) = 0 then
    raise exception 'host c2b: apply_calendar_import is not the held-room version';
  end if;
  if has_function_privilege('authenticated', 'public.apply_calendar_import(uuid,date[],text)', 'execute')
     or has_function_privilege('authenticated', 'private.refresh_import_holds(uuid,date)', 'execute') then
    raise exception 'host c2b: a hold function is open to members';
  end if;
  -- With no import anywhere the rule must leave every existing row as it is.
  if exists (select 1 from public.room_inventory where units_held_back <> 0)
     and not exists (select 1 from public.calendar_import_nights) then
    raise exception 'host c2b: rooms are held back with no import';
  end if;
end $$;
