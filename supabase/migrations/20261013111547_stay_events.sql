-- DRAFT, not applied. Batch 1, HOTEL-01.
-- The front desk marks a guest checked in and checked out. booking_status
-- has no in-house state (PENDING, CONFIRMED, COMPLETED, NO_SHOW, CANCELLED),
-- and the bookings row carries fixed-terms triggers, so the two moments live
-- in their own append-only table rather than as new statuses or columns.
-- One row per booking and kind; a second tap returns the first time
-- (idempotent). Each mark writes an audit_log row. No money moves.
--
-- REVIEWED AGAINST LIVE (13 October 2026, read only): bookings, audit_log,
-- private.owns_business, private.listing_agent_is_me and private.booking_host
-- read as written here; stay_events, private.hosts_booking and
-- public.record_stay_event do not exist yet; booking_status has no in-house
-- value; audit_log is append-only by trigger and takes the five columns used
-- below. Two changes from the first draft: hosts_booking now answers through
-- private.booking_host (the one live definition of who hosts a booking, both
-- the listing-agent and the business-owner side) instead of restating it, and
-- the policy is created only when it is missing, so a second run is harmless.
-- Founder rule (every payment happens inside Vallo): record_stay_event refuses
-- 'checked_in' unless private.booking_is_paid(booking) (a SUCCESSFUL
-- transaction), with hint 'stay_not_paid'. That helper is live and unchanged.
set lock_timeout = '5s';

create table if not exists public.stay_events (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind       text not null check (kind in ('checked_in', 'checked_out')),
  at         timestamptz not null default now(),
  by_user    uuid references auth.users (id) on delete set null,
  primary key (booking_id, kind)
);
alter table public.stay_events enable row level security;
revoke all on public.stay_events from public, anon, authenticated;
grant select on public.stay_events to authenticated;
grant all on public.stay_events to service_role;

create or replace function private.hosts_booking(p_booking uuid)
 returns boolean
 language sql
 stable
 security definer
 set search_path to ''
as $fn$
  select coalesce(private.booking_host(p_booking) = (select auth.uid()), false);
$fn$;
revoke all on function private.hosts_booking(uuid) from public, anon;
grant execute on function private.hosts_booking(uuid) to authenticated;

do $do$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'stay_events' and policyname = 'stay_events_party_reads'
  ) then
    create policy stay_events_party_reads on public.stay_events
      for select to authenticated
      using (
        exists (select 1 from public.bookings b
                 where b.id = stay_events.booking_id
                   and b.guest_id = (select auth.uid()))
        or private.hosts_booking(stay_events.booking_id)
      );
  end if;
end
$do$;

create or replace function public.record_stay_event(p_booking uuid, p_kind text)
 returns timestamptz
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  me     uuid := (select auth.uid());
  b      record;
  today  date := (now() at time zone 'Africa/Lagos')::date;
  stamp  timestamptz;
begin
  if me is null then
    raise exception 'sign in' using errcode = '42501';
  end if;
  if p_kind not in ('checked_in', 'checked_out') then
    raise exception 'unknown stay event' using errcode = '22023';
  end if;
  if not private.hosts_booking(p_booking) then
    raise exception 'not your booking' using errcode = '42501';
  end if;

  select bk.id, bk.status, bk.check_in, bk.check_out into b
    from public.bookings bk where bk.id = p_booking for update;

  select se.at into stamp from public.stay_events se
   where se.booking_id = p_booking and se.kind = p_kind;
  if stamp is not null then
    return stamp;
  end if;

  if b.status not in ('CONFIRMED', 'COMPLETED') then
    raise exception 'only a confirmed stay can be checked in or out' using errcode = '22023';
  end if;
  if p_kind = 'checked_in' and not private.booking_is_paid(p_booking) then
    raise exception 'this stay is not paid through Vallo yet, so it cannot be checked in'
      using errcode = '22023', hint = 'stay_not_paid';
  end if;
  if p_kind = 'checked_in' and (today < b.check_in or today > b.check_out) then
    raise exception 'a guest is checked in from the arrival day to the departure day' using errcode = '22023';
  end if;
  if p_kind = 'checked_out' then
    if not exists (select 1 from public.stay_events se
                    where se.booking_id = p_booking and se.kind = 'checked_in') then
      raise exception 'check the guest in first' using errcode = '22023';
    end if;
  end if;

  insert into public.stay_events (booking_id, kind, at, by_user)
  values (p_booking, p_kind, now(), me)
  on conflict (booking_id, kind) do nothing
  returning at into stamp;

  if stamp is null then
    select se.at into stamp from public.stay_events se
     where se.booking_id = p_booking and se.kind = p_kind;
  else
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (me, 'stay.' || p_kind, 'booking', p_booking::text,
            jsonb_build_object('check_in', b.check_in, 'check_out', b.check_out));
  end if;
  return stamp;
end;
$fn$;

revoke all on function public.record_stay_event(uuid, text) from public, anon;
grant execute on function public.record_stay_event(uuid, text) to authenticated;
