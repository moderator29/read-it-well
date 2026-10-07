-- D73A-STAYS-INSTANT-PAY: a hotel room at the published price is booked and
-- paid in one flow when `stays_instant_pay` is on, and nothing changes when it
-- is off. Needs supabase/migrations/pending/d73a_stays_instant_pay.sql applied.
-- The fixture is the room-bookings probe's: a published hotel owned by the QA
-- admin with a payout subaccount, the QA member as the guest.
--
--  1. the switch is seeded OFF; a missing row reads OFF
--  2. OFF: the guest's own booking is a PENDING request with no agreement,
--     exactly today's flow (the guest is told "Booking request sent")
--  3. ON: the guest's own booking is CONFIRMED on creation at the database
--     price (a 1 kobo price sent by the client is ignored), the nights are
--     held, the stay agreement is APPROVED with decided_by NULL, the frozen
--     cancellation terms exist, deal_agreement_events and audit_log say
--     "fixed price, instant booking", and no "terms waiting" email is queued
--  4. the UNCHANGED payment gate accepts the charge at the agreement amount,
--     the split pays the host, and settle_booking_charge marks it paid
--  5. a service-role insert stays a request even with the switch on
--  6. a host with no payout set up: the booking falls back to a request
--  7. the sweep keeps an unpaid instant booking inside 30 minutes, releases it
--     after, and gives its nights back
--  8. a host-accepted approved stay still keeps its 24 hours
-- Everything is rolled back by the final raise.
do $$
declare
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  host  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  biz uuid; acc uuid; rt uuid; rp uuid; pol uuid;
  biz2 uuid; acc2 uuid; rt2 uuid; rp2 uuid;
  b1 uuid; b2 uuid; b3 uuid; b4 uuid; b5 uuid;
  ag public.deal_agreements%rowtype;
  split jsonb; settled jsonb; swept jsonb;
  d date;
  start_day date := (now() at time zone 'Africa/Lagos')::date + 10;
  n int; st text; ref text := 'rm-book-' || gen_random_uuid();
begin
  insert into public.console_step_ups (user_id, session_id, expires_at)
  select console_probe_uid, '00000000-0000-4000-8000-00000000c0de', now() + interval '1 hour'
    from (select user_id from public.user_roles where role in ('admin', 'super_admin')
          union select host union select guest) s(console_probe_uid)
  on conflict (user_id, session_id) do update set expires_at = excluded.expires_at;

  -- 1. Seeded off; a missing row is off.
  if (select enabled from public.feature_flags where key = 'stays_instant_pay') is distinct from false then
    raise exception 'PROBE_FAIL d73a 1: stays_instant_pay is not seeded off';
  end if;
  delete from public.feature_flags where key = 'stays_instant_pay';
  if private.stays_instant_pay_on() then
    raise exception 'PROBE_FAIL d73a 1: a missing row reads on';
  end if;
  insert into public.feature_flags (key, enabled) values ('stays_instant_pay', false);

  -- The fixture, written as the platform would after review.
  insert into public.businesses (owner_id, kind, name, slug, status, source)
  values (host, 'hotel', 'Probe Instant Hotel', 'probe-instant-' || gen_random_uuid(), 'PUBLISHED', 'first_party')
  returning id into biz;
  insert into public.accommodations (business_id, name, slug, status)
  values (biz, 'Probe Instant Hotel', 'probe-instant-a-' || gen_random_uuid(), 'PUBLISHED') returning id into acc;
  insert into public.room_types (accommodation_id, name, category, sleeps, units_total, base_rate_minor, status)
  values (acc, 'Probe double', 'double', 2, 2, 5000000, 'PUBLISHED') returning id into rt;
  select id into pol from public.cancellation_policies limit 1;
  insert into public.rate_plans (room_type_id, name, cancellation_policy_id, rate_minor, currency, min_stay_nights, active)
  values (rt, 'Probe room only', pol, 5000000, 'NGN', 1, true) returning id into rp;
  for d in select generate_series(start_day, start_day + 19, interval '1 day')::date loop
    insert into public.room_inventory (room_type_id, date, units_open) values (rt, d, 2);
  end loop;
  insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at,
                                    is_default, paystack_subaccount_code)
  values (host, '058', 'Probe Bank', '0123456789', 'Probe Host', now(), true, 'ACCT_probe_host');
  update public.feature_flags set enabled = true where key = 'room_bookings';

  -- 2. OFF: today's flow.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
  values (guest, acc, rt, rp, 1, start_day, start_day + 2, 2) returning id into b1;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  select status::text into st from public.bookings where id = b1;
  if st <> 'PENDING' or exists (select 1 from public.deal_agreements where booking_id = b1) then
    raise exception 'PROBE_FAIL d73a 2: with the switch off the booking is % with an agreement', st;
  end if;
  -- The guest withdraws it, so the one-pending-per-place limit does not bite.
  update public.bookings set status = 'CANCELLED' where id = b1;

  -- 3. ON: booked and approved on creation.
  update public.feature_flags set enabled = true where key = 'stays_instant_pay';
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults,
                               price_per_night_minor, subtotal_minor, total_minor, nights)
  values (guest, acc, rt, rp, 1, start_day + 3, start_day + 5, 2, 1, 1, 1, 2) returning id into b2;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  select status::text into st from public.bookings where id = b2;
  select * into ag from public.deal_agreements where booking_id = b2;
  if st <> 'CONFIRMED' or ag.id is null or ag.status <> 'approved' or ag.decided_by is not null
     or ag.amount_minor <> 10000000 or ag.owner_id <> host or ag.renter_id <> guest
     or ag.accommodation_id <> acc or not coalesce((ag.terms ->> 'instant_booking')::boolean, false)
     or not (ag.terms ? 'cancellation') or ag.decision_reason <> 'Fixed price, instant booking.' then
    raise exception 'PROBE_FAIL d73a 3: booking % agreement %', st, row_to_json(ag);
  end if;
  select units_booked into n from public.room_inventory where room_type_id = rt and date = start_day + 3;
  if n <> 1 then raise exception 'PROBE_FAIL d73a 3: the night holds % room(s), not 1', n; end if;
  if not exists (select 1 from public.booking_cancellation_terms where booking_id = b2) then
    raise exception 'PROBE_FAIL d73a 3: the cancellation terms were not frozen';
  end if;
  if (select count(*) from public.deal_agreement_events
       where agreement_id = ag.id and actor_id is null and action in ('opened', 'approved')) <> 2 then
    raise exception 'PROBE_FAIL d73a 3: the agreement history is not opened + approved by the system';
  end if;
  if not exists (select 1 from public.audit_log
                  where entity_type = 'deal_agreement' and entity_id = ag.id::text and actor_id is null
                    and action = 'agreement.approve' and metadata ->> 'reason' = 'fixed price, instant booking') then
    raise exception 'PROBE_FAIL d73a 3: no audit_log row for the system approval';
  end if;
  if exists (select 1 from public.email_outbox e where e.template = 'agreement.waiting'
              and e.dedupe_key like 'agreement.waiting:' || ag.id::text || ':%') then
    raise exception 'PROBE_FAIL d73a 3: a "terms waiting" email was queued for an instant booking';
  end if;

  -- 4. The unchanged gate, split and settlement.
  split := public.payment_split_for_booking(b2);
  if split ->> 'status' <> 'ok' or (split ->> 'amount_minor')::bigint <> 10000000 then
    raise exception 'PROBE_FAIL d73a 4: split %', split;
  end if;
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id,
    payee_user_id, payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor,
    paystack_mode)
  values (b2, 'paystack', ref, 10000000, 'NGN', 'PENDING', ag.id, host, split ->> 'payee_subaccount_code', 'ACCT_probe_reserve',
    (split ->> 'lister_share_minor')::bigint, (split ->> 'guarantee_minor')::bigint, (split ->> 'commission_minor')::bigint,
    'test');
  settled := public.settle_booking_charge(ref, 10000000);
  if settled ->> 'outcome' <> 'settled' or (select status::text from public.deal_agreements where id = ag.id) <> 'paid' then
    raise exception 'PROBE_FAIL d73a 4: settlement %', settled;
  end if;

  -- 5. The service role keeps today's flow.
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
  values (guest, acc, rt, rp, 1, start_day + 6, start_day + 7, 1) returning id into b3;
  if (select status::text from public.bookings where id = b3) <> 'PENDING'
     or exists (select 1 from public.deal_agreements where booking_id = b3) then
    raise exception 'PROBE_FAIL d73a 5: a service-role booking was made instant';
  end if;
  update public.bookings set status = 'CANCELLED' where id = b3;

  -- 6. A host with no payout set up: the booking falls back to a request.
  insert into public.businesses (owner_id, kind, name, slug, status, source)
  values (guest, 'hotel', 'Probe Unpaid Hotel', 'probe-unpaid-' || gen_random_uuid(), 'PUBLISHED', 'first_party')
  returning id into biz2;
  insert into public.accommodations (business_id, name, slug, status)
  values (biz2, 'Probe Unpaid Hotel', 'probe-unpaid-a-' || gen_random_uuid(), 'PUBLISHED') returning id into acc2;
  insert into public.room_types (accommodation_id, name, category, sleeps, units_total, base_rate_minor, status)
  values (acc2, 'Probe single', 'single', 1, 1, 3000000, 'PUBLISHED') returning id into rt2;
  insert into public.rate_plans (room_type_id, name, cancellation_policy_id, rate_minor, currency, min_stay_nights, active)
  values (rt2, 'Probe room only', pol, 3000000, 'NGN', 1, true) returning id into rp2;
  insert into public.room_inventory (room_type_id, date, units_open) values (rt2, start_day, 1);
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', host, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
  values (host, acc2, rt2, rp2, 1, start_day, start_day + 1, 1) returning id into b4;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  select status::text into st from public.bookings where id = b4;
  if st = 'CONFIRMED' then
    raise notice 'PROBE_SKIP d73a 6: the QA member has a payout subaccount, so the fallback is not exercised';
  elsif st <> 'PENDING' or exists (select 1 from public.deal_agreements where booking_id = b4) then
    raise exception 'PROBE_FAIL d73a 6: with no payout the booking is % with an agreement', st;
  end if;

  -- 7. The sweep: kept inside the window, released after it.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
  values (guest, acc, rt, rp, 2, start_day + 10, start_day + 12, 2) returning id into b5;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  if (select status::text from public.bookings where id = b5) <> 'CONFIRMED' then
    raise exception 'PROBE_FAIL d73a 7: the second instant booking was not confirmed';
  end if;
  swept := private.expire_booking_holds(interval '48 hours', 5000);
  if (select status::text from public.bookings where id = b5) <> 'CONFIRMED' then
    raise exception 'PROBE_FAIL d73a 7: released inside the window %', swept;
  end if;
  update public.deal_agreements set decided_at = now() - interval '31 minutes' where booking_id = b5;
  swept := private.expire_booking_holds(interval '48 hours', 5000);
  if (select status::text from public.bookings where id = b5) <> 'CANCELLED'
     or (select status::text from public.deal_agreements where booking_id = b5) <> 'cancelled' then
    raise exception 'PROBE_FAIL d73a 7: not released after the window %', swept;
  end if;
  select units_booked into n from public.room_inventory where room_type_id = rt and date = start_day + 10;
  if n <> 0 then raise exception 'PROBE_FAIL d73a 7: % room(s) still held after release', n; end if;

  -- 8. A host-accepted stay keeps its 24 hours (the switch off, today's path).
  update public.feature_flags set enabled = false where key = 'stays_instant_pay';
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
  values (guest, acc, rt, rp, 1, start_day + 14, start_day + 15, 1) returning id into b3;
  update public.bookings set status = 'CONFIRMED' where id = b3;
  update public.deal_agreements set status = 'approved', decided_at = now() - interval '3 hours', decided_by = host
   where booking_id = b3;
  swept := private.expire_booking_holds(interval '48 hours', 5000);
  if (select status::text from public.bookings where id = b3) <> 'CONFIRMED' then
    raise exception 'PROBE_FAIL d73a 8: a host-accepted stay was released after 3 hours %', swept;
  end if;

  raise exception 'PROBE_OK d73a-stays-instant-pay';
end
$$;
