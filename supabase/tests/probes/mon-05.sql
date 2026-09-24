-- MON-05 (with OPS-01), OPS-02 (a)(c), MON-P2-02, and V-33's card path: one
-- SQL function settles a card charge under the booking's lock. The first
-- matching charge settles and confirms; a replay moves nothing; a second
-- charge, a charge on a cancelled booking and a wrong amount go back to the
-- payer's wallet with an alert; a customer-borne fee is accepted; a paid
-- booking is refunded in parts in any status, bounded cumulatively across both
-- refund doors; a
-- card-paid rent charge credits the lister once, gross less the fee, and a
-- refund of it takes that back. API roles cannot call either door. Rolls back.
do $$
declare
  member uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin  uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  stay   uuid := 'ed000000-0000-4000-8000-000000000003';
  lagos  date := (now() at time zone 'Africa/Lagos')::date;
  rate bigint; mw uuid; b1 uuid; b2 uuid; b3 uuid; b4 uuid; b5 uuid; rb uuid; b6 uuid; lw uuid; insp uuid; rtotal bigint; lbal0 bigint;
  lister uuid := 'e0000000-0000-4000-8000-000000000001'; rental uuid := 'ed000000-0000-4000-8000-000000000007'; r jsonb; n int; bal bigint; st text;
begin
  update public.listings set is_demo = false, status = 'PUBLISHED' where id = stay;
  select rate_minor into rate from public.listings where id = stay;
  insert into public.wallets (user_id) values (member) on conflict do nothing;
  select id into mw from public.wallets where user_id = member;
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (stay, member, lagos + 20, lagos + 22, 2, rate, rate * 2, rate * 2, 'PENDING') returning id into b1;
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (stay, member, lagos + 30, lagos + 31, 1, rate, rate, rate, 'CANCELLED') returning id into b2;
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (stay, member, lagos + 40, lagos + 41, 1, rate, rate, rate, 'PENDING') returning id into b3;
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (stay, member, lagos + 50, lagos + 51, 1, rate, rate, rate, 'PENDING') returning id into b4;
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, status) values
    (b1, 'paystack', 'probe-b2-A', rate * 2, 'PENDING'),
    (b1, 'paystack', 'probe-b2-B', rate * 2, 'PENDING'),
    (b2, 'paystack', 'probe-b2-C', rate, 'PENDING'),
    (b3, 'paystack', 'probe-b2-D', rate, 'PENDING');

  -- CONTROL: the first matching charge settles and confirms.
  r := private.settle_booking_charge('probe-b2-A', rate * 2, 1500, null);
  if r->>'outcome' <> 'settled' or (r->>'confirmed')::boolean is not true then raise exception 'PROBE_FAIL mon-05: first charge %', r; end if;
  select status::text into st from public.bookings where id = b1;
  if st <> 'CONFIRMED' then raise exception 'PROBE_FAIL mon-05: booking %', st; end if;
  select count(*) into n from public.ledger_entries where booking_id = b1;
  if n <> 1 then raise exception 'PROBE_FAIL mon-05: % ledger rows', n; end if;
  -- A replay moves nothing.
  r := private.settle_booking_charge('probe-b2-A', rate * 2, 1500, null);
  if r->>'outcome' <> 'already-settled' then raise exception 'PROBE_FAIL mon-05: replay %', r; end if;

  -- A second charge on a paid booking goes back to the guest's wallet.
  bal := private.wallet_spendable_locked(mw);
  r := private.settle_booking_charge('probe-b2-B', rate * 2, 1500, null);
  if r->>'outcome' <> 'returned-to-wallet' or r->>'reason' <> 'already_paid' then raise exception 'PROBE_FAIL mon-05: duplicate %', r; end if;
  if private.wallet_spendable_locked(mw) - bal <> rate * 2 then raise exception 'PROBE_FAIL mon-05: duplicate not returned'; end if;
  select status::text into st from public.transactions where provider_ref = 'probe-b2-B';
  if st <> 'REFUNDED' then raise exception 'PROBE_FAIL mon-05: duplicate attempt is %', st; end if;
  select count(*) into n from public.ledger_entries where booking_id = b1;
  if n <> 1 then raise exception 'PROBE_FAIL mon-05: duplicate wrote a ledger row'; end if;
  select count(*) into n from public.risk_alerts where entity_id = b1::text and status = 'open';
  if n < 1 then raise exception 'PROBE_FAIL mon-05: no alert for the duplicate'; end if;
  -- ... and its replay moves nothing either.
  r := private.settle_booking_charge('probe-b2-B', rate * 2, 1500, null);
  if r->>'outcome' <> 'already-settled' then raise exception 'PROBE_FAIL mon-05: duplicate replay %', r; end if;

  -- OPS-02 (a): a charge landing on a cancelled booking goes back, no "host accepted".
  r := private.settle_booking_charge('probe-b2-C', rate, 0, null);
  if r->>'outcome' <> 'returned-to-wallet' or r->>'reason' <> 'booking_cancelled' then raise exception 'PROBE_FAIL ops-02: late charge %', r; end if;
  select count(*) into n from public.booking_state_events where booking_id = b2;
  if n <> 0 then raise exception 'PROBE_FAIL ops-02: history written for a cancelled booking'; end if;

  -- OPS-02 (c): an amount that is not the booking's price goes back.
  r := private.settle_booking_charge('probe-b2-D', 1, 0, null);
  if r->>'outcome' <> 'returned-to-wallet' or r->>'reason' <> 'amount_mismatch' then raise exception 'PROBE_FAIL ops-02: mismatch %', r; end if;
  select status::text into st from public.bookings where id = b3;
  if st <> 'PENDING' then raise exception 'PROBE_FAIL ops-02: mismatch moved the booking to %', st; end if;

  -- Healing a missing attempt from the processor's metadata still settles.
  r := private.settle_booking_charge('probe-b2-E', rate, 0, b4);
  if r->>'outcome' <> 'settled' then raise exception 'PROBE_FAIL mon-05: heal %', r; end if;
  -- A customer-borne processor fee (price + fee) is not a mismatch.
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (stay, member, lagos + 60, lagos + 61, 1, rate, rate, rate, 'PENDING') returning id into b5;
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, status) values (b5, 'paystack', 'probe-b2-G', rate, 'PENDING');
  r := private.settle_booking_charge('probe-b2-G', rate + 1500, 1500, null);
  if r->>'outcome' <> 'settled' or (r->'ledger'->>'grossMinor')::bigint <> rate then raise exception 'PROBE_FAIL mon-05: customer-borne fee %', r; end if;
  r := private.settle_booking_charge('probe-b2-F', rate, 0, null);
  if r->>'outcome' <> 'unknown-reference' then raise exception 'PROBE_FAIL mon-05: unknown %', r; end if;

  -- MON-P2-02: a COMPLETED stay is refunded in parts, bounded cumulatively.
  update public.bookings set status = 'COMPLETED' where id = b1;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  begin
    perform public.refund_booking_payment(admin, b1, 1, 'probe-b2-ref-x', 'goodwill', null);
    raise exception 'PROBE_FAIL mon-p2-02: authenticated can call the refund door';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.settle_booking_charge('probe-b2-A', 1, 0, null);
    raise exception 'PROBE_FAIL mon-05: authenticated can call the settle door';
  exception when insufficient_privilege then null;
  end;
  reset role;
  r := private.refund_booking_payment(member, b1, 1000, 'probe-b2-ref-0', 'goodwill', null);
  if r->>'status' <> 'forbidden' then raise exception 'PROBE_FAIL mon-p2-02: member refund %', r; end if;
  bal := private.wallet_spendable_locked(mw);
  r := private.refund_booking_payment(admin, b1, 1000, 'probe-b2-ref-1', 'goodwill', 'part refund');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL mon-p2-02: part refund %', r; end if;
  r := private.refund_booking_payment(admin, b1, rate * 2, 'probe-b2-ref-2', 'not_as_listed', null);
  if r->>'status' <> 'over_refund' then raise exception 'PROBE_FAIL mon-p2-02: cumulative bound %', r; end if;
  r := private.refund_booking_payment(admin, b1, rate * 2 - 1000, 'probe-b2-ref-3', 'not_as_listed', null);
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL mon-p2-02: rest refund %', r; end if;
  r := private.refund_booking_payment(admin, b1, 1, 'probe-b2-ref-4', 'goodwill', null);
  if r->>'status' <> 'over_refund' then raise exception 'PROBE_FAIL mon-p2-02: past the total %', r; end if;
  if private.wallet_spendable_locked(mw) - bal <> rate * 2 then raise exception 'PROBE_FAIL mon-p2-02: refunds landed %', private.wallet_spendable_locked(mw) - bal; end if;
  select status::text into st from public.bookings where id = b1;
  if st <> 'COMPLETED' then raise exception 'PROBE_FAIL mon-p2-02: refund moved the status to %', st; end if;

  -- MON-P2-02: the two refund doors share one bound. A goodwill part refund
  -- through the new door, then refund-and-cancel for the whole price through
  -- the old one, is refused; the remainder is allowed.
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (stay, member, lagos + 80, lagos + 82, 2, rate, rate * 2, rate * 2, 'PENDING') returning id into b6;
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, status) values (b6, 'paystack', 'probe-b2-H', rate * 2, 'PENDING');
  r := private.settle_booking_charge('probe-b2-H', rate * 2, 0, null);
  if r->>'outcome' <> 'settled' then raise exception 'PROBE_FAIL mon-05: two-door setup %', r; end if;
  r := private.refund_booking_payment(admin, b6, 1000, 'probe-b2-ref-h1', 'goodwill', 'part refund');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL mon-p2-02: goodwill %', r; end if;
  r := private.refund_and_cancel_booking(admin, b6, rate * 2, 'probe-b2-ref-h2', 'not_as_listed', 'whole price');
  if r->>'status' <> 'over_refund' then raise exception 'PROBE_FAIL mon-p2-02: two doors refunded more than was paid %', r; end if;
  r := private.refund_and_cancel_booking(admin, b6, rate * 2 - 1000, 'probe-b2-ref-h3', 'not_as_listed', 'the rest');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL mon-p2-02: the remainder %', r; end if;

  -- V-33 with MON-05: a card-paid rent charge settled by the function credits
  -- the lister once, gross less the fee; a second charge goes back to the payer.
  update public.listings set is_demo = false, status = 'PUBLISHED', listing_intent = 'rent',
         rent_amount_minor = 150000000, rent_period = 'year', rate_minor = 0, rate_period = null,
         total_move_in_cost_minor = null
   where id = rental;
  insert into public.wallets (user_id) values (lister) on conflict do nothing;
  select id into lw from public.wallets where user_id = lister;
  insert into public.inspection_requests (listing_id, requester_id, lister_id, state, requested_at, slot_at)
  values (rental, member, lister, 'CONFIRMED', now(), now() + interval '1 day') returning id into insp;
  r := private.open_rent_charge(member, insp, lagos + 7);
  rb := (r->>'booking_id')::uuid; rtotal := (r->>'total_minor')::bigint;
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, status) values
    (rb, 'paystack', 'probe-b2-R1', rtotal, 'PENDING'), (rb, 'paystack', 'probe-b2-R2', rtotal, 'PENDING');
  lbal0 := private.wallet_spendable_locked(lw);
  r := private.settle_booking_charge('probe-b2-R1', rtotal, 150000, null);
  if r->>'outcome' <> 'settled' then raise exception 'PROBE_FAIL mon-05: rent card %', r; end if;
  if private.wallet_spendable_locked(lw) - lbal0 <> rtotal - 150000 then raise exception 'PROBE_FAIL v-33: rent card credit %', private.wallet_spendable_locked(lw) - lbal0; end if;
  r := private.settle_booking_charge('probe-b2-R2', rtotal, 150000, null);
  if r->>'outcome' <> 'returned-to-wallet' then raise exception 'PROBE_FAIL mon-05: second rent charge %', r; end if;
  if private.wallet_spendable_locked(lw) - lbal0 <> rtotal - 150000 then raise exception 'PROBE_FAIL v-33: second charge credited the lister'; end if;

  raise exception 'PROBE_OK mon-05';
end $$;
