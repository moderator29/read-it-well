-- SUP-09: one home is let to one tenant. Two tenants with accepted
-- inspections open move-in charges for different days; the first pays from
-- their wallet; the second is then refused by the wallet ('already_let',
-- nothing debited), their card payment is returned to their wallet
-- ('already_let'), and no new charge opens on the home. Control: the first
-- tenant's payment settles and credits the lister. A tenancy stops holding
-- the home once it is refunded in full, cancelled, or past its term: each of
-- those lets the next tenant pay. Rolls back.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';   -- tenant A
  admin  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';   -- tenant B
  lister constant uuid := 'e0000000-0000-4000-8000-000000000001';
  home   constant uuid := 'ed000000-0000-4000-8000-000000000002';
  lagos date := (now() at time zone 'Africa/Lagos')::date;
  insp_a uuid; insp_b uuid; insp_b2 uuid; insp_a2 uuid; insp_b3 uuid; wa uuid; wb uuid;
  r jsonb; bk_a uuid; bk_b uuid; bk_a2 uuid; n bigint; st text;
begin
  update public.listings
     set is_demo = false, status = 'PUBLISHED', listing_intent = 'rent',
         rent_amount_minor = 1000, caution_deposit_minor = 0, service_charge_minor = 0,
         agency_fee_minor = 0, legal_fee_minor = 0, agreement_fee_minor = 0,
         total_move_in_cost_minor = null
   where id = home;
  update public.agents set is_demo = false where user_id = lister;

  insert into public.inspection_requests (listing_id, requester_id, lister_id, requested_at, state, slot_at)
  values (home, member, lister, now(), 'CONFIRMED', now() + interval '1 day') returning id into insp_a;
  insert into public.inspection_requests (listing_id, requester_id, lister_id, requested_at, state, slot_at)
  values (home, admin, lister, now(), 'CONFIRMED', now() + interval '1 day') returning id into insp_b;
  insert into public.inspection_requests (listing_id, requester_id, lister_id, requested_at, state, slot_at)
  values (home, admin, lister, now(), 'CONFIRMED', now() + interval '1 day') returning id into insp_b2;
  insert into public.inspection_requests (listing_id, requester_id, lister_id, requested_at, state, slot_at)
  values (home, member, lister, now(), 'CONFIRMED', now() + interval '1 day') returning id into insp_a2;
  insert into public.inspection_requests (listing_id, requester_id, lister_id, requested_at, state, slot_at)
  values (home, admin, lister, now(), 'CONFIRMED', now() + interval '1 day') returning id into insp_b3;

  insert into public.wallets (user_id) values (member), (admin) on conflict do nothing;
  select id into wa from public.wallets where user_id = member;
  select id into wb from public.wallets where user_id = admin;
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
  values (wa, 'deposit', 'credit', 5000, 'probe-sup09-a', 'COMPLETED'),
         (wb, 'deposit', 'credit', 5000, 'probe-sup09-b', 'COMPLETED');

  -- Both charges open while nobody has paid.
  r := private.open_rent_charge(member, insp_a, lagos + 10);
  if r ->> 'status' <> 'ok' then raise exception 'PROBE_FAIL sup-09: tenant A could not open: %', r; end if;
  bk_a := (r ->> 'booking_id')::uuid;
  r := private.open_rent_charge(admin, insp_b, lagos + 20);
  if r ->> 'status' <> 'ok' then raise exception 'PROBE_FAIL sup-09: tenant B could not open: %', r; end if;
  bk_b := (r ->> 'booking_id')::uuid;

  -- CONTROL: tenant A pays from the wallet.
  r := private.pay_booking_from_wallet(member, bk_a, 'probe-sup09-pay-a');
  if r ->> 'status' <> 'ok' then raise exception 'PROBE_FAIL sup-09: tenant A could not pay: %', r; end if;

  -- Tenant B's wallet payment is refused, and nothing leaves their wallet.
  select count(*) into n from public.wallet_entries where wallet_id = wb;
  r := private.pay_booking_from_wallet(admin, bk_b, 'probe-sup09-pay-b');
  if r ->> 'status' <> 'already_let' then raise exception 'PROBE_FAIL sup-09: a second tenant paid for a let home: %', r; end if;
  if (select count(*) from public.wallet_entries where wallet_id = wb) <> n then
    raise exception 'PROBE_FAIL sup-09: the refused wallet payment wrote to the wallet';
  end if;

  -- Tenant B's card payment is returned to their wallet.
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status)
  values (bk_b, 'paystack', 'probe-sup09-card-b', 1000, 'NGN', 'PENDING');
  r := private.settle_booking_charge('probe-sup09-card-b', 1000, 0, null);
  if r ->> 'outcome' <> 'returned-to-wallet' or r ->> 'reason' <> 'already_let' then
    raise exception 'PROBE_FAIL sup-09: a card payment for a let home was %', r;
  end if;
  select status::text into st from public.bookings where id = bk_b;
  if st <> 'PENDING' then raise exception 'PROBE_FAIL sup-09: tenant B''s charge moved to %', st; end if;

  -- No new charge opens on the home.
  r := private.open_rent_charge(admin, insp_b2, lagos + 30);
  if r ->> 'status' <> 'already_let' then raise exception 'PROBE_FAIL sup-09: a charge opened on a let home: %', r; end if;

  -- CONTROL: the lister was credited once, for tenant A.
  select count(*) into n from public.wallet_entries e join public.wallets w on w.id = e.wallet_id
   where w.user_id = lister and e.kind = 'payment_in' and (e.metadata ->> 'booking_id')::uuid in (bk_a, bk_b);
  if n <> 1 then raise exception 'PROBE_FAIL sup-09: the lister was credited % times', n; end if;

  -- A tenancy refunded in full no longer holds the home: B pays.
  insert into public.booking_refunds (booking_id, guest_id, paid_minor, refund_minor, retained_minor, reason, wallet_reference)
  values (bk_a, member, 1000, 1000, 0, 'host_cancelled', 'probe-sup09-refund-a');
  r := private.pay_booking_from_wallet(admin, bk_b, 'probe-sup09-pay-b2');
  if r ->> 'status' <> 'ok' then raise exception 'PROBE_FAIL sup-09: a refunded tenancy still held the home: %', r; end if;

  -- A cancelled tenancy no longer holds the home: A opens and pays again.
  update public.bookings set status = 'CANCELLED' where id = bk_b;
  r := private.open_rent_charge(member, insp_a2, lagos + 40);
  if r ->> 'status' <> 'ok' then raise exception 'PROBE_FAIL sup-09: a cancelled tenancy still held the home: %', r; end if;
  bk_a2 := (r ->> 'booking_id')::uuid;
  r := private.pay_booking_from_wallet(member, bk_a2, 'probe-sup09-pay-a2');
  if r ->> 'status' <> 'ok' then raise exception 'PROBE_FAIL sup-09: A could not pay after the cancellation: %', r; end if;

  -- A tenancy past its term no longer holds the home: B opens again.
  r := private.open_rent_charge(admin, insp_b3, lagos + 50);
  if r ->> 'status' <> 'already_let' then raise exception 'PROBE_FAIL sup-09: a current tenancy did not hold the home: %', r; end if;
  update public.rent_payments set move_in = lagos - 400 where booking_id = bk_a2;
  r := private.open_rent_charge(admin, insp_b3, lagos + 50);
  if r ->> 'status' <> 'ok' then raise exception 'PROBE_FAIL sup-09: an ended tenancy still held the home: %', r; end if;

  raise exception 'PROBE_OK sup-09';
end
$$;
