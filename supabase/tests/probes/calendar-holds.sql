-- HOST C2b (30 September 2026): a booking on another site holds ONE room of a
-- room type, and every writer respects the hold. Run after
-- 20260930104350_host_c2b_rooms_held_by_other_sites.sql (applied 30 September 2026); the whole probe
-- rolls back (PROBE_OK is raised at the end).
--
--  * a free night: one room held, the others still for sale;
--  * the host's absolute write is clamped, and a deliberate lower number stays;
--  * a night full of Vallo guests is a conflict, told once, and a cancelling
--    Vallo guest's room goes to the hold;
--  * a night with no inventory row: plans closed as the fallback, and the row
--    the host creates later is born clamped, the closure lifted;
--  * dropping the nights gives every room back; a request over the total is
--    still refused;
--  * round 3: the host's UPSERT keeps its request, a forged units_held_back is
--    recomputed, two imports on a night with no row do not keep it closed,
--    and the host's own closure survives an import's release.
do $$
declare
  host  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  biz uuid; acc uuid; rt uuid; rp uuid; pol uuid; imp uuid; imp2 uuid;
  today date := (now() at time zone 'Africa/Lagos')::date;
  r record; res jsonb; n int;
begin
  insert into public.businesses (owner_id, kind, name, slug, status, source)
  values (host, 'hotel', 'Probe Holds Hotel', 'probe-holds-' || gen_random_uuid(), 'PUBLISHED', 'first_party') returning id into biz;
  insert into public.accommodations (business_id, name, slug, status)
  values (biz, 'Probe Holds Hotel', 'probe-holds-a-' || gen_random_uuid(), 'PUBLISHED') returning id into acc;
  insert into public.room_types (accommodation_id, name, category, sleeps, units_total, base_rate_minor, status)
  values (acc, 'Probe triple', 'double', 2, 3, 5000000, 'PUBLISHED') returning id into rt;
  select id into pol from public.cancellation_policies limit 1;
  insert into public.rate_plans (room_type_id, name, cancellation_policy_id, rate_minor, currency, min_stay_nights, active)
  values (rt, 'Probe room only', pol, 5000000, 'NGN', 1, true) returning id into rp;
  insert into public.room_inventory (room_type_id, date, units_open)
  select rt, today + g, 3 from generate_series(1, 20) g;
  perform private.reserve_room_nights(rt, today + 3, today + 4, 3, rp);
  insert into public.calendar_imports (owner_id, room_type_id, source, url)
  values (host, rt, 'airbnb', 'https://www.airbnb.com/calendar/ical/probe.ics') returning id into imp;

  res := public.apply_calendar_import(imp, array[today + 3, today + 5, today + 400]);
  if (res ->> 'conflicts')::int <> 1 then raise exception 'PROBE_FAIL calendar-holds: expected one conflict, got %', res; end if;

  select * into r from public.room_inventory where room_type_id = rt and date = today + 5;
  if r.units_open <> 2 or r.units_held_back <> 1 then raise exception 'PROBE_FAIL calendar-holds: a free night is % open, % held back', r.units_open, r.units_held_back; end if;
  if exists (select 1 from public.rate_calendar where rate_plan_id = rp and date = today + 5 and closed) then
    raise exception 'PROBE_FAIL calendar-holds: a night with a row had its plans closed';
  end if;

  update public.room_inventory set units_open = 3 where room_type_id = rt and date = today + 5;
  select * into r from public.room_inventory where room_type_id = rt and date = today + 5;
  if r.units_open <> 2 then raise exception 'PROBE_FAIL calendar-holds: the host put the held room back on sale (%)', r.units_open; end if;

  perform private.release_room_nights(rt, today + 3, today + 4, 1);
  select * into r from public.room_inventory where room_type_id = rt and date = today + 3;
  if r.units_open <> r.units_booked then raise exception 'PROBE_FAIL calendar-holds: a cancelled Vallo room went back on sale (% open, % booked)', r.units_open, r.units_booked; end if;

  if not exists (select 1 from public.rate_calendar where rate_plan_id = rp and date = today + 400 and closed) then
    raise exception 'PROBE_FAIL calendar-holds: a night with no row was not closed';
  end if;
  insert into public.room_inventory (room_type_id, date, units_open) values (rt, today + 400, 3);
  select * into r from public.room_inventory where room_type_id = rt and date = today + 400;
  if r.units_open <> 2 then raise exception 'PROBE_FAIL calendar-holds: a row created later was born with % open', r.units_open; end if;
  if exists (select 1 from public.rate_calendar where rate_plan_id = rp and date = today + 400 and closed) then
    raise exception 'PROBE_FAIL calendar-holds: the fallback closure outlived the row';
  end if;

  res := public.apply_calendar_import(imp, array[today + 3, today + 5, today + 400]);
  if (select count(*) from public.notifications where user_id = host and title = 'A night may be booked twice' and created_at > now() - interval '1 minute') > 1 then
    raise exception 'PROBE_FAIL calendar-holds: the same conflict was told twice';
  end if;

  begin
    update public.room_inventory set units_open = 4 where room_type_id = rt and date = today + 5;
    raise exception 'PROBE_FAIL calendar-holds: a request over the total was taken';
  exception when check_violation then null; end;

  res := public.apply_calendar_import(imp, array[]::date[]);
  select count(*) into n from public.room_inventory where room_type_id = rt and date in (today + 5, today + 400) and units_open = 3 and units_held_back = 0;
  if n <> 2 then raise exception 'PROBE_FAIL calendar-holds: dropping the nights gave back % of 2 rooms', n; end if;

  -- Round 3. A second linked calendar, and a night the host closed themselves.
  insert into public.calendar_imports (owner_id, room_type_id, source, url)
  values (host, rt, 'booking_com', 'https://admin.booking.com/probe.ics') returning id into imp2;
  insert into public.rate_calendar (rate_plan_id, date, closed) values (rp, today + 402, true);
  res := public.apply_calendar_import(imp, array[today + 5, today + 410, today + 402]);
  res := public.apply_calendar_import(imp2, array[today + 5, today + 410]);

  -- The host's UPSERT asks for 3 while two rooms are held: 1 on sale, 2 remembered.
  insert into public.room_inventory (room_type_id, date, units_open) values (rt, today + 5, 3)
  on conflict (room_type_id, date) do update set units_open = excluded.units_open;
  select * into r from public.room_inventory where room_type_id = rt and date = today + 5;
  if r.units_open <> 1 or r.units_held_back <> 2 then
    raise exception 'PROBE_FAIL calendar-holds: the upsert kept % open, % held back', r.units_open, r.units_held_back;
  end if;

  -- A forged units_held_back is recomputed, and a reservation cannot use it.
  update public.room_inventory set units_held_back = 50 where room_type_id = rt and date = today + 6;
  select * into r from public.room_inventory where room_type_id = rt and date = today + 6;
  if r.units_held_back <> 0 then raise exception 'PROBE_FAIL calendar-holds: a forged hold-back stood (%)', r.units_held_back; end if;
  perform private.reserve_room_nights(rt, today + 6, today + 7, 1, rp);
  select * into r from public.room_inventory where room_type_id = rt and date = today + 6;
  if r.units_open > 3 then raise exception 'PROBE_FAIL calendar-holds: % rooms on sale of 3', r.units_open; end if;

  -- Two imports on a night with no row: the imports' closure only, lifted by the row.
  if not exists (select 1 from public.rate_calendar where rate_plan_id = rp and date = today + 410 and closed and import_closed and not host_closed) then
    raise exception 'PROBE_FAIL calendar-holds: two imports did not close a night with no row as the imports';
  end if;
  insert into public.room_inventory (room_type_id, date, units_open) values (rt, today + 410, 3)
  on conflict (room_type_id, date) do update set units_open = excluded.units_open;
  if exists (select 1 from public.rate_calendar where rate_plan_id = rp and date = today + 410 and closed) then
    raise exception 'PROBE_FAIL calendar-holds: a night held by two imports stayed closed after its row came';
  end if;
  select * into r from public.room_inventory where room_type_id = rt and date = today + 410;
  if r.units_open <> 1 then raise exception 'PROBE_FAIL calendar-holds: two holds left % open of 3', r.units_open; end if;

  res := public.apply_calendar_import(imp, array[]::date[]);
  res := public.apply_calendar_import(imp2, array[]::date[]);
  select * into r from public.room_inventory where room_type_id = rt and date = today + 5;
  if r.units_open <> 3 or r.units_held_back <> 0 then
    raise exception 'PROBE_FAIL calendar-holds: the upserted request did not come back (% open)', r.units_open;
  end if;
  if not exists (select 1 from public.rate_calendar where rate_plan_id = rp and date = today + 402 and closed and host_closed) then
    raise exception 'PROBE_FAIL calendar-holds: the host''s own closure was lifted by an import';
  end if;

  raise exception 'PROBE_OK calendar-holds';
end
$$;
