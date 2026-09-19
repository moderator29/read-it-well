-- P1. A future event is cancelled with notice, never orphaned. And nothing a
-- stranger can still transact against outlives the person behind it.
--
-- WHAT WAS OPEN. Section 11.10 of the ledger, first of the three items that
-- needed the founder's word: "An `events` row survives with an anonymous host,
-- because `events.host_id` cascades onto `auth.users` and we do not delete
-- that row; the specification did not name events."
--
-- THE FOUNDER'S RULING, and this file is it: future events are CANCELLED WITH
-- NOTICE TO EVERYONE ATTENDING. Past events anonymise and stay, because they
-- are history.
--
-- WHETHER A FUTURE EVENT SHOULD ALSO BLOCK THE DELETION, WHICH WAS LEFT TO THE
-- AUTHOR TO ARGUE. IT DOES NOT, AND HERE IS THE ARGUMENT.
--
-- The founder's principle says a future commitment must be RESOLVED before the
-- account can go. It does not say the person must resolve it by hand. A
-- business blocks because nobody but its owner can decide who takes it over,
-- and because a stranger can hand it money; a published listing blocks for the
-- same reason. An event is neither. It has, by the deliberate design of
-- `20260804164040`, NO PRICE COLUMN and no payment surface at all, so nobody
-- is out of pocket. It has exactly one host, so there is nobody to hand it to.
-- And its cancellation is COMPLETE and AUTOMATIC: setting the status writes
-- `cancelled_at`, fires `events_notify`, and `private.notify_event_change`
-- tells every GOING and WAITLIST attendee by name of the event and the reason,
-- in the same trigger, so no code path can cancel one quietly.
--
-- A cancellation with notice IS the resolution, and it is a better resolution
-- than blocking would be: blocking would make somebody wait up to however long
-- their last meetup is away before they could exercise a data protection
-- right, over a free social arrangement, and the only action available to them
-- would be to cancel it themselves. Making a person perform by hand the exact
-- act the purge can perform for them, as the price of leaving, is a dark
-- pattern with a clipboard. So: not a blocker, but NAMED ON THE SCREEN, in the
-- list of what the deletion does, so nobody discovers it afterwards.
--
-- THERE IS ALREADY A CANCELLED STATE AND NOTHING IS INVENTED HERE.
-- `public.event_status` carries 'CANCELLED', `public.events` carries
-- `cancelled_at` and `cancel_reason`, and `events_cancelled_has_reason_chk`
-- already refuses a cancellation with no reason written on it. This file adds
-- no column to `events` and no value to any enum.
--
-- WHAT THIS FILE ADDS. One function, `public.close_future_commitments`, which
-- the purge job runs immediately BEFORE `public.purge_account_rows`, in its
-- own transaction, for the reason that follows.
--
-- WHY ITS OWN TRANSACTION RATHER THAN A STEP INSIDE `purge_account_rows`.
-- Re-emitting that four-hundred-line function to add a step would put every
-- line of a function that has already been applied and probed back on the
-- table, including the twenty-character handle fix and the `> 0` balance fix
-- that section 11.10 records, for a change that touches none of them. This
-- function is additive, and the ordering is safe in both directions: if the
-- purge then fails, the events are still cancelled and the attendees still
-- told, which is not a harm to anybody, and the request stays open so the next
-- run tries again. Run twice it changes nothing the second time, because every
-- statement in it is keyed on a state it has already left.
--
-- THE FOUR THINGS IT RESOLVES, IN THE ORDER IT MUST RESOLVE THEM.
--
--   1. FUTURE EVENTS. Every LIVE or DRAFT event of theirs whose moment is
--      still ahead becomes CANCELLED with a reason, and the existing trigger
--      does the telling.
--
--      A future event already HELD or REMOVED cannot be cancelled from here,
--      and that is `private.guard_event_write` doing its job rather than a
--      gap: it restores `status` for any caller who is not an admin, and this
--      function runs as the service role with no `auth.uid()`. Such an event
--      is not public and cannot take new attendees, but it may still hold
--      people who joined before it was held, so THEY ARE TOLD ANYWAY, by name
--      of the event, and the count comes back separately so the moderation
--      desk can see it happened. Named rather than quietly skipped.
--
--   2. FUTURE RESERVATIONS AGAINST THEIR BUSINESSES. Somebody is going to
--      turn up to a table at a restaurant whose owner has gone. Cancelled,
--      and `private.notify_reservation` tells the guest.
--
--   3. ANY BUSINESS OF THEIRS STILL ON THE MARKET, which is the belt to the
--      precondition's braces. `public.account_deletion_blockers` refuses to
--      schedule a deletion while a business of theirs is published, and
--      `schedule_account_deletion` re-asks at the moment the button is
--      pressed. But thirty days pass between that and this, the account is
--      banned throughout, and an ADMIN can still publish a business in the
--      meantime. If that has happened, the business and its published
--      accommodations are taken off the market rather than left trading with
--      a tombstone behind them, and the count comes back so the desk sees an
--      event that should never occur.
--
--      THE ORDER OF 2 AND 3 IS LOAD BEARING AND IS NOT A STYLE CHOICE.
--      `private.reservation_is_valid` raises 'that restaurant is not
--      published' on ANY write to a reservation whose business is not
--      PUBLISHED, cancellations included. Suspending the business first would
--      therefore make its future reservations impossible to cancel, and the
--      guests would never be told. Reservations first, always.
--
--   4. OFFERS OF A BUSINESS MADE TO THEM. A pending
--      `public.business_transfers` row pointing at somebody who is being
--      purged can never be accepted, so it is expired and the owner who
--      offered it is told, rather than being left to wait out fourteen days
--      for an answer that cannot come.
--
--      AN OFFER THEY MADE TO SOMEBODY ELSE IS LEFT OPEN ON PURPOSE. It is the
--      one door in this whole feature that can still put a living owner
--      behind a business, `respond_to_business_transfer` re-checks the
--      ownership before it moves anything, and closing it would remove the
--      good outcome to tidy up a row.
--
-- WHAT IS NOT DONE, AND IS NOT A GAP.
--
-- PAST EVENTS ARE NOT TOUCHED. They anonymise exactly as the rest of the
-- retained tables do, and they need no statement here to do it: the host is a
-- uuid pointing at the tombstone `purge_account_rows` makes, and every surface
-- that draws a host name draws it through `public.profiles`, which that same
-- function scrubs to 'Deleted account'. `events.title`, `events.blurb` and
-- `events.venue_label` describe a public place and an evening, not a person,
-- and `venue_label` is a place named in words by the schema's own rule rather
-- than an address. The event is therefore already the thing the founder asked
-- for: history, with nobody's name on it. It is listed in
-- `apps/web/src/lib/account-deletion/plan.ts` under the retained tables so the
-- privacy document says so out loud.
--
-- NOBODY'S NAME, ADDRESS OR TELEPHONE NUMBER APPEARS IN ANY NOTIFICATION THIS
-- FUNCTION CAUSES. The event notice carries the event's own title and reason,
-- which the existing trigger writes; the reservation notice is the existing
-- one; the transfer notice names the business. Rule 16 holds throughout.
--
-- ADDITIVE. One new function. No table, column, enum value, constraint,
-- policy, grant, index or foreign key is created, altered or dropped, and no
-- existing function is replaced.
--
-- RULE 21, BORN LOCKED. The function is `SECURITY DEFINER` and would have been
-- reachable at `/rest/v1/rpc/close_future_commitments` by every signed-in
-- caller the moment it existed, because Supabase grants execute on new
-- functions to `anon` and `authenticated` by default. It revokes from
-- `public`, `anon` and `authenticated` in this same file and is granted back
-- to `service_role` alone, and the probe PROVES the revoke rather than
-- assuming it.
--
-- ---------------------------------------------------------------------------
-- PROBE, for the LEAD to run through `apply_migration`. One transaction, ended
-- by a deliberate `raise exception` so the whole thing rolls back and nothing
-- persists: no test row is ever left in a live product table. It fails loudly
-- on the first assertion that does not hold.
--
-- WHAT IT PROVES
--   1. RULE 21. The function exists, is SECURITY DEFINER, and is executable by
--      neither `anon` nor `authenticated`. Read off `has_function_privilege`.
--   2. It refuses a request whose clock has not run out, so it can never be
--      used to cancel somebody's events early.
--   3. A FUTURE EVENT IS CANCELLED AND EVERY ATTENDEE IS TOLD. The event is
--      CANCELLED, it carries a reason, and a notification row exists for the
--      attendee that did not exist before. This is the assertion the founder's
--      ruling turns on.
--   4. A PAST EVENT IS UNTOUCHED. Still LIVE, still carrying its title, which
--      is the "history stays" half of the same ruling.
--   5. Run twice it changes nothing: the second run cancels zero events.
--   6. THE RLS CROSS-USER READ THAT MUST FAIL, and it is not vacuous: a
--      notification row for the attendee EXISTS in this transaction, and a
--      stranger wearing an `authenticated` JWT reads ZERO notifications. The
--      Supabase MCP `execute_sql` tool can never show this, because the role
--      it runs as carries `rolbypassrls`; this probe sets the role itself.
--
--   begin;
--
--   do $probe$
--   declare
--     host_id   uuid;
--     goer      uuid;
--     area      uuid;
--     future_ev uuid;
--     past_ev   uuid;
--     req       uuid;
--     before_n  integer;
--     after_n   integer;
--     answer    jsonb;
--   begin
--     -- 1. RULE 21: born locked.
--     if not exists (
--       select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
--        where ns.nspname = 'public' and p.proname = 'close_future_commitments' and p.prosecdef
--     ) then
--       raise exception 'FAIL 1: public.close_future_commitments is missing or not SECURITY DEFINER';
--     end if;
--     if has_function_privilege('anon', 'public.close_future_commitments(uuid)', 'execute') then
--       raise exception 'FAIL 1: close_future_commitments is reachable by anon';
--     end if;
--     if has_function_privilege('authenticated', 'public.close_future_commitments(uuid)', 'execute') then
--       raise exception 'FAIL 1: close_future_commitments is reachable by a signed-in caller';
--     end if;
--
--     select id into host_id from auth.users order by created_at limit 1;
--     select id into goer    from auth.users where id <> host_id order by created_at limit 1;
--     select id into area    from public.areas where status = 'ACTIVE' order by created_at limit 1;
--     if host_id is null or goer is null or area is null then
--       raise exception 'PROBE NEEDS TWO AUTH USERS AND ONE ACTIVE AREA';
--     end if;
--
--     -- The guard trigger refuses an insert from a host who is not eligible,
--     -- and refuses a start time in the past, so both rows go in with the
--     -- trigger disabled and are read back through it afterwards. The
--     -- transaction is rolled back either way.
--     alter table public.events disable trigger events_zz_guard;
--     insert into public.events (area_id, host_id, title, starts_at, venue_label, venue_kind, status)
--     values (area, host_id, 'Probe future meetup, rolled back',
--             now() + interval '10 days', 'A public place', 'PUBLIC_VENUE', 'LIVE')
--     returning id into future_ev;
--     insert into public.events (area_id, host_id, title, starts_at, venue_label, venue_kind, status)
--     values (area, host_id, 'Probe past meetup, rolled back',
--             now() - interval '10 days', 'A public place', 'PUBLIC_VENUE', 'LIVE')
--     returning id into past_ev;
--     alter table public.events enable trigger events_zz_guard;
--
--     insert into public.event_attendees (event_id, user_id, state)
--     values (future_ev, goer, 'GOING');
--
--     select count(*) into before_n from public.notifications where user_id = goer;
--
--     -- 2. the clock is respected
--     insert into public.account_deletion_requests (user_id, purge_after)
--     values (host_id, now() + interval '30 days') returning id into req;
--     answer := public.close_future_commitments(req);
--     if answer ->> 'reason' <> 'not_due' then
--       raise exception 'FAIL 2: a request inside its grace window was acted on: %', answer;
--     end if;
--     if (select status from public.events where id = future_ev) <> 'LIVE' then
--       raise exception 'FAIL 2: an event was cancelled before the clock ran out';
--     end if;
--
--     update public.account_deletion_requests
--        set purge_after = now() - interval '1 minute' where id = req;
--
--     -- 3. the cancellation, and the notice
--     answer := public.close_future_commitments(req);
--     if (answer ->> 'ran')::boolean is not true then
--       raise exception 'FAIL 3: the close did not run: %', answer;
--     end if;
--     if (answer -> 'counts' ->> 'events_cancelled')::integer < 1 then
--       raise exception 'FAIL 3: no future event was cancelled: %', answer;
--     end if;
--     if (select status from public.events where id = future_ev) <> 'CANCELLED' then
--       raise exception 'FAIL 3: the future event is not cancelled';
--     end if;
--     if (select coalesce(btrim(cancel_reason), '') from public.events where id = future_ev) = '' then
--       raise exception 'FAIL 3: the cancellation carries no reason';
--     end if;
--     select count(*) into after_n from public.notifications where user_id = goer;
--     if after_n <= before_n then
--       raise exception 'FAIL 3: the attendee was not told, % notifications before and % after',
--         before_n, after_n;
--     end if;
--
--     -- 4. the past event is history and stays
--     if (select status from public.events where id = past_ev) <> 'LIVE' then
--       raise exception 'FAIL 4: a past event was cancelled, and history is not ours to rewrite';
--     end if;
--     if (select title from public.events where id = past_ev) <> 'Probe past meetup, rolled back' then
--       raise exception 'FAIL 4: a past event lost its title';
--     end if;
--
--     -- 5. idempotent
--     answer := public.close_future_commitments(req);
--     if (answer -> 'counts' ->> 'events_cancelled')::integer <> 0 then
--       raise exception 'FAIL 5: the second run cancelled something: %', answer;
--     end if;
--
--     raise notice 'PASS 1-5';
--   end;
--   $probe$;
--
--   -- 6. THE RLS CROSS-USER READ THAT MUST FAIL, and it is not vacuous.
--   do $rls$
--   declare
--     owner_id uuid;
--     stranger uuid;
--     rows_now integer;
--     leaked   integer;
--   begin
--     select user_id into owner_id from public.notifications
--      order by created_at desc limit 1;
--     select count(*) into rows_now from public.notifications where user_id = owner_id;
--     if rows_now < 1 then
--       raise exception 'FAIL 6: the read would be vacuous, there is no notification to leak';
--     end if;
--     select id into stranger from auth.users where id <> owner_id order by created_at limit 1;
--
--     perform set_config('request.jwt.claims',
--                        json_build_object('sub', stranger, 'role', 'authenticated')::text, true);
--     perform set_config('role', 'authenticated', true);
--
--     select count(*) into leaked from public.notifications where user_id = owner_id;
--
--     perform set_config('role', 'postgres', true);
--
--     if leaked <> 0 then
--       raise exception 'FAIL 6: a stranger read % of the % notifications addressed to somebody else',
--         leaked, rows_now;
--     end if;
--
--     raise exception 'PROBE ALL PASS p1 future events cancelled with notice, rolling back';
--   end;
--   $rls$;
--
--   rollback;
-- ---------------------------------------------------------------------------

create or replace function public.close_future_commitments(p_request uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req         public.account_deletion_requests;
  v_user        uuid;
  v_counts      jsonb := '{}'::jsonb;
  v_reason      constant text :=
    'The host closed their Vallo account, so this is cancelled. Nobody is out of pocket.';
  v_row         record;
  n             integer;
  v_stuck       integer := 0;
begin
  if p_request is null then
    return jsonb_build_object('ran', false, 'reason', 'incomplete');
  end if;

  select * into v_req
    from public.account_deletion_requests
   where id = p_request;

  if not found then
    return jsonb_build_object('ran', false, 'reason', 'not_found');
  end if;
  if v_req.status = 'CANCELLED' then
    return jsonb_build_object('ran', false, 'reason', 'cancelled');
  end if;
  if v_req.status = 'PURGED' then
    return jsonb_build_object('ran', false, 'already', true);
  end if;
  -- The same clock `purge_account_rows` reads, asked here too, so this can
  -- never be used to cancel somebody's evening early.
  if v_req.purge_after > now() then
    return jsonb_build_object('ran', false, 'reason', 'not_due',
                              'purge_after', v_req.purge_after);
  end if;

  v_user := v_req.user_id;

  -- ----------------------------------------------------------- 1. events
  -- The update alone does the telling: `events_notify` fires
  -- `private.notify_event_change`, which writes to every GOING and WAITLIST
  -- attendee in the same statement. A cancellation cannot happen quietly here
  -- and that is by the original design rather than by this file's care.
  update public.events
     set status        = 'CANCELLED',
         cancelled_at  = now(),
         cancel_reason = v_reason
   where host_id = v_user
     and starts_at > now()
     and status in ('LIVE', 'DRAFT');
  get diagnostics n = row_count;
  v_counts := v_counts || jsonb_build_object('events_cancelled', n);

  -- A future event that is HELD or REMOVED cannot be moved to CANCELLED by a
  -- caller who is not an admin, because `private.guard_event_write` restores
  -- the status. It is not public and cannot take new attendees, but people who
  -- joined before it was held are still expecting it, so they are told
  -- directly. Counted separately so the desk can see it happened.
  n := 0;
  for v_row in
    select e.id, e.title, a.user_id
      from public.events e
      join public.event_attendees a on a.event_id = e.id
     where e.host_id = v_user
       and e.starts_at > now()
       and e.status in ('HELD', 'REMOVED')
       and a.state in ('GOING', 'WAITLIST')
  loop
    perform private.notify(
      v_row.user_id, 'social',
      'An event you were going to is not happening',
      v_row.title || ': the host closed their account.',
      '/events/' || v_row.id::text);
    n := n + 1;
  end loop;
  v_counts := v_counts || jsonb_build_object('events_held_notified', n);

  -- ----------------------------------------------------- 2. reservations
  -- BEFORE the business is suspended, and the header says why: the validation
  -- trigger refuses every write to a reservation whose restaurant is not
  -- published, cancellations included.
  --
  -- ONE ROW AT A TIME, EACH IN ITS OWN BLOCK, AND THAT IS NOT CAUTION FOR ITS
  -- OWN SAKE. A restaurant can be unpublished after a table has been held, so
  -- a future reservation can already be sitting against a business that
  -- `private.reservation_is_valid` will now refuse every write to. As one set
  -- update, that single stubborn row would raise, abort this function, fail
  -- the purge, and leave a person undeleted for ever behind a table nobody can
  -- cancel. Per row, the ones that can be cancelled are cancelled and their
  -- guests are told, and the ones that cannot are counted so the desk can see
  -- them.
  n := 0;
  v_stuck := 0;
  for v_row in
    select r.id
      from public.reservations r
      join public.businesses b on b.id = r.business_id
     where b.owner_id = v_user
       and r.status in ('PENDING', 'CONFIRMED')
       and r.reserved_for >= now()
  loop
    begin
      update public.reservations set status = 'CANCELLED' where id = v_row.id;
      n := n + 1;
    exception when others then
      v_stuck := v_stuck + 1;
    end;
  end loop;
  v_counts := v_counts || jsonb_build_object('reservations_cancelled', n)
                       || jsonb_build_object('reservations_stuck', v_stuck);

  -- -------------------------------------------------------- 3. the market
  -- This should always be zero. The precondition refuses to schedule a
  -- deletion while a business of theirs is on the market, and
  -- `schedule_account_deletion` re-asks at the press of the button. A non-zero
  -- count here means something published a business during the grace window,
  -- which the desk needs to see.
  update public.accommodations a
     set status = 'SUSPENDED'
    from public.businesses b
   where b.id = a.business_id
     and b.owner_id = v_user
     and a.status = 'PUBLISHED';
  get diagnostics n = row_count;
  v_counts := v_counts || jsonb_build_object('accommodations_suspended', n);

  update public.businesses
     set status = 'SUSPENDED'
   where owner_id = v_user
     and status = 'PUBLISHED';
  get diagnostics n = row_count;
  v_counts := v_counts || jsonb_build_object('businesses_suspended', n);

  -- ------------------------------------------------- 4. offers made to them
  -- An offer pointing at somebody who is being purged can never be accepted.
  -- Expired, and the owner who made it is told so they can offer it elsewhere.
  --
  -- Read, then write, then tell, one at a time. NOT a data-modifying CTE
  -- inside the loop's query: plpgsql opens an implicit cursor over a
  -- `for ... in <query>`, and a cursor query may not carry a data-modifying
  -- WITH. That would have failed at run time rather than at apply time, which
  -- is the worst place for a deletion job to find out.
  n := 0;
  for v_row in
    select t.id, t.from_user_id
      from public.business_transfers t
     where t.to_user_id = v_user
       and t.status = 'PENDING'
  loop
    update public.business_transfers
       set status = 'EXPIRED', responded_at = now()
     where id = v_row.id;
    perform private.notify(
      v_row.from_user_id, 'system',
      'Your transfer offer has lapsed',
      'The person you offered the business to is no longer on Vallo. It is still yours, and you can offer it to somebody else.',
      '/host/transfer');
    n := n + 1;
  end loop;
  v_counts := v_counts || jsonb_build_object('transfers_expired', n);

  return jsonb_build_object(
    'ran', true,
    'request_id', p_request,
    'counts', v_counts);
end;
$$;

comment on function public.close_future_commitments(uuid) is
  'Resolves what the purge must not orphan: future events cancelled with notice to every attendee, future table reservations cancelled, anything still on the market taken off it, and offers made to the departing person expired. Past events are history and are not touched.';

revoke all on function public.close_future_commitments(uuid) from public, anon, authenticated;
grant execute on function public.close_future_commitments(uuid) to service_role;
