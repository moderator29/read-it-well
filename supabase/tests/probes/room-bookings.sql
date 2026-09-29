-- ROOM BOOKINGS (29 September 2026): a hotel room is requested, held, accepted,
-- agreed, paid with the host's split and shown in the host's earnings, the
-- same money path as every stay. The fixture is a published hotel owned by
-- the QA admin with one room type (2 rooms) and a plan whose calendar prices
-- one night differently; the QA member is the guest.
--
--  * with room_bookings OFF a room booking is refused;
--  * the price is the database's: the calendar night plus the plan's nights,
--    times the rooms, whatever the client sent;
--  * the nights are held: a third room over the two that exist is refused;
--  * a guest cannot book their own place, nor a closed night;
--  * the host (business owner) sees the booking, a stranger does not;
--  * accepting draws up the stay agreement with the business owner and the
--    accommodation; approved, the split pays the host's subaccount;
--  * settlement marks it paid, and my_earnings_history names the hotel;
--  * cancelling another booking gives its nights back.
do $$
declare
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  host  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  biz uuid; acc uuid; rt uuid; rp uuid; pol uuid;
  b1 uuid; b2 uuid;
  ag public.deal_agreements%rowtype;
  split jsonb; settled jsonb;
  d date;
  start_day date := (now() at time zone 'Africa/Lagos')::date + 10;
  r record; n int; ref text := 'rm-book-' || gen_random_uuid();
  third uuid;
begin
  select u.id into third from auth.users u where u.id not in (guest, host) order by u.created_at limit 1;
  -- 29 September: the console's second factor (see sec-console-mfa).
  insert into public.console_step_ups (user_id, session_id, expires_at)
  select console_probe_uid, '00000000-0000-4000-8000-00000000c0de', now() + interval '1 hour'
    from (select user_id from public.user_roles where role in ('admin', 'super_admin')
          union select '03f3dd52-ea28-4852-9abe-e5b0a67c2a43'::uuid
          union select '957b3bd2-cce3-425d-bba9-5cd876ca3d62'::uuid) s(console_probe_uid)
  on conflict (user_id, session_id) do update set expires_at = excluded.expires_at;

  -- The fixture, written as the platform would after review.
  insert into public.businesses (owner_id, kind, name, slug, status, source)
  values (host, 'hotel', 'Probe Rooms Hotel', 'probe-rooms-' || gen_random_uuid(), 'PUBLISHED', 'first_party')
  returning id into biz;
  insert into public.accommodations (business_id, name, slug, status)
  values (biz, 'Probe Rooms Hotel', 'probe-rooms-a-' || gen_random_uuid(), 'PUBLISHED') returning id into acc;
  insert into public.room_types (accommodation_id, name, category, sleeps, units_total, base_rate_minor, status)
  values (acc, 'Probe double', 'double', 2, 2, 5000000, 'PUBLISHED') returning id into rt;
  select id into pol from public.cancellation_policies limit 1;
  insert into public.rate_plans (room_type_id, name, cancellation_policy_id, rate_minor, currency, min_stay_nights, active)
  values (rt, 'Probe room only', pol, 5000000, 'NGN', 1, true) returning id into rp;
  -- The second night costs more; the fifth night is closed.
  insert into public.rate_calendar (rate_plan_id, date, rate_minor, closed) values (rp, start_day + 1, 6000000, false);
  insert into public.rate_calendar (rate_plan_id, date, rate_minor, closed) values (rp, start_day + 4, null, true);
  for d in select generate_series(start_day, start_day + 9, interval '1 day')::date loop
    insert into public.room_inventory (room_type_id, date, units_open) values (rt, d, 2);
  end loop;
  insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at,
                                    is_default, paystack_subaccount_code)
  values (host, '058', 'Probe Bank', '0123456789', 'Probe Host', now(), true, 'ACCT_probe_host');

  -- OFF: refused whoever writes it.
  update public.feature_flags set enabled = false where key = 'room_bookings';
  begin
    insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
    values (guest, acc, rt, rp, 1, start_day, start_day + 3, 2);
    raise exception 'PROBE_FAIL room-bookings: a room was booked with room_bookings off';
  exception when check_violation then
    if sqlerrm not like 'room_bookings_off%' then raise; end if;
  end;
  update public.feature_flags set enabled = true where key = 'room_bookings';

  -- The guest asks for one room for three nights, sending a price of 1 kobo.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults,
                               price_per_night_minor, subtotal_minor, total_minor, nights)
  values (guest, acc, rt, rp, 1, start_day, start_day + 3, 2, 1, 1, 1, 3)
  returning id into b1;
  select nights, subtotal_minor, total_minor, status::text as st into r from public.bookings where id = b1;
  if r.nights <> 3 or r.total_minor <> 5000000 + 6000000 + 5000000 or r.st <> 'PENDING' then
    raise exception 'PROBE_FAIL room-bookings: the booking was priced %', row_to_json(r);
  end if;
  -- One pending request per place per guest.
  begin
    insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
    values (guest, acc, rt, rp, 1, start_day + 5, start_day + 6, 2);
    raise exception 'PROBE_FAIL room-bookings: a second pending request at the same place was accepted';
  exception when check_violation then null; end;
  -- A closed night is refused.
  reset role;
  begin
    insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
    values (guest, acc, rt, rp, 1, start_day + 3, start_day + 6, 2);
    raise exception 'PROBE_FAIL room-bookings: a closed night was sold';
  exception when others then
    if sqlstate not in ('23P01', '22023') then raise; end if;
  end;
  -- The nights are held: two rooms on the first night would be three of two.
  begin
    insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
    values (third, acc, rt, rp, 2, start_day, start_day + 1, 2);
    raise exception 'PROBE_FAIL room-bookings: three rooms were sold where two exist';
  exception when check_violation then
    -- From reserve_room_nights, not from the pricing checks.
    if sqlerrm like 'room_%' or sqlerrm like 'booking_%' then raise; end if;
  end;
  select units_booked into n from public.room_inventory where room_type_id = rt and date = start_day;
  if n <> 1 then raise exception 'PROBE_FAIL room-bookings: first night holds % room(s), not 1', n; end if;
  -- The host cannot book their own place.
  begin
    insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
    values (host, acc, rt, rp, 1, start_day + 6, start_day + 7, 1);
    raise exception 'PROBE_FAIL room-bookings: the host booked their own room';
  exception when check_violation then null; end;

  -- The host sees it through RLS; a stranger does not.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', host, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  select count(*) into n from public.bookings where id = b1;
  if n <> 1 then raise exception 'PROBE_FAIL room-bookings: the host cannot see the booking'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  select count(*) into n from public.bookings where id = b1;
  if n <> 0 then raise exception 'PROBE_FAIL room-bookings: a stranger can see the booking'; end if;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- The host accepts (the app's accept action writes this as the service role).
  update public.bookings set status = 'CONFIRMED' where id = b1 and status = 'PENDING';
  select * into ag from public.deal_agreements where booking_id = b1;
  if ag.id is null or ag.owner_id <> host or ag.accommodation_id <> acc or ag.listing_id is not null
     or ag.amount_minor <> 16000000 or ag.kind <> 'stay' then
    raise exception 'PROBE_FAIL room-bookings: the agreement is %', row_to_json(ag);
  end if;
  update public.deal_agreements set status = 'approved', decided_at = now(), decided_by = host where id = ag.id;

  -- The split pays the host's subaccount.
  split := public.payment_split_for_booking(b1);
  if split ->> 'status' <> 'ok' or split ->> 'payee_subaccount_code' <> 'ACCT_probe_host'
     or (split ->> 'payee_user_id')::uuid <> host
     or (split ->> 'amount_minor')::bigint <> 16000000 then
    raise exception 'PROBE_FAIL room-bookings: split %', split;
  end if;
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id,
    payee_user_id, payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor,
    paystack_mode)
  values (b1, 'paystack', ref, 16000000, 'NGN', 'PENDING', ag.id, host, 'ACCT_probe_host', 'ACCT_probe_reserve',
    (split ->> 'lister_share_minor')::bigint, (split ->> 'guarantee_minor')::bigint, (split ->> 'commission_minor')::bigint,
    'test');
  settled := public.settle_booking_charge(ref, 16000000);
  if settled ->> 'outcome' <> 'settled' then
    raise exception 'PROBE_FAIL room-bookings: settlement %', settled;
  end if;
  if (select status::text from public.deal_agreements where id = ag.id) <> 'paid' then
    raise exception 'PROBE_FAIL room-bookings: the agreement is not paid';
  end if;

  -- The host's earnings name the hotel.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', host, 'role', 'authenticated')::text, true);
  select * into r from public.my_earnings_history(10, null) where booking_id = b1;
  if r.title is distinct from 'Probe Rooms Hotel' or r.amount_minor <> (split ->> 'lister_share_minor')::bigint then
    raise exception 'PROBE_FAIL room-bookings: host earnings row %', row_to_json(r);
  end if;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- Another booking, cancelled, gives its nights back.
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
  values (guest, acc, rt, rp, 1, start_day + 6, start_day + 8, 1) returning id into b2;
  select units_booked into n from public.room_inventory where room_type_id = rt and date = start_day + 6;
  if n <> 1 then raise exception 'PROBE_FAIL room-bookings: the second booking holds %', n; end if;
  update public.bookings set status = 'CANCELLED' where id = b2;
  select units_booked into n from public.room_inventory where room_type_id = rt and date = start_day + 6;
  if n <> 0 then raise exception 'PROBE_FAIL room-bookings: cancelling left % held', n; end if;

  -- CONTROL: a listing booking still needs its listing, and cannot also name a room.
  begin
    insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults, listing_id)
    values (guest, acc, rt, rp, 1, start_day + 8, start_day + 9, 1, (select id from public.listings limit 1));
    raise exception 'PROBE_FAIL room-bookings: a booking named a listing and a room';
  exception when check_violation then null; end;

  raise exception 'PROBE_OK room-bookings';
end
$$;
