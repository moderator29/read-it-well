-- P1_C_RESERVATION_REMINDERS (RESTAURANT-02): diner reminders the evening
-- before and two hours before a CONFIRMED table.
-- Needs supabase/migrations/pending/p1_c_reservation_reminders.sql applied.
-- The probe cannot move the clock, so it checks what holds at any hour:
--  1. the ledger is closed to the API roles; the job is not callable by them;
--     the cron job is registered with the right command
--  2. a confirmed table two hours away, booked and confirmed days ago, gets
--     exactly one soon notice, linked to Bookings
--  3. none for a table booked inside the two hours, none for one confirmed
--     inside the two hours, none for a request still PENDING
--  4. every eve row the run wrote for these tables is on the evening before
--     on the Lagos clock (date one day before, 19:00 or later, more than two
--     hours ahead); a table tomorrow evening gets one exactly when the Lagos
--     clock is past 19:00 now
--  5. a second run writes nothing new for these tables
-- Everything is rolled back by the final raise.
do $$
declare
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  host  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  biz uuid;
  t_soon uuid; t_late uuid; t_late_ok uuid; t_pending uuid; t_tomorrow uuid;
  lagos timestamp := now() at time zone 'Africa/Lagos';
  tomorrow_at timestamptz := (((now() at time zone 'Africa/Lagos')::date + 1) + time '21:00') at time zone 'Africa/Lagos';
  n int; before_count int; bad int;
begin
  -- 1.
  if has_table_privilege('anon', 'public.reservation_reminders', 'select')
     or has_table_privilege('authenticated', 'public.reservation_reminders', 'select')
     or has_table_privilege('authenticated', 'public.reservation_reminders', 'insert') then
    raise exception 'PROBE_FAIL p1_c 1: the reminder ledger is open to an API role';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.reservation_reminders'::regclass) then
    raise exception 'PROBE_FAIL p1_c 1: row level security is off on the ledger';
  end if;
  if has_function_privilege('anon', 'private.send_reservation_reminders()', 'execute')
     or has_function_privilege('authenticated', 'private.send_reservation_reminders()', 'execute') then
    raise exception 'PROBE_FAIL p1_c 1: an API role can run the reminder job';
  end if;
  if not exists (select 1 from cron.job
                  where jobname = 'vallo_send_reservation_reminders'
                    and command like '%private.send_reservation_reminders()%') then
    raise exception 'PROBE_FAIL p1_c 1: the cron job is not registered';
  end if;

  -- Fixtures: a published first-party restaurant that seats all day, every day.
  insert into public.businesses (owner_id, kind, name, slug, status, source)
  values (host, 'restaurant', 'Probe Reminder Grill', 'probe-reminder-' || gen_random_uuid(), 'PUBLISHED', 'first_party')
  returning id into biz;
  insert into public.service_windows (business_id, weekday, opens, last_seating, closes, covers)
  select biz, d, '00:00', '23:59:59', '23:59:59', 500 from generate_series(0, 6) d;

  insert into public.reservations (business_id, guest_id, party_size, reserved_for, status, created_at, responded_at)
  values (biz, guest, 2, now() + interval '90 minutes', 'CONFIRMED', now() - interval '3 days', now() - interval '2 days')
  returning id into t_soon;
  insert into public.reservations (business_id, guest_id, party_size, reserved_for, status, created_at, responded_at)
  values (biz, guest, 2, now() + interval '95 minutes', 'CONFIRMED', now() - interval '10 minutes', now() - interval '5 minutes')
  returning id into t_late;
  insert into public.reservations (business_id, guest_id, party_size, reserved_for, status, created_at, responded_at)
  values (biz, guest, 2, now() + interval '100 minutes', 'CONFIRMED', now() - interval '3 days', now() - interval '5 minutes')
  returning id into t_late_ok;
  insert into public.reservations (business_id, guest_id, party_size, reserved_for, status, created_at)
  values (biz, guest, 2, now() + interval '105 minutes', 'PENDING', now() - interval '3 days')
  returning id into t_pending;
  insert into public.reservations (business_id, guest_id, party_size, reserved_for, status, created_at, responded_at)
  values (biz, guest, 4, tomorrow_at, 'CONFIRMED', now() - interval '3 days', now() - interval '2 days')
  returning id into t_tomorrow;

  perform private.send_reservation_reminders();

  -- 2.
  select count(*) into n from public.reservation_reminders where reservation_id = t_soon and stage = 'soon';
  if n <> 1 then raise exception 'PROBE_FAIL p1_c 2: % soon rows for a table 90 minutes away', n; end if;
  if not exists (select 1 from public.notifications
                  where user_id = guest and title like 'Your table at %' and href = '/bookings?side=stays'
                    and body like '%Probe Reminder Grill%') then
    raise exception 'PROBE_FAIL p1_c 2: the soon notice did not reach the guest';
  end if;

  -- 3.
  if exists (select 1 from public.reservation_reminders where reservation_id in (t_late, t_late_ok, t_pending)) then
    raise exception 'PROBE_FAIL p1_c 3: a table booked or confirmed inside two hours, or a request, was reminded';
  end if;

  -- 4.
  select count(*) into bad from public.reservation_reminders rr
   where rr.reservation_id in (t_soon, t_late, t_late_ok, t_pending, t_tomorrow)
     and rr.stage = 'eve'
     and not (lagos::date = (rr.reserved_for at time zone 'Africa/Lagos')::date - 1
              and lagos::time >= time '19:00'
              and now() < rr.reserved_for - interval '2 hours');
  if bad > 0 then raise exception 'PROBE_FAIL p1_c 4: % eve rows outside the evening before', bad; end if;
  select count(*) into n from public.reservation_reminders where reservation_id = t_tomorrow and stage = 'eve';
  if lagos::time >= time '19:00' and n <> 1 then
    raise exception 'PROBE_FAIL p1_c 4: after 19:00 Lagos, a table tomorrow evening got % eve rows', n;
  end if;
  if lagos::time < time '19:00' and n <> 0 then
    raise exception 'PROBE_FAIL p1_c 4: before 19:00 Lagos, a table tomorrow evening was already reminded';
  end if;

  -- 5.
  select count(*) into before_count from public.reservation_reminders
   where reservation_id in (t_soon, t_late, t_late_ok, t_pending, t_tomorrow);
  perform private.send_reservation_reminders();
  select count(*) into n from public.reservation_reminders
   where reservation_id in (t_soon, t_late, t_late_ok, t_pending, t_tomorrow);
  if n <> before_count then raise exception 'PROBE_FAIL p1_c 5: a second run wrote % more rows', n - before_count; end if;

  raise exception 'PROBE_OK p1_c_reservation_reminders';
end $$;
