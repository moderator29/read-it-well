-- D75A-RESTAURANT-DEPOSITS: a restaurant may ask for a card deposit on some
-- slots or party sizes, paid on the direct rail with Vallo's commission,
-- deducted from the bill, refunded by the restaurant's cancellation rule.
-- Needs supabase/migrations/pending/d75a_restaurant_deposits.sql applied.
--  1. the switch is seeded OFF; off, nothing is due and nothing opens
--  2. a venue that cannot be paid asks for nothing; a small party owes nothing
--  3. the quote: per guest, Vallo's live commission, the venue's share
--  4. the venue cannot confirm a table whose deposit is unpaid
--  5. the gate refuses a deposit row the database did not compute
--  6. only the guest opens it; a second open resumes the first
--  7. a wrong amount is refund-due, never applied; a replay changes nothing
--  8. guest cancels in time -> refund_due -> refunded; late -> forfeited;
--     dined -> applied (deducted from the bill); the commission is on the ledger
--  9. the guest reads their deposit; a stranger does not; nobody writes it
-- Everything is rolled back by the final raise.
do $$
declare
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  host  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  biz uuid; sw uuid; res uuid; res2 uuid; res3 uuid;
  q jsonb; r jsonb; ref text; ref2 text; n int; dep uuid;
  at timestamptz := ((now() at time zone 'Africa/Lagos')::date + 3 + time '19:00') at time zone 'Africa/Lagos';
  bps int := private.current_fee_bps('commission');
begin
  -- 1.
  -- The switch row exists (seeded by d75a); this probe tests the off state by
  -- setting it off inside its own transaction, whatever live is set to (the
  -- founder turned it on 7 October 2026), so it never depends on live's value.
  if not exists (select 1 from public.feature_flags where key = 'restaurant_deposits') then
    raise exception 'PROBE_FAIL d75a 1: the restaurant_deposits switch row is missing';
  end if;
  update public.feature_flags set enabled = false where key = 'restaurant_deposits';

  insert into public.businesses (owner_id, kind, name, slug, status, source)
  values (host, 'restaurant', 'Probe Deposit Grill', 'probe-deposit-' || gen_random_uuid(), 'PUBLISHED', 'first_party')
  returning id into biz;
  insert into public.service_windows (business_id, weekday, opens, last_seating, closes, covers)
  values (biz, extract(dow from (at at time zone 'Africa/Lagos'))::smallint, '18:00', '21:30', '23:00', 60) returning id into sw;
  insert into public.restaurant_deposit_rules (business_id, service_window_id, min_party_size, amount_minor, per_guest, refund_until_hours)
  values (biz, sw, 6, 500000, true, 24);

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  insert into public.reservations (business_id, guest_id, party_size, reserved_for) values (biz, guest, 6, at) returning id into res;
  -- One guest holds one live table per venue and time
  -- (reservations_no_double_booking_business_idx), so the small party is a
  -- quarter of an hour later.
  insert into public.reservations (business_id, guest_id, party_size, reserved_for) values (biz, guest, 2, at + interval '15 minutes') returning id into res2;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

  if private.reservation_deposit_quote(res) ->> 'status' <> 'switched_off'
     or public.reservation_deposit_open(res, guest, 'test') ->> 'status' <> 'switched_off' then
    raise exception 'PROBE_FAIL d75a 1: a deposit was due with the switch off';
  end if;
  update public.feature_flags set enabled = true where key = 'restaurant_deposits';

  -- 2.
  q := private.reservation_deposit_quote(res);
  if q ->> 'status' = 'payee_not_set_up' then
    insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at,
                                      is_default, paystack_subaccount_code)
    values (host, '058', 'Probe Bank', '0123456789', 'Probe Venue', now(), true, 'ACCT_probe_venue');
    q := private.reservation_deposit_quote(res);
  else
    raise notice 'PROBE_SKIP d75a 2: the QA host already has a payout account, so "cannot be paid" is not exercised';
  end if;
  if private.reservation_deposit_quote(res2) ->> 'status' <> 'no_deposit' then
    raise exception 'PROBE_FAIL d75a 2: a party of two owes a deposit';
  end if;

  -- 3.
  if q ->> 'status' <> 'ok' or (q ->> 'amount_minor')::bigint <> 3000000
     or (q ->> 'commission_minor')::bigint <> 3000000 * bps / 10000
     or (q ->> 'lister_share_minor')::bigint <> 3000000 - 3000000 * bps / 10000
     or (q ->> 'commission_bps')::int <> bps then
    raise exception 'PROBE_FAIL d75a 3: quote %', q;
  end if;

  -- 4.
  begin
    update public.reservations set status = 'CONFIRMED' where id = res;
    raise exception 'PROBE_FAIL d75a 4: an unpaid table was confirmed';
  exception when insufficient_privilege then
    if sqlerrm not like 'reservation_deposit_unpaid%' then raise; end if;
  end;

  -- 5.
  begin
    insert into public.reservation_deposits (reservation_id, guest_id, payee_user_id, provider_ref, amount_minor,
      payee_subaccount_code, lister_share_minor, commission_minor, commission_bps, refund_until)
    values (res, guest, host, 'rm-dep-' || gen_random_uuid(), 100, q ->> 'payee_subaccount_code', 100, 0, 0, at);
    raise exception 'PROBE_FAIL d75a 5: a hand-made deposit row was accepted';
  exception when insufficient_privilege then null;
  end;

  -- 6.
  if public.reservation_deposit_open(res, host, 'test') ->> 'status' <> 'not_found' then
    raise exception 'PROBE_FAIL d75a 6: someone else opened the guest''s deposit';
  end if;
  r := public.reservation_deposit_open(res, guest, 'test');
  if r ->> 'status' <> 'ok' then raise exception 'PROBE_FAIL d75a 6: open %', r; end if;
  ref := r ->> 'reference';
  r := public.reservation_deposit_open(res, guest, 'test');
  if r ->> 'status' <> 'pending' or r ->> 'reference' <> ref then raise exception 'PROBE_FAIL d75a 6: resume %', r; end if;

  -- 7.
  r := public.reservation_deposit_settle(ref, 2999999, 'NGN');
  if r ->> 'outcome' <> 'refund-due' then raise exception 'PROBE_FAIL d75a 7: mismatch %', r; end if;
  r := public.reservation_deposit_open(res, guest, 'test');
  ref2 := r ->> 'reference';
  if public.reservation_deposit_settle(ref2, 3000000, 'NGN') ->> 'outcome' <> 'settled'
     or public.reservation_deposit_settle(ref2, 3000000, 'NGN') ->> 'outcome' <> 'duplicate' then
    raise exception 'PROBE_FAIL d75a 7: settle or replay';
  end if;
  if bps > 0 and not exists (select 1 from public.ledger_vallo_revenue l
                              where l.provider_reference = ref2 and l.amount_minor = 3000000 * bps / 10000) then
    raise exception 'PROBE_FAIL d75a 8: the commission is not on the Vallo revenue ledger';
  end if;

  -- 8. Confirmed now that it is paid; the guest cancels in time.
  -- A member holds SELECT on the deposit's display columns only (not
  -- provider_ref), so step 9 finds the row by its id.
  select id into dep from public.reservation_deposits where provider_ref = ref2;
  update public.reservations set status = 'CONFIRMED' where id = res;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  update public.reservations set status = 'CANCELLED' where id = res;
  -- 9.
  select count(*) into n from public.reservation_deposits where id = dep;
  if n <> 1 then raise exception 'PROBE_FAIL d75a 9: the guest cannot read their deposit'; end if;
  begin
    update public.reservation_deposits set status = 'refunded' where id = dep;
    raise exception 'PROBE_FAIL d75a 9: a member wrote a deposit';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  select count(*) into n from public.reservation_deposits where id = dep;
  if n <> 0 then raise exception 'PROBE_FAIL d75a 9: a stranger can read a deposit'; end if;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  if (select status from public.reservation_deposits where provider_ref = ref2) <> 'refund_due'
     or public.reservation_deposit_refunded(ref2, 'probe_refund') <> 'changed' then
    raise exception 'PROBE_FAIL d75a 8: an in-time cancellation was not refunded';
  end if;

  -- Late: the frozen window has passed.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  insert into public.reservations (business_id, guest_id, party_size, reserved_for) values (biz, guest, 6, at + interval '30 minutes') returning id into res3;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  r := public.reservation_deposit_open(res3, guest, 'test');
  perform public.reservation_deposit_settle(r ->> 'reference', 3000000, 'NGN');
  update public.reservation_deposits set refund_until = now() - interval '1 minute' where provider_ref = r ->> 'reference';
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  update public.reservations set status = 'CANCELLED' where id = res3;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  if (select status from public.reservation_deposits where provider_ref = r ->> 'reference') <> 'forfeited' then
    raise exception 'PROBE_FAIL d75a 8: a late cancellation was refunded';
  end if;

  -- Dined: the reservation completes (written as the console would, after the time).
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  insert into public.reservations (business_id, guest_id, party_size, reserved_for) values (biz, guest, 7, at + interval '1 hour') returning id into res3;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  r := public.reservation_deposit_open(res3, guest, 'test');
  perform public.reservation_deposit_settle(r ->> 'reference', 3500000, 'NGN');
  update public.reservations set status = 'CONFIRMED' where id = res3;
  update public.reservations set status = 'COMPLETED' where id = res3;
  if (select status from public.reservation_deposits where provider_ref = r ->> 'reference') <> 'applied' then
    raise exception 'PROBE_FAIL d75a 8: a dined deposit was not applied to the bill';
  end if;

  raise exception 'PROBE_OK d75a-restaurant-deposits';
end
$$;
