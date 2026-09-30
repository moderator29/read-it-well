-- HOST C2: CALENDAR SYNC WITH OTHER BOOKING SITES, iCAL OUT AND iCAL IN
-- (30 September 2026). Applied 30 September 2026 with the founder's approval.
-- Idempotent, additive: three new tables, five new functions, no
-- existing table, row, policy or function is changed or dropped.
--
-- WHY. A Lagos shortlet or hotel host almost always lists on Airbnb or
-- Booking.com too. Nothing on Vallo read or wrote a calendar feed, so a night
-- booked elsewhere stayed open here until the host remembered, and the first
-- double booking would land on the Guarantee.
--
-- WHAT THIS ADDS
--   public.calendar_feeds          one secret feed per room type (or listing):
--                                  the token is the capability in the URL
--                                  `/api/calendar/feed?t=<token>`. Owner-only.
--   public.calendar_imports        another site's .ics link per room type (or
--                                  listing), with its last pull and failures.
--                                  Owner reads, adds and switches it on or
--                                  off; removal goes through
--                                  `remove_calendar_import` so its nights are
--                                  given back.
--   public.calendar_import_nights  the nights each import is holding shut,
--                                  and whether the night was already closed
--                                  by the host before (`was_closed`), so a
--                                  night the feed drops is reopened only when
--                                  the feed closed it.
--   public.calendar_feed(token)    the export: nights taken on Vallo, never a
--                                  guest's name. anon may call it; the token
--                                  is the whole key.
--   public.calendar_imports_due    the scheduler's list (service role only).
--   public.apply_calendar_import   one pull's result, applied atomically
--                                  (service role only): closes the new nights,
--                                  reopens the dropped ones, counts nights
--                                  already booked on Vallo as conflicts, and
--                                  tells the host after two failed pulls.
--   public.remove_calendar_import  the owner's removal, nights given back.
--
-- WHAT A BLOCKED NIGHT IS. For a room type: `rate_calendar.closed` on every
-- rate plan it has, the same closure the host's own calendar writes and the
-- one `private.price_room_booking` and `stays_search` already refuse. For a
-- listing: `availability.status = 'unavailable'` (only a night that was
-- 'available'; a night booked on Vallo is never touched). No booking,
-- payment, split or settlement is read for money or written. How a stay is
-- priced does not change.
--
-- WHAT THE EXPORT LEAVES OUT: nights closed only because another site's feed
-- closed them, so two sites never echo each other's blocks back and forth.
--
-- THE APP SIDE: `/host/calendar` (sync panel), `/api/calendar/feed`, and the
-- scheduled job `/api/cron/calendar-sync` behind CALENDAR_SYNC_ENABLED (off by
-- default), every CALENDAR_SYNC_INTERVAL_MINUTES (30 by default). Until this
-- file is applied the sync panel says sync is not switched on yet, the feed
-- answers 404 and the job reports "not installed".

-- ---------------------------------------------------------------- tables

create table if not exists public.calendar_feeds (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  room_type_id  uuid references public.room_types (id) on delete cascade,
  listing_id    uuid references public.listings (id) on delete cascade,
  token         text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  created_at    timestamptz not null default now(),
  last_read_at  timestamptz,
  constraint calendar_feeds_one_target_chk check ((room_type_id is null) <> (listing_id is null)),
  constraint calendar_feeds_token_chk check (token ~ '^[0-9a-f]{64}$')
);
create unique index if not exists calendar_feeds_token_key on public.calendar_feeds (token);
create unique index if not exists calendar_feeds_room_type_key on public.calendar_feeds (room_type_id) where room_type_id is not null;
create unique index if not exists calendar_feeds_listing_key on public.calendar_feeds (listing_id) where listing_id is not null;
create index if not exists calendar_feeds_owner_idx on public.calendar_feeds (owner_id);

create table if not exists public.calendar_imports (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  room_type_id     uuid references public.room_types (id) on delete cascade,
  listing_id       uuid references public.listings (id) on delete cascade,
  source           text not null,
  url              text not null,
  enabled          boolean not null default true,
  created_at       timestamptz not null default now(),
  last_attempt_at  timestamptz,
  last_synced_at   timestamptz,
  last_error       text,
  failures         integer not null default 0,
  nights_blocked   integer not null default 0,
  conflicts        integer not null default 0,
  constraint calendar_imports_one_target_chk check ((room_type_id is null) <> (listing_id is null)),
  constraint calendar_imports_source_chk check (source in ('airbnb', 'booking_com', 'other')),
  constraint calendar_imports_url_chk check (url ~ '^https://[^\s]+$' and char_length(url) <= 2000),
  constraint calendar_imports_error_chk check (last_error is null or char_length(last_error) <= 300)
);
create unique index if not exists calendar_imports_room_type_url_key on public.calendar_imports (room_type_id, url) where room_type_id is not null;
create unique index if not exists calendar_imports_listing_url_key on public.calendar_imports (listing_id, url) where listing_id is not null;
create index if not exists calendar_imports_owner_idx on public.calendar_imports (owner_id);
create index if not exists calendar_imports_due_idx on public.calendar_imports (last_attempt_at nulls first) where enabled;

create table if not exists public.calendar_import_nights (
  import_id   uuid not null references public.calendar_imports (id) on delete cascade,
  date        date not null,
  was_closed  boolean not null default false,
  primary key (import_id, date)
);
create index if not exists calendar_import_nights_date_idx on public.calendar_import_nights (date);

alter table public.calendar_feeds enable row level security;
alter table public.calendar_imports enable row level security;
alter table public.calendar_import_nights enable row level security;

revoke all on public.calendar_feeds from anon, authenticated;
revoke all on public.calendar_imports from anon, authenticated;
revoke all on public.calendar_import_nights from anon, authenticated;
grant select, delete on public.calendar_feeds to authenticated;
grant insert (room_type_id, listing_id) on public.calendar_feeds to authenticated;
grant select on public.calendar_imports to authenticated;
grant insert (room_type_id, listing_id, source, url) on public.calendar_imports to authenticated;
grant update (enabled) on public.calendar_imports to authenticated;
grant select on public.calendar_import_nights to authenticated;

-- A target is the caller's own when it is one of their room types or listings.
create or replace function private.owns_calendar_target(p_room_type uuid, p_listing uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $function$
  select (select auth.uid()) is not null and (
    (p_room_type is not null and p_room_type in (select private.my_room_type_ids()))
    or (p_listing is not null and p_listing in (select private.my_listing_ids())));
$function$;
revoke all on function private.owns_calendar_target(uuid, uuid) from public, anon;
grant execute on function private.owns_calendar_target(uuid, uuid) to authenticated;

drop policy if exists calendar_feeds_owner_select on public.calendar_feeds;
create policy calendar_feeds_owner_select on public.calendar_feeds for select to authenticated
  using (owner_id = (select auth.uid()) and private.owns_calendar_target(room_type_id, listing_id));
drop policy if exists calendar_feeds_owner_insert on public.calendar_feeds;
create policy calendar_feeds_owner_insert on public.calendar_feeds for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.owns_calendar_target(room_type_id, listing_id));
drop policy if exists calendar_feeds_owner_delete on public.calendar_feeds;
create policy calendar_feeds_owner_delete on public.calendar_feeds for delete to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists calendar_imports_owner_select on public.calendar_imports;
create policy calendar_imports_owner_select on public.calendar_imports for select to authenticated
  using (owner_id = (select auth.uid()) and private.owns_calendar_target(room_type_id, listing_id));
drop policy if exists calendar_imports_owner_insert on public.calendar_imports;
create policy calendar_imports_owner_insert on public.calendar_imports for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.owns_calendar_target(room_type_id, listing_id));
drop policy if exists calendar_imports_owner_update on public.calendar_imports;
create policy calendar_imports_owner_update on public.calendar_imports for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and private.owns_calendar_target(room_type_id, listing_id));

drop policy if exists calendar_import_nights_owner_select on public.calendar_import_nights;
create policy calendar_import_nights_owner_select on public.calendar_import_nights for select to authenticated
  using (exists (select 1 from public.calendar_imports i where i.id = import_id and i.owner_id = (select auth.uid())));

-- At most five other sites per room type or listing: a typo guard, and a cap
-- on how much one host can ask the scheduler to fetch.
create or replace function private.calendar_imports_capped()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select count(*) from public.calendar_imports i
       where (new.room_type_id is not null and i.room_type_id = new.room_type_id)
          or (new.listing_id is not null and i.listing_id = new.listing_id)) >= 5 then
    raise exception 'calendar_imports_cap: at most five calendars can be linked to one room or listing'
      using errcode = '23514';
  end if;
  return new;
end;
$function$;
revoke all on function private.calendar_imports_capped() from public, anon, authenticated;
drop trigger if exists calendar_imports_capped on public.calendar_imports;
create trigger calendar_imports_capped before insert on public.calendar_imports
  for each row execute function private.calendar_imports_capped();

-- ------------------------------------------------------ the export feed

create or replace function public.calendar_feed(p_token text)
returns jsonb
language plpgsql
volatile security definer
set search_path = ''
as $function$
declare
  f       public.calendar_feeds%rowtype;
  today   date := (now() at time zone 'Africa/Lagos')::date;
  v_title  text;
  v_nights jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'not_found');
  end if;
  select * into f from public.calendar_feeds where token = p_token;
  if f.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  if f.room_type_id is not null then
    select ac.name || ', ' || rt.name into v_title
      from public.room_types rt join public.accommodations ac on ac.id = rt.accommodation_id
     where rt.id = f.room_type_id;
    select coalesce(jsonb_agg(jsonb_build_object('date', n.d, 'kind', n.kind) order by n.d), '[]'::jsonb)
      into v_nights
      from (
        select d::date as d,
               case
                 when ri.units_open > 0 and ri.units_booked >= ri.units_open then 'booked'
                 when ri.units_open = 0 then 'closed'
                 when exists (select 1 from public.rate_plans rp where rp.room_type_id = f.room_type_id and rp.active)
                      and not exists (
                        select 1 from public.rate_plans rp
                         where rp.room_type_id = f.room_type_id and rp.active
                           and not exists (select 1 from public.rate_calendar rc
                                            where rc.rate_plan_id = rp.id and rc.date = d::date and rc.closed))
                   then 'closed'
               end as kind
          from generate_series(today - 30, today + 365, interval '1 day') as d
          left join public.room_inventory ri on ri.room_type_id = f.room_type_id and ri.date = d::date
      ) n
     where n.kind is not null
       and (n.kind = 'booked' or not exists (
             select 1 from public.calendar_import_nights cin
               join public.calendar_imports ci on ci.id = cin.import_id
              where ci.room_type_id = f.room_type_id and cin.date = n.d and not cin.was_closed));
  else
    select l.title into v_title from public.listings l where l.id = f.listing_id;
    select coalesce(jsonb_agg(jsonb_build_object('date', n.d, 'kind', n.kind) order by n.d), '[]'::jsonb)
      into v_nights
      from (
        select d::date as d,
               case
                 when exists (select 1 from public.bookings b
                               where b.listing_id = f.listing_id and b.status in ('PENDING', 'CONFIRMED')
                                 and b.check_in <= d::date and b.check_out > d::date) then 'booked'
                 when av.status = 'booked' then 'booked'
                 when av.status = 'unavailable' then 'closed'
               end as kind
          from generate_series(today - 30, today + 365, interval '1 day') as d
          left join public.availability av on av.listing_id = f.listing_id and av.date = d::date
      ) n
     where n.kind is not null
       and (n.kind = 'booked' or not exists (
             select 1 from public.calendar_import_nights cin
               join public.calendar_imports ci on ci.id = cin.import_id
              where ci.listing_id = f.listing_id and cin.date = n.d and not cin.was_closed));
  end if;

  if f.last_read_at is null or f.last_read_at < now() - interval '5 minutes' then
    update public.calendar_feeds set last_read_at = now() where id = f.id;
  end if;

  return jsonb_build_object('status', 'ok', 'title', coalesce(v_title, 'Vallo'), 'nights', coalesce(v_nights, '[]'::jsonb));
end;
$function$;
revoke all on function public.calendar_feed(text) from public;
grant execute on function public.calendar_feed(text) to anon, authenticated, service_role;

-- ------------------------------------------------ the scheduler's side

create or replace function public.calendar_imports_due(p_interval interval default interval '30 minutes', p_limit integer default 50)
returns table (id uuid, url text, source text)
language sql
stable security definer
set search_path = ''
as $function$
  select i.id, i.url, i.source
    from public.calendar_imports i
   where i.enabled
     and (i.last_attempt_at is null or i.last_attempt_at < now() - greatest(coalesce(p_interval, interval '30 minutes'), interval '10 minutes'))
   order by i.last_attempt_at nulls first, i.created_at
   limit least(greatest(coalesce(p_limit, 50), 1), 200);
$function$;
revoke all on function public.calendar_imports_due(interval, integer) from public, anon, authenticated;
grant execute on function public.calendar_imports_due(interval, integer) to service_role;

-- Give back the nights an import was holding: reopen each one it closed,
-- unless the host had closed it first or another import still holds it.
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
    returning cin.date, cin.was_closed
  loop
    released := released + 1;
    continue when n.was_closed;
    if i.room_type_id is not null then
      continue when exists (select 1 from public.calendar_import_nights o join public.calendar_imports oi on oi.id = o.import_id
                             where oi.room_type_id = i.room_type_id and o.date = n.date);
      update public.rate_calendar rc set closed = false
       where rc.date = n.date and rc.closed
         and rc.rate_plan_id in (select rp.id from public.rate_plans rp where rp.room_type_id = i.room_type_id);
    else
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
  i          public.calendar_imports%rowtype;
  today      date := (now() at time zone 'Africa/Lagos')::date;
  wanted     date[];
  added      date[];
  dropped    date[];
  d          date;
  prior      boolean;
  v_conflicts integer := 0;
  place      text;
  site       text;
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
    -- Told once, on the second failure in a row, never on every pull.
    if i.failures + 1 = 2 then
      perform private.notify(i.owner_id, 'booking'::public.notification_kind,
        'Calendar sync needs a look',
        'We could not read your ' || site || ' calendar for ' || coalesce(place, 'your room') ||
        ' twice in a row, so nights booked there are not being closed on Vallo. Check the link in your calendar.',
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
                    where c.import_id = i.id and not (c.date = any (wanted)));

  -- Nights that have gone are forgotten without reopening anything.
  delete from public.calendar_import_nights c where c.import_id = i.id and c.date < today;
  perform private.calendar_import_release(i.id, array(select x from unnest(dropped) x where x >= today));

  foreach d in array added loop
    if i.room_type_id is not null then
      prior := exists (select 1 from public.rate_calendar rc join public.rate_plans rp on rp.id = rc.rate_plan_id
                        where rp.room_type_id = i.room_type_id and rc.date = d and rc.closed)
               and not exists (select 1 from public.calendar_import_nights o join public.calendar_imports oi on oi.id = o.import_id
                                where oi.room_type_id = i.room_type_id and o.date = d);
      if exists (select 1 from public.room_inventory ri where ri.room_type_id = i.room_type_id and ri.date = d
                  and ri.units_booked > 0 and ri.units_booked >= ri.units_open) then
        v_conflicts := v_conflicts + 1;
      end if;
      insert into public.rate_calendar (rate_plan_id, date, closed)
      select rp.id, d, true from public.rate_plans rp where rp.room_type_id = i.room_type_id
      on conflict (rate_plan_id, date) do update set closed = true;
    else
      prior := exists (select 1 from public.availability av where av.listing_id = i.listing_id and av.date = d and av.status = 'unavailable')
               and not exists (select 1 from public.calendar_import_nights o join public.calendar_imports oi on oi.id = o.import_id
                                where oi.listing_id = i.listing_id and o.date = d);
      if exists (select 1 from public.availability av where av.listing_id = i.listing_id and av.date = d and av.status = 'booked')
         or exists (select 1 from public.bookings b where b.listing_id = i.listing_id and b.status in ('PENDING', 'CONFIRMED')
                     and b.check_in <= d and b.check_out > d) then
        v_conflicts := v_conflicts + 1;
      end if;
      insert into public.availability (listing_id, date, status) values (i.listing_id, d, 'unavailable')
      on conflict (listing_id, date) do update set status = 'unavailable' where public.availability.status = 'available';
    end if;
    insert into public.calendar_import_nights (import_id, date, was_closed) values (i.id, d, prior)
    on conflict (import_id, date) do nothing;
  end loop;

  update public.calendar_imports
     set last_attempt_at = now(), last_synced_at = now(), failures = 0, last_error = null,
         nights_blocked = (select count(*) from public.calendar_import_nights c where c.import_id = i.id),
         conflicts = v_conflicts
   where id = i.id;

  if v_conflicts > 0 then
    perform private.notify(i.owner_id, 'booking'::public.notification_kind,
      'A night may be booked twice',
      coalesce(place, 'Your room') || ' is booked on Vallo on ' || v_conflicts || ' night(s) that ' || site ||
      ' also shows as booked. Open your calendar and sort it out with the guests before they travel.',
      '/host/calendar');
  end if;

  return jsonb_build_object('status', 'ok', 'added', coalesce(cardinality(added), 0),
                            'released', coalesce(cardinality(dropped), 0), 'conflicts', v_conflicts);
end;
$function$;
revoke all on function public.apply_calendar_import(uuid, date[], text) from public, anon, authenticated;
grant execute on function public.apply_calendar_import(uuid, date[], text) to service_role;

create or replace function public.remove_calendar_import(p_import uuid)
returns jsonb
language plpgsql
volatile security definer
set search_path = ''
as $function$
declare
  i        public.calendar_imports%rowtype;
  released integer;
begin
  select * into i from public.calendar_imports where id = p_import for update;
  if i.id is null or i.owner_id is distinct from (select auth.uid()) then
    return jsonb_build_object('status', 'not_found');
  end if;
  released := private.calendar_import_release(i.id,
    array(select c.date from public.calendar_import_nights c where c.import_id = i.id));
  delete from public.calendar_imports where id = i.id;
  return jsonb_build_object('status', 'ok', 'released', released);
end;
$function$;
revoke all on function public.remove_calendar_import(uuid) from public, anon;
grant execute on function public.remove_calendar_import(uuid) to authenticated;

-- ------------------------------------------------------------ read-back

do $$
begin
  if to_regclass('public.calendar_feeds') is null
     or to_regclass('public.calendar_imports') is null
     or to_regclass('public.calendar_import_nights') is null then
    raise exception 'host c2: a calendar sync table is missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.calendar_feeds'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.calendar_imports'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.calendar_import_nights'::regclass) then
    raise exception 'host c2: row level security is off on a calendar sync table';
  end if;
  if to_regprocedure('public.calendar_feed(text)') is null
     or to_regprocedure('public.calendar_imports_due(interval,integer)') is null
     or to_regprocedure('public.apply_calendar_import(uuid,date[],text)') is null
     or to_regprocedure('public.remove_calendar_import(uuid)') is null
     or to_regprocedure('private.calendar_import_release(uuid,date[])') is null then
    raise exception 'host c2: a calendar sync function is missing';
  end if;
  if has_function_privilege('authenticated', 'public.apply_calendar_import(uuid,date[],text)', 'execute')
     or has_function_privilege('anon', 'public.calendar_imports_due(interval,integer)', 'execute') then
    raise exception 'host c2: a service-only calendar function is open to members';
  end if;
  if (public.calendar_feed('nope') ->> 'status') <> 'not_found' then
    raise exception 'host c2: the feed answered a malformed token';
  end if;
end $$;
