-- D75B-STAY-TRIP-DETAILS: what a guest's trip page reveals follows the money.
-- Needs supabase/migrations/pending/d75b_stay_trip_details.sql applied.
--  1. the gate code (listing_access) and reviews both require a paid booking
--     (read from the live function and policy text)
--  2. my_stay_details: before payment 'unpaid' and nothing about the place;
--     after settlement the address, check-in times and host; a stranger gets
--     'not_found'
-- The fixture is the room-bookings probe's hotel. Everything is rolled back.
do $$
declare
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  host  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  biz uuid; acc uuid; rt uuid; rp uuid; pol uuid; b1 uuid;
  ag public.deal_agreements%rowtype; split jsonb; d jsonb;
  start_day date := (now() at time zone 'Africa/Lagos')::date + 10;
  dd date; ref text := 'rm-book-' || gen_random_uuid();
begin
  -- 1.
  if pg_get_functiondef('private.can_see_listing_access(uuid)'::regprocedure) not like '%booking_is_paid%' then
    raise exception 'PROBE_FAIL d75b 1: the gate code does not follow payment';
  end if;
  if (select with_check from pg_policies where tablename = 'reviews' and policyname = 'reviews_insert_own') not like '%booking_is_paid%' then
    raise exception 'PROBE_FAIL d75b 1: reviews do not require a paid stay';
  end if;

  insert into public.console_step_ups (user_id, session_id, expires_at)
  values (host, '00000000-0000-4000-8000-00000000c0de', now() + interval '1 hour')
  on conflict (user_id, session_id) do update set expires_at = excluded.expires_at;
  insert into public.businesses (owner_id, kind, name, slug, status, source)
  values (host, 'hotel', 'Probe Trip Hotel', 'probe-trip-' || gen_random_uuid(), 'PUBLISHED', 'first_party') returning id into biz;
  insert into public.accommodations (business_id, name, slug, status, address, check_in_from, check_out_by)
  values (biz, 'Probe Trip Hotel', 'probe-trip-a-' || gen_random_uuid(), 'PUBLISHED', '1 Probe Close, Ikoyi', '14:00', '12:00')
  returning id into acc;
  insert into public.room_types (accommodation_id, name, category, sleeps, units_total, base_rate_minor, status)
  values (acc, 'Probe double', 'double', 2, 2, 5000000, 'PUBLISHED') returning id into rt;
  select id into pol from public.cancellation_policies limit 1;
  insert into public.rate_plans (room_type_id, name, cancellation_policy_id, rate_minor, currency, min_stay_nights, active)
  values (rt, 'Probe room only', pol, 5000000, 'NGN', 1, true) returning id into rp;
  for dd in select generate_series(start_day, start_day + 3, interval '1 day')::date loop
    insert into public.room_inventory (room_type_id, date, units_open) values (rt, dd, 2);
  end loop;
  insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at,
                                    is_default, paystack_subaccount_code)
  values (host, '058', 'Probe Bank', '0123456789', 'Probe Host', now(), true, 'ACCT_probe_host');
  update public.feature_flags set enabled = true where key = 'room_bookings';
  update public.feature_flags set enabled = false where key = 'stays_instant_pay';

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
  values (guest, acc, rt, rp, 1, start_day, start_day + 2, 2) returning id into b1;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  update public.bookings set status = 'CONFIRMED' where id = b1;
  select * into ag from public.deal_agreements where booking_id = b1;
  update public.deal_agreements set status = 'approved', decided_at = now(), decided_by = host where id = ag.id;

  -- 2. Confirmed but unpaid: nothing revealed.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  d := public.my_stay_details(b1);
  if d ->> 'status' <> 'unpaid' or d ? 'address' then raise exception 'PROBE_FAIL d75b 2: revealed before payment %', d; end if;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

  split := public.payment_split_for_booking(b1);
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id,
    payee_user_id, payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor,
    paystack_mode)
  values (b1, 'paystack', ref, (split ->> 'amount_minor')::bigint, 'NGN', 'PENDING', ag.id, host, 'ACCT_probe_host', 'ACCT_probe_reserve',
    (split ->> 'lister_share_minor')::bigint, (split ->> 'guarantee_minor')::bigint, (split ->> 'commission_minor')::bigint, 'test');
  if public.settle_booking_charge(ref, (split ->> 'amount_minor')::bigint) ->> 'outcome' <> 'settled' then
    raise exception 'PROBE_FAIL d75b 2: the fixture did not settle';
  end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  d := public.my_stay_details(b1);
  if d ->> 'status' <> 'ok' or d ->> 'address' <> '1 Probe Close, Ikoyi' or d ->> 'kind' <> 'room'
     or (d ->> 'check_in_from') is null or d ->> 'message_href' <> '/stay/' || acc::text then
    raise exception 'PROBE_FAIL d75b 2: after payment %', d;
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  if public.my_stay_details(b1) ->> 'status' <> 'not_found' then
    raise exception 'PROBE_FAIL d75b 2: a stranger read the stay';
  end if;
  reset role;

  raise exception 'PROBE_OK d75b-stay-trip-details';
end
$$;
