-- B4 lifecycle probe for the LIVE project: the same cases as
-- scripts/probes/b4_lifecycle.sh, run through the Supabase MCP
-- AFTER the two B4 migrations are applied, inside ONE transaction that ends
-- in ROLLBACK. Nothing here is ever persisted: the three auth users, the agent,
-- the listings, the bookings, the events, the notifications and the alerts
-- all vanish with the rollback. Run the whole file as one statement batch.
--
-- Every assertion raises on failure, so a PASS is the absence of an error
-- plus the NOTICE lines. The final ROLLBACK is unconditional; if any RAISE
-- fires, the transaction is aborted and nothing persists either.
--
-- What this proves on the live schema that the local probe cannot: the real
-- notify_booking_change and private.notify with the preference lookup, the
-- real demo-refusal trigger (the listing is is_demo = false), the real
-- has_role, the real GiST exclusion beside the sweep, the service-role
-- grants on the public doors, and cron_job_failures reading the real
-- cron.job_run_details (available must be true on this project).

begin;

-- Fixed ids, distinct from every M-probe id used before.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-4000-8000-00000000b4a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b4-probe-host@example.invalid',  'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-4000-8000-00000000b4a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b4-probe-guest@example.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-4000-8000-00000000b4a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b4-probe-admin@example.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}');

insert into public.user_roles (user_id, role) values ('00000000-0000-4000-8000-00000000b4a3', 'admin');

-- A host and a non-demo listing, with only the NOT NULL columns the
-- generated types name (agents: user_id, display_name; listings: agent_id,
-- title, property_type). is_demo false so the demo-refusal trigger lets a
-- booking exist; the status only matters to readers, not to the functions.
insert into public.agents (id, user_id, display_name)
values ('00000000-0000-4000-8000-00000000b4b1', '00000000-0000-4000-8000-00000000b4a1', 'B4 probe host');

-- Three listings, because bookings_no_overlap (the real GiST exclusion)
-- refuses live stays that overlap on one listing, and the cases below do.
insert into public.listings (id, agent_id, title, property_type, is_demo, status)
values ('00000000-0000-4000-8000-00000000b4c1', '00000000-0000-4000-8000-00000000b4b1', 'B4 probe flat one',   'shortlet', false, 'PUBLISHED'),
       ('00000000-0000-4000-8000-00000000b4c2', '00000000-0000-4000-8000-00000000b4b1', 'B4 probe flat two',   'shortlet', false, 'PUBLISHED'),
       ('00000000-0000-4000-8000-00000000b4c3', '00000000-0000-4000-8000-00000000b4b1', 'B4 probe flat three', 'shortlet', false, 'PUBLISHED');

do $$
declare
  today date := (now() at time zone 'Africa/Lagos')::date;
  price bigint := 5000000;
begin
  -- H1 stale unpaid hold; H2 stale PAID hold; H3 fresh hold.
  insert into public.bookings (id, listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status, created_at)
  values ('00000000-0000-4000-8000-00000000b4d1', '00000000-0000-4000-8000-00000000b4c1', '00000000-0000-4000-8000-00000000b4a2', today + 10, today + 12, 2, price, price * 2, price * 2, 'PENDING', now() - interval '50 hours'),
         ('00000000-0000-4000-8000-00000000b4d2', '00000000-0000-4000-8000-00000000b4c1', '00000000-0000-4000-8000-00000000b4a2', today + 20, today + 21, 1, price, price, price, 'PENDING', now() - interval '50 hours'),
         ('00000000-0000-4000-8000-00000000b4d3', '00000000-0000-4000-8000-00000000b4c1', '00000000-0000-4000-8000-00000000b4a2', today + 30, today + 31, 1, price, price, price, 'PENDING', now() - interval '10 hours');
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, status)
  values ('00000000-0000-4000-8000-00000000b4d2', 'wallet', 'b4-probe-paid-hold', price, 'SUCCESSFUL');
  insert into public.availability (listing_id, date, status) values
    ('00000000-0000-4000-8000-00000000b4c1', today + 10, 'booked'),
    ('00000000-0000-4000-8000-00000000b4c1', today + 11, 'unavailable');

  -- C1 paid, ended yesterday; C2 unpaid, ended; C3 ends today.
  insert into public.bookings (id, listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values ('00000000-0000-4000-8000-00000000b4e1', '00000000-0000-4000-8000-00000000b4c1', '00000000-0000-4000-8000-00000000b4a2', today - 3, today - 1, 2, price, price * 2, price * 2, 'CONFIRMED'),
         ('00000000-0000-4000-8000-00000000b4e2', '00000000-0000-4000-8000-00000000b4c1', '00000000-0000-4000-8000-00000000b4a2', today - 6, today - 4, 2, price, price * 2, price * 2, 'CONFIRMED'),
         ('00000000-0000-4000-8000-00000000b4e3', '00000000-0000-4000-8000-00000000b4c2', '00000000-0000-4000-8000-00000000b4a2', today - 2, today, 2, price, price * 2, price * 2, 'CONFIRMED');
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, status)
  values ('00000000-0000-4000-8000-00000000b4e1', 'wallet', 'b4-probe-paid-stay', price * 2, 'SUCCESSFUL');

  -- N1 arrived yesterday, three nights, the host records the no show. N3 arrives tomorrow. N4 arrived today, admin records.
  insert into public.bookings (id, listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values ('00000000-0000-4000-8000-00000000b4f1', '00000000-0000-4000-8000-00000000b4c3', '00000000-0000-4000-8000-00000000b4a2', today - 1, today + 2, 3, price, price * 3, price * 3, 'CONFIRMED'),
         ('00000000-0000-4000-8000-00000000b4f3', '00000000-0000-4000-8000-00000000b4c2', '00000000-0000-4000-8000-00000000b4a2', today + 1, today + 2, 1, price, price, price, 'CONFIRMED'),
         ('00000000-0000-4000-8000-00000000b4f4', '00000000-0000-4000-8000-00000000b4c2', '00000000-0000-4000-8000-00000000b4a2', today, today + 1, 1, price, price, price, 'CONFIRMED');
  insert into public.availability (listing_id, date, status) values
    ('00000000-0000-4000-8000-00000000b4c3', today - 1, 'booked'),
    ('00000000-0000-4000-8000-00000000b4c3', today, 'booked'),
    ('00000000-0000-4000-8000-00000000b4c3', today + 1, 'booked'),
    -- D1: an orphan night nobody holds.
    ('00000000-0000-4000-8000-00000000b4c1', today + 40, 'booked');
end $$;

-- Count what exists before, so the assertions are about THIS probe's rows.
create temp table b4_before as
select (select count(*) from public.notifications) as notifications,
       (select count(*) from public.booking_state_events) as events;

-- One statement each, in this order: the second no-show call must see the
-- first's write, which a single UNION ALL would not promise.
select 'expire_booking_holds'  as fn, public.expire_booking_holds(interval '48 hours', 500) as result;
select 'complete_ended_stays'  as fn, public.complete_ended_stays(500) as result;
select 'no_show N1 by host'    as fn, public.record_booking_no_show('00000000-0000-4000-8000-00000000b4f1', '00000000-0000-4000-8000-00000000b4a1', 'Called twice, no answer.') as result;
select 'no_show N1 again'      as fn, public.record_booking_no_show('00000000-0000-4000-8000-00000000b4f1', '00000000-0000-4000-8000-00000000b4a1', null) as result;
select 'no_show N3 too early'  as fn, public.record_booking_no_show('00000000-0000-4000-8000-00000000b4f3', '00000000-0000-4000-8000-00000000b4a1', null) as result;
select 'no_show N4 by admin'   as fn, public.record_booking_no_show('00000000-0000-4000-8000-00000000b4f4', '00000000-0000-4000-8000-00000000b4a3', null) as result;
select 'inventory_drift'       as fn, public.inventory_drift(200) as result;
select 'cron_job_failures'     as fn, public.cron_job_failures(interval '25 hours', 100) as result;

do $$
declare
  today date := (now() at time zone 'Africa/Lagos')::date;
  s text; n integer; drift jsonb;
begin
  -- A stranger (the guest) is refused by the function itself.
  begin
    perform public.record_booking_no_show('00000000-0000-4000-8000-00000000b4f3', '00000000-0000-4000-8000-00000000b4a2', null);
    raise exception 'FAIL: a stranger recorded a no show';
  exception when insufficient_privilege then
    raise notice 'PASS: a stranger is refused (42501)';
  end;

  select status into s from public.bookings where id = '00000000-0000-4000-8000-00000000b4d1';
  if s <> 'CANCELLED' then raise exception 'FAIL H1: expected CANCELLED, got %', s; end if;
  select count(*) into n from public.availability where listing_id = '00000000-0000-4000-8000-00000000b4c1' and date = today + 10;
  if n <> 0 then raise exception 'FAIL H1: booked night not released'; end if;
  select count(*) into n from public.availability where listing_id = '00000000-0000-4000-8000-00000000b4c1' and date = today + 11 and status = 'unavailable';
  if n <> 1 then raise exception 'FAIL H1: hand-closed night was touched'; end if;
  select count(*) into n from public.notifications where user_id = '00000000-0000-4000-8000-00000000b4a2' and title = 'Booking cancelled';
  if n < 1 then raise exception 'FAIL H1: guest not told'; end if;
  raise notice 'PASS H1: stale unpaid hold released, night freed, hand-closed night kept, guest told';

  select status into s from public.bookings where id = '00000000-0000-4000-8000-00000000b4d2';
  if s <> 'PENDING' then raise exception 'FAIL H2: paid pending booking was moved to %', s; end if;
  select status into s from public.bookings where id = '00000000-0000-4000-8000-00000000b4d3';
  if s <> 'PENDING' then raise exception 'FAIL H3: fresh hold was moved to %', s; end if;
  raise notice 'PASS H2/H3: paid PENDING booking untouched, fresh hold kept';

  select status into s from public.bookings where id = '00000000-0000-4000-8000-00000000b4e1';
  if s <> 'COMPLETED' then raise exception 'FAIL C1: expected COMPLETED, got %', s; end if;
  select count(*) into n from public.notifications where user_id = '00000000-0000-4000-8000-00000000b4a2' and title = 'Stay complete';
  if n <> 1 then raise exception 'FAIL C1: guest told % times', n; end if;
  select count(*) into n from public.notifications where user_id = '00000000-0000-4000-8000-00000000b4a1' and title = 'Stay complete';
  if n <> 1 then raise exception 'FAIL C1: host told % times', n; end if;
  select status into s from public.bookings where id = '00000000-0000-4000-8000-00000000b4e2';
  if s <> 'CONFIRMED' then raise exception 'FAIL C2: unpaid ended stay was moved to %', s; end if;
  select status into s from public.bookings where id = '00000000-0000-4000-8000-00000000b4e3';
  if s <> 'CONFIRMED' then raise exception 'FAIL C3: stay ending today was moved to %', s; end if;
  raise notice 'PASS C1/C2/C3: paid ended stay completed and both sides told once; unpaid and same-day stays kept';

  select status into s from public.bookings where id = '00000000-0000-4000-8000-00000000b4f1';
  if s <> 'NO_SHOW' then raise exception 'FAIL N1: expected NO_SHOW, got %', s; end if;
  select count(*) into n from public.booking_state_events where booking_id = '00000000-0000-4000-8000-00000000b4f1' and to_status = 'NO_SHOW' and actor_id = '00000000-0000-4000-8000-00000000b4a1' and note = 'Called twice, no answer.';
  if n <> 1 then raise exception 'FAIL N1: expected 1 state event with actor and note, got %', n; end if;
  select count(*) into n from public.availability where listing_id = '00000000-0000-4000-8000-00000000b4c3' and date in (today, today + 1);
  if n <> 0 then raise exception 'FAIL N1: nights ahead not released'; end if;
  select count(*) into n from public.availability where listing_id = '00000000-0000-4000-8000-00000000b4c3' and date = today - 1 and status = 'booked';
  if n <> 1 then raise exception 'FAIL N1: the past night was touched'; end if;
  select count(*) into n from public.notifications where user_id = '00000000-0000-4000-8000-00000000b4a2' and title = 'Stay recorded as not attended';
  if n <> 2 then raise exception 'FAIL N1/N4: guest told % times, expected 2', n; end if;
  select count(*) into n from public.notifications where user_id = '00000000-0000-4000-8000-00000000b4a1' and title = 'Stay recorded as no show';
  if n <> 1 then raise exception 'FAIL N4: host told % times of the admin override', n; end if;
  select status into s from public.bookings where id = '00000000-0000-4000-8000-00000000b4f3';
  if s <> 'CONFIRMED' then raise exception 'FAIL N3: not-yet-arrived stay was moved to %', s; end if;
  raise notice 'PASS N1/N3/N4: no show by host and by admin recorded, too-early refused, notifications right';

  drift := public.inventory_drift(200);
  select count(*) into n from jsonb_array_elements(drift -> 'orphan_nights') e where (e ->> 'listing_id') = '00000000-0000-4000-8000-00000000b4c1' and (e ->> 'date')::date = today + 40;
  if n <> 1 then raise exception 'FAIL D1: orphan night not reported'; end if;
  select count(*) into n from jsonb_array_elements(drift -> 'missing_nights') e where (e ->> 'booking_id') = '00000000-0000-4000-8000-00000000b4f3';
  if n <> 1 then raise exception 'FAIL D2: missing night not reported'; end if;
  if (drift -> 'room_spine')::boolean then raise notice 'NOTE: room_spine is true, so M6 has landed; the live count branch ran'; else raise notice 'NOTE: room_spine is false, M6 not applied, any sold room unit would be drift'; end if;
  select count(*) into n from public.availability where date = today + 40 and status = 'booked' and listing_id = '00000000-0000-4000-8000-00000000b4c1';
  if n <> 1 then raise exception 'FAIL drift: the sweep corrected the calendar'; end if;
  raise notice 'PASS D1/D2: orphan and missing nights reported, nothing corrected';

  if not (public.cron_job_failures(interval '25 hours', 100) -> 'available')::boolean then
    raise exception 'FAIL cron watch: cron.job_run_details not readable on the live project';
  end if;
  raise notice 'PASS cron watch: cron.job_run_details is readable; failures in the last 25h: %', jsonb_array_length(public.cron_job_failures(interval '25 hours', 100) -> 'failures');

  if jsonb_array_length(public.expire_booking_holds(interval '48 hours', 500) -> 'released') <> 0 then raise exception 'FAIL: second hold sweep released something'; end if;
  if jsonb_array_length(public.complete_ended_stays(500) -> 'completed') <> 0 then raise exception 'FAIL: second completion sweep completed something'; end if;
  select count(*) - (select events from b4_before) into n from public.booking_state_events;
  if n <> 4 then raise exception 'FAIL idempotence: expected 4 new state events, got %', n; end if;
  raise notice 'PASS idempotence: second runs move nothing';

  raise notice 'ALL PASS. Rolling back.';
end $$;

rollback;
