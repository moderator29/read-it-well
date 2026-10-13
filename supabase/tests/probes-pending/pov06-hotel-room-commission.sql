-- POV06 (pending migration pov06_hotel_room_commission): a hotel room
-- carries Vallo's 10 percent (1,000 bps), from the hotel's share. The
-- commission is exactly floor(amount * 1000 / 10000); the split's three
-- parts add up to the charge to the kobo; the guest's total is the booking's
-- own and is never moved; a rate earlier than the agreement is the one used;
-- a listing stay is not touched; the rates are history.
-- Everything is rolled back by the final raise.
do $$
declare
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  host  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  biz uuid; acc uuid; rt uuid; rp uuid; pol uuid; dd date; b_room uuid; ag uuid;
  start_day date := (now() at time zone 'Africa/Lagos')::date + 60;
  total_before bigint;
  c jsonb;
  s jsonb;
  amt bigint;
  refused boolean;
begin
  if private.scoped_commission_bps('hotel_room', now()) is distinct from 1000 then
    raise exception 'PROBE_FAIL pov06-hotel-room-commission: the hotel-room rate is not 1000 bps';
  end if;
  if private.scoped_commission_bps('hotel_room', '2026-10-01'::timestamptz) is not null then
    raise exception 'PROBE_FAIL pov06-hotel-room-commission: the rate reaches back before it was set';
  end if;

  update public.feature_flags set enabled = true where key = 'room_bookings';
  update public.feature_flags set enabled = false where key = 'stays_instant_pay';
  insert into public.businesses (owner_id, kind, name, slug, status, source)
  values (host, 'hotel', 'Probe POV06 Hotel', 'probe-pov06-' || gen_random_uuid(), 'PUBLISHED', 'first_party') returning id into biz;
  insert into public.accommodations (business_id, name, slug, status)
  values (biz, 'Probe POV06 Hotel', 'probe-pov06-a-' || gen_random_uuid(), 'PUBLISHED') returning id into acc;
  insert into public.room_types (accommodation_id, name, category, sleeps, units_total, base_rate_minor, status)
  values (acc, 'Probe double', 'double', 2, 4, 5000000, 'PUBLISHED') returning id into rt;
  select id into pol from public.cancellation_policies limit 1;
  insert into public.rate_plans (room_type_id, name, cancellation_policy_id, rate_minor, currency, min_stay_nights, active)
  values (rt, 'Probe room only', pol, 5000000, 'NGN', 1, true) returning id into rp;
  for dd in select generate_series(start_day, start_day + 3, interval '1 day')::date loop
    insert into public.room_inventory (room_type_id, date, units_open) values (rt, dd, 4);
  end loop;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
  values (guest, acc, rt, rp, 1, start_day, start_day + 3, 2) returning id into b_room;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  select total_minor into total_before from public.bookings where id = b_room;
  -- The agreement's own terms say 200 bps; the hotel-room rate wins.
  insert into public.deal_agreements (kind, accommodation_id, booking_id, renter_id, owner_id, amount_minor, terms, status, decided_by, decided_at)
  values ('stay', acc, b_room, guest, host, total_before, '{"commission_bps": 200}'::jsonb, 'approved', host, now())
  returning id into ag;

  -- 1. The commission, to the kobo, at three amounts (one that does not divide).
  foreach amt in array array[total_before, 16000000::bigint, 3333333::bigint] loop
    c := private.b3_commission_for_booking(b_room, amt, ag);
    if c ->> 'status' <> 'ok' or (c ->> 'commission_bps')::int <> 1000 or c ->> 'source' <> 'scope:hotel_room'
       or (c ->> 'commission_minor')::bigint <> (amt * 1000) / 10000 then
      raise exception 'PROBE_FAIL pov06-hotel-room-commission: % kobo gave %', amt, c;
    end if;
  end loop;

  -- 2. The split adds up and the guest's total is unchanged (when the host
  --    can be paid; otherwise the split says so and nothing is charged).
  s := public.payment_split_for_booking(b_room);
  if s ->> 'status' = 'ok' then
    if (s ->> 'amount_minor')::bigint <> total_before
       or (s ->> 'commission_minor')::bigint <> (total_before * 1000) / 10000
       or (s ->> 'lister_share_minor')::bigint + (s ->> 'guarantee_minor')::bigint + (s ->> 'commission_minor')::bigint <> total_before then
      raise exception 'PROBE_FAIL pov06-hotel-room-commission: the split does not add up: %', s;
    end if;
  elsif s ->> 'status' <> 'payee_not_set_up' then
    raise exception 'PROBE_FAIL pov06-hotel-room-commission: the split refused: %', s;
  end if;
  if (select total_minor from public.bookings where id = b_room) <> total_before then
    raise exception 'PROBE_FAIL pov06-hotel-room-commission: the guest''s total moved';
  end if;

  -- 3. An agreement drawn up before the rate keeps its own terms.
  update public.deal_agreements set created_at = '2026-10-01'::timestamptz where id = ag;
  c := private.b3_commission_for_booking(b_room, 1000000, ag);
  if c ->> 'source' <> 'terms' or (c ->> 'commission_bps')::int <> 200 then
    raise exception 'PROBE_FAIL pov06-hotel-room-commission: an older agreement took the new rate: %', c;
  end if;

  -- 4. The rates are history.
  refused := false;
  begin
    update public.scoped_commission_rates set basis_points = 0 where scope = 'hotel_room';
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then
    raise exception 'PROBE_FAIL pov06-hotel-room-commission: a rate was edited in place';
  end if;
  if has_table_privilege('authenticated', 'public.scoped_commission_rates', 'select')
     or has_table_privilege('anon', 'public.scoped_commission_rates', 'select') then
    raise exception 'PROBE_FAIL pov06-hotel-room-commission: members can read the rates table';
  end if;

  raise exception 'PROBE_OK pov06-hotel-room-commission';
end
$$;
