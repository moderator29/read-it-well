-- B4 of the two-side platform: the booking lifecycle, finished in the database.
--
-- WHAT THIS DOES. Three functions, each the one atomic home of a lifecycle
-- move that used to be half built or not built at all:
--
--   1. private.expire_booking_holds(p_ttl, p_limit): a PENDING booking is a
--      hold on inventory (the GiST exclusion refuses a rival while it is
--      PENDING) and a hold nobody confirms must end. Every PENDING booking
--      older than p_ttl becomes CANCELLED with a booking_state_events row, its
--      calendar nights go back to availability in the same transaction, and
--      the existing notify_booking_change trigger tells the guest and the host.
--      A PENDING booking that carries a SUCCESSFUL transaction is NEVER
--      cancelled: that is a settlement that died between its two keys
--      (lib/bookings/settlement.ts), money has moved, and the row is reported
--      back so a person can finish the confirmation. The function returns the
--      ids it released and the ids it refused to touch, so the cron job can
--      say exactly what it did.
--
--      private.release_stale_booking_holds(), which pg_cron has been calling
--      every fifteen minutes since 20260804184423, becomes a thin wrapper over
--      this function with its 48-hour default. Same signature, same return
--      type, same schedule; one implementation instead of two that could
--      drift apart. The 48 hours is HOLD_WINDOW_HOURS in
--      lib/agent/bookings-schema.ts and must stay equal to it.
--
--   2. private.complete_ended_stays(p_limit): a CONFIRMED booking whose
--      check-out day has passed (strictly, so the host keeps the check-out day
--      itself to record a no show or a completion by hand) becomes COMPLETED
--      with its state event; the trigger tells the guest, this function tells
--      the host. Only a PAID stay is completed automatically: a confirmed but
--      unpaid stay (a request the host accepted that nobody paid for) may never
--      have happened, so it is reported, not guessed at.
--
--   3. private.record_booking_no_show(p_booking, p_actor, p_note): the host,
--      or an admin overriding, records that nobody arrived. CONFIRMED only,
--      from arrival day only, terminal once written, one state event carrying
--      the actor and the note, the remaining nights returned to the calendar,
--      the guest told in plain words with a route to dispute it, and the host
--      told when it was an admin who recorded it. Nothing in this file ever
--      decides NO_SHOW on its own: that is a person's call.
--
-- WHY FUNCTIONS. Each move touches two or three tables and must either happen
-- whole or not at all; the application cannot make that promise across
-- PostgREST calls. Public pass-throughs exist for the service role only, on
-- the model of M5: a sweep is never run from a browser.
--
-- WHAT IT NEVER DOES. No row is deleted except availability nights this
-- platform itself marked 'booked' for the booking being released. No column
-- is dropped, no privilege revoked from anything that had it, no enum changed.
-- Every statement is idempotent (create or replace, if not exists), so the
-- file replays cleanly.
--
-- HOW IT WAS PROBED. scripts/probes/b4_lifecycle.sh lifts the exact function
-- text between the ">>> b4_lifecycle" and "<<< b4_lifecycle" markers into a
-- scratch database on a local Postgres 16 with a minimal copy of the tables
-- and stubs for private.notify and private.has_role, seeds one booking per
-- case, runs all three functions and asserts the states, the events, the
-- calendar and the notifications. The captured run sits beside it. Against
-- the live project, scripts/probes/b4_lifecycle_live.sql is the same cases
-- inside a transaction that ends in ROLLBACK; no probe row is ever persisted.

/* ------------------------------------------------- indexes the sweeps read */

-- The hold sweep walks PENDING rows by age; the completion sweep walks
-- CONFIRMED rows by check-out. Both partial, so they stay the size of the
-- live queue however large bookings grows.
create index if not exists bookings_pending_created_idx
  on public.bookings (created_at)
  where status = 'PENDING';

create index if not exists bookings_confirmed_check_out_idx
  on public.bookings (check_out)
  where status = 'CONFIRMED';

-- >>> b4_lifecycle (the exact text scripts/probes/b4_lifecycle.sh loads)

/* ------------------------------------------------- 1. expire booking holds */

create or replace function private.expire_booking_holds(
  p_ttl   interval default interval '48 hours',
  p_limit integer  default 500
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  b            record;
  released     uuid[] := '{}';
  paid_pending uuid[] := '{}';
  ttl_hours    integer;
begin
  if p_ttl is null or p_ttl < interval '1 hour' then
    raise exception 'A hold lives for at least one hour before it can expire.' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'A sweep releases between 1 and 5000 holds per run.' using errcode = '22023';
  end if;
  ttl_hours := floor(extract(epoch from p_ttl) / 3600)::integer;

  -- Oldest first, row-locked, and a row another sweep already holds is
  -- skipped rather than waited on: two overlapping runs share the queue
  -- instead of stacking up behind one lock.
  for b in
    select bk.id, bk.listing_id, bk.check_in, bk.check_out
      from public.bookings bk
     where bk.status = 'PENDING'
       and bk.created_at < now() - p_ttl
     order by bk.created_at
     limit p_limit
       for update of bk skip locked
  loop
    -- Money moved but the booking never followed: settlement flipped the
    -- transaction (its first key) and died before the booking (its second).
    -- Cancelling this would cancel a paid stay. Report it; never touch it.
    if exists (
      select 1 from public.transactions t
       where t.booking_id = b.id and t.status = 'SUCCESSFUL'
    ) then
      paid_pending := paid_pending || b.id;
      continue;
    end if;

    update public.bookings
       set status = 'CANCELLED'
     where id = b.id and status = 'PENDING';
    if not found then
      continue;
    end if;

    released := released || b.id;

    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (b.id, 'PENDING', 'CANCELLED',
            format('Auto-released: the request was not confirmed within %s hours.', ttl_hours));

    -- The nights this hold closed at reserve go back on the calendar in the
    -- same transaction as the cancellation, so the two can never disagree.
    -- Only rows this platform marked booked; a night the host closed by hand
    -- stays closed.
    delete from public.availability av
     where av.listing_id = b.listing_id
       and av.status = 'booked'
       and av.date >= b.check_in
       and av.date <  b.check_out;
  end loop;

  return jsonb_build_object(
    'released',     to_jsonb(released),
    'paid_pending', to_jsonb(paid_pending),
    'ttl_hours',    ttl_hours
  );
end;
$$;

comment on function private.expire_booking_holds(interval, integer) is
  'Cancels PENDING bookings older than p_ttl (default 48 hours), appends the state event and returns their calendar nights, in one transaction. A PENDING booking with a SUCCESSFUL transaction is reported under paid_pending and never cancelled. Returns jsonb {released, paid_pending, ttl_hours}.';

-- The pg_cron door keeps its name, signature and return type; only the body
-- moves into the function above.
create or replace function private.release_stale_booking_holds()
returns integer
language sql
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_array_length(private.expire_booking_holds(interval '48 hours', 500) -> 'released'),
    0
  );
$$;

comment on function private.release_stale_booking_holds() is
  'Cancels PENDING bookings older than 48 hours and releases the calendar nights they held. Since B4 a wrapper over private.expire_booking_holds; kept so the pg_cron job rentme_release_stale_holds needs no change.';

/* ------------------------------------------------- 2. complete ended stays */

create or replace function private.complete_ended_stays(
  p_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  b            record;
  completed    uuid[] := '{}';
  unpaid_ended uuid[] := '{}';
  today        date   := (now() at time zone 'Africa/Lagos')::date;
  host_user    uuid;
  stay_title   text;
begin
  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'A sweep completes between 1 and 5000 stays per run.' using errcode = '22023';
  end if;

  -- check_out is the morning the guest leaves. Strictly before today, so the
  -- host has the whole check-out day to record the stay by hand (including
  -- a no show, which this function must never guess) before the sweep does.
  for b in
    select bk.id, bk.listing_id, bk.check_out
      from public.bookings bk
     where bk.status = 'CONFIRMED'
       and bk.check_out < today
     order by bk.check_out
     limit p_limit
       for update of bk skip locked
  loop
    -- Confirmed and never paid: a request the host accepted that no money
    -- followed. Whether the guest came is not something a sweep can know.
    if not exists (
      select 1 from public.transactions t
       where t.booking_id = b.id and t.status = 'SUCCESSFUL'
    ) then
      unpaid_ended := unpaid_ended || b.id;
      continue;
    end if;

    update public.bookings
       set status = 'COMPLETED'
     where id = b.id and status = 'CONFIRMED';
    if not found then
      continue;
    end if;

    completed := completed || b.id;

    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (b.id, 'CONFIRMED', 'COMPLETED',
            format('Checked out: the stay ended on %s and was recorded automatically.',
                   to_char(b.check_out, 'DD Mon YYYY')));

    -- The guest hears "Stay complete" from notify_booking_change on the
    -- status change. The host is told here, because the trigger never did.
    select a.user_id, l.title
      into host_user, stay_title
      from public.listings l
      join public.agents   a on a.id = l.agent_id
     where l.id = b.listing_id;

    perform private.notify(
      host_user, 'booking', 'Stay complete',
      coalesce(stay_title, 'A stay') || ' ended on ' || to_char(b.check_out, 'DD Mon')
        || ' and is recorded as complete.',
      '/agent/bookings'
    );
  end loop;

  return jsonb_build_object(
    'completed',    to_jsonb(completed),
    'unpaid_ended', to_jsonb(unpaid_ended),
    'today',        today
  );
end;
$$;

comment on function private.complete_ended_stays(integer) is
  'Moves paid CONFIRMED bookings whose check-out day has passed (Lagos) to COMPLETED with a state event, tells the host, and reports confirmed-but-unpaid ended stays under unpaid_ended without touching them. Returns jsonb {completed, unpaid_ended, today}.';

/* ------------------------------------------------- 3. record a no show */

create or replace function private.record_booking_no_show(
  p_booking uuid,
  p_actor   uuid,
  p_note    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  bk         record;
  today      date := (now() at time zone 'Africa/Lagos')::date;
  host_user  uuid;
  stay_title text;
  is_admin   boolean;
begin
  if p_booking is null or p_actor is null then
    raise exception 'A no show needs a booking and the person recording it.' using errcode = '22023';
  end if;

  select b.id, b.listing_id, b.guest_id, b.status, b.check_in, b.check_out
    into bk
    from public.bookings b
   where b.id = p_booking
     for update;
  if not found then
    return jsonb_build_object('outcome', 'missing');
  end if;

  select a.user_id, l.title
    into host_user, stay_title
    from public.listings l
    join public.agents   a on a.id = l.agent_id
   where l.id = bk.listing_id;

  -- The action authorises through the caller's own session first; this is
  -- the second lock on the same door, so a stray service-role call with the
  -- wrong actor is refused here too.
  is_admin := private.has_role(p_actor, 'admin') or private.has_role(p_actor, 'super_admin');
  if p_actor is distinct from host_user and not is_admin then
    raise exception 'That booking is not yours to record.' using errcode = '42501';
  end if;

  if bk.status = 'NO_SHOW' then
    return jsonb_build_object('outcome', 'already');
  end if;
  if bk.status <> 'CONFIRMED' then
    return jsonb_build_object('outcome', 'not_confirmed', 'status', bk.status);
  end if;
  if bk.check_in > today then
    return jsonb_build_object('outcome', 'not_arrived');
  end if;

  update public.bookings
     set status = 'NO_SHOW'
   where id = bk.id and status = 'CONFIRMED';

  insert into public.booking_state_events (booking_id, from_status, to_status, actor_id, note)
  values (bk.id, 'CONFIRMED', 'NO_SHOW', p_actor, nullif(btrim(p_note), ''));

  -- The nights still ahead go back on sale. Nights already slept through, or
  -- not, stay as they were: the calendar is not a place to argue history.
  delete from public.availability av
   where av.listing_id = bk.listing_id
     and av.status = 'booked'
     and av.date >= greatest(today, bk.check_in)
     and av.date <  bk.check_out;

  -- Plain, factual, and it says what to do if it is wrong. The trigger sends
  -- nothing on NO_SHOW, so this is the guest's only word of it.
  perform private.notify(
    bk.guest_id, 'booking', 'Stay recorded as not attended',
    coalesce(stay_title, 'Your stay') || ': the host recorded that nobody arrived for '
      || to_char(bk.check_in, 'DD Mon')
      || '. If that is not right, contact support from your bookings and we will look into it.',
    '/bookings'
  );

  -- An admin override is something the host should hear about.
  if is_admin and p_actor is distinct from host_user then
    perform private.notify(
      host_user, 'booking', 'Stay recorded as no show',
      coalesce(stay_title, 'A stay') || ' for ' || to_char(bk.check_in, 'DD Mon')
        || ' was recorded as a no show by Vallo support.',
      '/agent/bookings'
    );
  end if;

  return jsonb_build_object('outcome', 'recorded', 'booking_id', bk.id);
end;
$$;

comment on function private.record_booking_no_show(uuid, uuid, text) is
  'Records CONFIRMED to NO_SHOW for one booking on behalf of p_actor (the listing host or an admin), with the state event, the remaining nights returned to the calendar and the guest notified. Returns jsonb {outcome: recorded | already | not_confirmed | not_arrived | missing}.';

-- <<< b4_lifecycle

/* ------------------------------------------------- privileges and doors */

revoke all on function private.expire_booking_holds(interval, integer) from public, anon, authenticated;
revoke all on function private.complete_ended_stays(integer) from public, anon, authenticated;
revoke all on function private.record_booking_no_show(uuid, uuid, text) from public, anon, authenticated;

-- PostgREST cannot see private; the cron jobs and the no-show action reach
-- these through the service role and nothing else.
create or replace function public.expire_booking_holds(
  p_ttl   interval default interval '48 hours',
  p_limit integer  default 500
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select private.expire_booking_holds(p_ttl, p_limit);
$$;

create or replace function public.complete_ended_stays(
  p_limit integer default 500
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select private.complete_ended_stays(p_limit);
$$;

create or replace function public.record_booking_no_show(
  p_booking uuid,
  p_actor   uuid,
  p_note    text default null
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select private.record_booking_no_show(p_booking, p_actor, p_note);
$$;

comment on function public.expire_booking_holds(interval, integer) is
  'Pass-through to private.expire_booking_holds for the hold-sweep cron job. Service role only.';
comment on function public.complete_ended_stays(integer) is
  'Pass-through to private.complete_ended_stays for the complete-stays cron job. Service role only.';
comment on function public.record_booking_no_show(uuid, uuid, text) is
  'Pass-through to private.record_booking_no_show for the recordNoShow server action. Service role only; the action authorises the actor first and the function checks again.';

revoke all on function public.expire_booking_holds(interval, integer) from public, anon, authenticated;
revoke all on function public.complete_ended_stays(integer) from public, anon, authenticated;
revoke all on function public.record_booking_no_show(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.expire_booking_holds(interval, integer) to service_role;
grant execute on function public.complete_ended_stays(integer) to service_role;
grant execute on function public.record_booking_no_show(uuid, uuid, text) to service_role;
