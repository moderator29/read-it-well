-- B3 rent-path probe for the LIVE project: the in-product rent step, end to
-- end, run through the Supabase MCP AFTER the b3 migration is
-- applied, inside ONE transaction that ends in ROLLBACK. Nothing here is ever
-- persisted: the three auth users, the agent, the two listings, the four
-- inspections, the wallet and its deposit, the booking, the charge, the
-- transaction, the ledger row, the state event, the calendar night and every
-- notification vanish with the rollback. Run the whole file as one statement
-- batch.
--
-- Every assertion raises on failure, so a PASS is the absence of an error
-- plus the NOTICE lines, ending in 'ALL PASS. Rolling back.' The final
-- ROLLBACK is unconditional; if any RAISE fires, the transaction is aborted
-- and nothing persists either. No probe row ever touches a live product row:
-- every id below is fixed and distinct from every M-probe and B4-probe id.
--
-- What this proves on the live schema, in order:
--   1. public.open_rent_charge on a CONFIRMED inspection of a published
--      rental: status ok, one PENDING bookings row priced at the move-in
--      total (150,000,000 kobo from six stated parts, no stated total), one
--      rent_payments row freezing the six parts, total_stated false.
--   2. Idempotence: a second call answers exists with the same ids.
--   3. The refusals: not_accepted for REQUESTED and for COMPLETED/no_deal,
--      not_a_rental for a shortlet with no rent figure, move_in_past for
--      yesterday, not_found for a stranger naming somebody else's inspection.
--   4. The notifier's tenancy words on INSERT: the lister is told 'Rent
--      payment started' and never 'New booking request'; the tenant is never
--      told 'Booking request sent'.
--   5. public.pay_booking_from_wallet with a funded probe wallet: status ok,
--      confirmed_by_this_payment true; the booking CONFIRMED; the wallet
--      debit, the SUCCESSFUL transaction, the zero-fee ledger row paying the
--      agent the whole figure, the state event, the calendar night; the
--      wallet's derived balance back to zero.
--   6. The notifier's tenancy words on CONFIRMED: 'Rent paid' to the tenant
--      with href /rent/pay/<inspectionId>, 'Rent received' to the lister,
--      and never 'Booking confirmed'.
--   7. After payment: pay again answers already_paid; open_rent_charge
--      answers exists with the SAME booking (a paid charge is never reopened).
--   8. RLS, as each person through request.jwt.claims and `set local role
--      authenticated`: rent_payments reads tenant 1, lister 1, third 0; the
--      tenant reads their own 'Rent paid'; and the service-role door
--      public.open_rent_charge is refused to an authenticated caller (42501).
--
-- The application side of the same path (the callback to /rent/pay/<id>,
-- the stay mail skipped for a rent booking, the business-spine thread) is
-- proved by vitest in apps/web/src/lib/rent and lib/reservations; this file
-- is the database half. Nothing in this file has been run against the live
-- project by its author, who has no database credentials.

begin;

-- Fixed ids: the 'b3' block, unused by any earlier probe (B4 used 'b4').
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-4000-8000-00000000b3a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b3-probe-tenant@example.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-4000-8000-00000000b3a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b3-probe-lister@example.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-4000-8000-00000000b3a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b3-probe-third@example.invalid',  'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}');

-- handle_new_user made the profiles; the tenant gets a name the notifier
-- prints, so the lister's notification body can be asserted in words.
update public.profiles set display_name = 'B3 probe tenant' where id = '00000000-0000-4000-8000-00000000b3a1';

insert into public.agents (id, user_id, display_name)
values ('00000000-0000-4000-8000-00000000b3b1', '00000000-0000-4000-8000-00000000b3a2', 'B3 probe lister');

-- C1: a published rental stating six parts and no total, so the charge is
-- the sum: 100,000,000 + 20,000,000 + 10,000,000 + 10,000,000 + 5,000,000
-- + 5,000,000 = 150,000,000 kobo. C2: a shortlet with no rent figure.
insert into public.listings (id, agent_id, title, property_type, is_demo, status, listing_intent,
                             rent_amount_minor, rent_period, caution_deposit_minor,
                             service_charge_minor, service_charge_period,
                             agency_fee_minor, legal_fee_minor, agreement_fee_minor, total_move_in_cost_minor)
values ('00000000-0000-4000-8000-00000000b3c1', '00000000-0000-4000-8000-00000000b3b1', 'B3 probe two-bed flat', 'apartment', false, 'PUBLISHED', 'rent',
        100000000, 'year', 20000000, 10000000, 'year', 10000000, 5000000, 5000000, null),
       ('00000000-0000-4000-8000-00000000b3c2', '00000000-0000-4000-8000-00000000b3b1', 'B3 probe shortlet',     'shortlet',  false, 'PUBLISHED', 'rent',
        null, null, null, null, null, null, null, null, null);

-- D1 accepted (CONFIRMED with a slot). D2 still REQUESTED. D3 accepted, on the
-- shortlet. D4 COMPLETED with outcome no_deal. lister_id is written by the
-- set_inspection_lister trigger from the listing's agent; supplied because
-- the column is NOT NULL.
insert into public.inspection_requests (id, listing_id, requester_id, lister_id, state, requested_at, slot_at, outcome)
values ('00000000-0000-4000-8000-00000000b3d1', '00000000-0000-4000-8000-00000000b3c1', '00000000-0000-4000-8000-00000000b3a1', '00000000-0000-4000-8000-00000000b3a2', 'CONFIRMED', now() + interval '1 day', now() + interval '1 day', null),
       ('00000000-0000-4000-8000-00000000b3d2', '00000000-0000-4000-8000-00000000b3c1', '00000000-0000-4000-8000-00000000b3a1', '00000000-0000-4000-8000-00000000b3a2', 'REQUESTED', now() + interval '2 days', null, null),
       ('00000000-0000-4000-8000-00000000b3d3', '00000000-0000-4000-8000-00000000b3c2', '00000000-0000-4000-8000-00000000b3a1', '00000000-0000-4000-8000-00000000b3a2', 'CONFIRMED', now() + interval '3 days', now() + interval '3 days', null),
       ('00000000-0000-4000-8000-00000000b3d4', '00000000-0000-4000-8000-00000000b3c1', '00000000-0000-4000-8000-00000000b3a1', '00000000-0000-4000-8000-00000000b3a2', 'COMPLETED', now() - interval '3 days', now() - interval '3 days', 'no_deal');

-- A funded probe wallet: exactly the move-in total, so the balance after
-- payment is provably zero.
insert into public.wallets (id, user_id)
values ('00000000-0000-4000-8000-00000000b3e1', '00000000-0000-4000-8000-00000000b3a1')
on conflict (user_id) do nothing;

insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status, metadata)
select w.id, 'deposit', 'credit', 150000000, 'b3-probe-deposit', 'COMPLETED', '{"note":"B3 probe funding"}'::jsonb
from public.wallets w where w.user_id = '00000000-0000-4000-8000-00000000b3a1';

do $$
declare
  tenant  constant uuid := '00000000-0000-4000-8000-00000000b3a1';
  lister  constant uuid := '00000000-0000-4000-8000-00000000b3a2';
  third   constant uuid := '00000000-0000-4000-8000-00000000b3a3';
  flat    constant uuid := '00000000-0000-4000-8000-00000000b3c1';
  insp    constant uuid := '00000000-0000-4000-8000-00000000b3d1';
  today   date := (now() at time zone 'Africa/Lagos')::date;
  v_move_in date;
  total   constant bigint := 150000000;
  wallet  uuid;
  r       jsonb;
  bk      uuid;
  rp      uuid;
  n       integer;
  s       text;
  b       bigint;
  h       text;
begin
  v_move_in := today + 7;
  select w.id into wallet from public.wallets w where w.user_id = tenant;

  -- 1. Open the charge.
  r := public.open_rent_charge(tenant, insp, v_move_in);
  if r ->> 'status' <> 'ok' then raise exception 'FAIL 1: open_rent_charge answered %', r; end if;
  if (r ->> 'total_minor')::bigint <> total then raise exception 'FAIL 1: total % expected %', r ->> 'total_minor', total; end if;
  bk := (r ->> 'booking_id')::uuid;
  rp := (r ->> 'rent_payment_id')::uuid;

  select status, total_minor, nights into s, b, n from public.bookings where id = bk;
  if s <> 'PENDING' or b <> total or n <> 1 then raise exception 'FAIL 1: booking is % % nights at %', s, n, b; end if;
  select count(*) into n from public.bookings where id = bk and guest_id = tenant and listing_id = flat and check_in = v_move_in and check_out = v_move_in + 1 and price_per_night_minor = total and cleaning_fee_minor = 0 and service_fee_minor = 0 and currency = 'NGN';
  if n <> 1 then raise exception 'FAIL 1: booking row is not the one-night charge at the move-in total'; end if;
  select count(*) into n from public.rent_payments where id = rp and booking_id = bk and inspection_id = insp and listing_id = flat and tenant_id = tenant and lister_id = lister and move_in = v_move_in and rent_period = 'year'
     and rent_minor = 100000000 and caution_minor = 20000000 and service_minor = 10000000 and agency_minor = 10000000 and legal_minor = 5000000 and agreement_minor = 5000000
     and total_minor = total and total_stated = false and currency = 'NGN';
  if n <> 1 then raise exception 'FAIL 1: rent_payments row does not freeze the six parts and the summed total'; end if;
  raise notice 'PASS 1: charge opened, PENDING booking at % kobo, six parts frozen, total from the parts', total;

  -- 2. Idempotent.
  r := public.open_rent_charge(tenant, insp, v_move_in);
  if r ->> 'status' <> 'exists' or (r ->> 'booking_id')::uuid <> bk or (r ->> 'rent_payment_id')::uuid <> rp then
    raise exception 'FAIL 2: second open answered %', r;
  end if;
  select count(*) into n from public.bookings where listing_id = flat and guest_id = tenant;
  if n <> 1 then raise exception 'FAIL 2: % bookings for one charge', n; end if;
  raise notice 'PASS 2: second open answers exists with the same ids and no second booking';

  -- 3. The refusals.
  r := public.open_rent_charge(tenant, '00000000-0000-4000-8000-00000000b3d2', v_move_in);
  if r ->> 'status' <> 'not_accepted' then raise exception 'FAIL 3a: REQUESTED answered %', r; end if;
  r := public.open_rent_charge(tenant, '00000000-0000-4000-8000-00000000b3d4', v_move_in);
  if r ->> 'status' <> 'not_accepted' then raise exception 'FAIL 3b: COMPLETED/no_deal answered %', r; end if;
  r := public.open_rent_charge(tenant, '00000000-0000-4000-8000-00000000b3d3', v_move_in);
  if r ->> 'status' <> 'not_a_rental' then raise exception 'FAIL 3c: shortlet answered %', r; end if;
  r := public.open_rent_charge(tenant, insp, today - 1);
  if r ->> 'status' <> 'move_in_past' then raise exception 'FAIL 3d: yesterday answered %', r; end if;
  r := public.open_rent_charge(third, insp, v_move_in);
  if r ->> 'status' <> 'not_found' then raise exception 'FAIL 3e: a stranger answered %', r; end if;
  raise notice 'PASS 3: not_accepted (REQUESTED, COMPLETED/no_deal), not_a_rental, move_in_past, not_found';

  -- 4. Tenancy words on INSERT.
  select count(*) into n from public.notifications where user_id = lister and title = 'Rent payment started';
  if n <> 1 then raise exception 'FAIL 4: lister told Rent payment started % times', n; end if;
  select count(*) into n from public.notifications where user_id = lister and title = 'Rent payment started' and body like 'B3 probe tenant is paying the move-in total for B3 probe two-bed flat%';
  if n <> 1 then raise exception 'FAIL 4: the body does not name the tenant and the flat'; end if;
  select count(*) into n from public.notifications where user_id = lister and title = 'New booking request';
  if n <> 0 then raise exception 'FAIL 4: lister told New booking request for a rent charge'; end if;
  select count(*) into n from public.notifications where user_id = tenant and title = 'Booking request sent';
  if n <> 0 then raise exception 'FAIL 4: tenant told Booking request sent for a rent charge'; end if;
  raise notice 'PASS 4: lister told Rent payment started, nobody told stay words';

  -- 5. Pay it from the wallet.
  if private.wallet_balance(wallet) <> total then raise exception 'FAIL 5: probe wallet holds % before payment', private.wallet_balance(wallet); end if;
  r := public.pay_booking_from_wallet(tenant, bk, 'rm-book-0000b3f0-0000-4000-8000-00000000b301');
  if r ->> 'status' <> 'ok' then raise exception 'FAIL 5: pay_booking_from_wallet answered %', r; end if;
  if (r ->> 'confirmed_by_this_payment')::boolean is not true then raise exception 'FAIL 5: payment did not confirm the booking: %', r; end if;
  if (r ->> 'amount_minor')::bigint <> total then raise exception 'FAIL 5: charged % expected %', r ->> 'amount_minor', total; end if;

  select status into s from public.bookings where id = bk;
  if s <> 'CONFIRMED' then raise exception 'FAIL 5: booking is %, expected CONFIRMED', s; end if;
  select count(*) into n from public.transactions where booking_id = bk and provider = 'wallet' and status = 'SUCCESSFUL' and amount_minor = total;
  if n <> 1 then raise exception 'FAIL 5: expected 1 SUCCESSFUL wallet transaction, got %', n; end if;
  select count(*) into n from public.ledger_entries where booking_id = bk and gross_minor = total and platform_fee_minor = 0 and processor_fee_minor = 0 and agent_share_minor = total and net_settlement_minor = total;
  if n <> 1 then raise exception 'FAIL 5: the ledger row does not pay the agent the whole figure with no platform fee'; end if;
  select count(*) into n from public.wallet_entries where wallet_id = wallet and kind = 'payment' and direction = 'debit' and amount_minor = total and status = 'COMPLETED';
  if n <> 1 then raise exception 'FAIL 5: expected 1 COMPLETED wallet debit, got %', n; end if;
  if private.wallet_balance(wallet) <> 0 then raise exception 'FAIL 5: wallet holds % after paying exactly its balance', private.wallet_balance(wallet); end if;
  select count(*) into n from public.booking_state_events where booking_id = bk and from_status = 'PENDING' and to_status = 'CONFIRMED' and actor_id = tenant;
  if n <> 1 then raise exception 'FAIL 5: expected 1 PENDING to CONFIRMED event by the tenant, got %', n; end if;
  select count(*) into n from public.availability where listing_id = flat and date = v_move_in and status = 'booked';
  if n <> 1 then raise exception 'FAIL 5: the move-in night is not closed on the calendar'; end if;
  raise notice 'PASS 5: paid from the wallet, CONFIRMED, transaction, zero-fee ledger row, debit, event, night; balance 0';

  -- 6. Tenancy words on CONFIRMED.
  select count(*), min(href) into n, h from public.notifications where user_id = tenant and title = 'Rent paid';
  if n <> 1 then raise exception 'FAIL 6: tenant told Rent paid % times', n; end if;
  if h <> '/rent/pay/' || insp then raise exception 'FAIL 6: Rent paid href is %, expected /rent/pay/%', h, insp; end if;
  select count(*) into n from public.notifications where user_id = lister and title = 'Rent received';
  if n <> 1 then raise exception 'FAIL 6: lister told Rent received % times', n; end if;
  select count(*) into n from public.notifications where user_id in (tenant, lister) and title = 'Booking confirmed';
  if n <> 0 then raise exception 'FAIL 6: somebody told Booking confirmed for a rent charge'; end if;
  raise notice 'PASS 6: Rent paid to the tenant (href %), Rent received to the lister, never Booking confirmed', h;

  -- 7. After payment.
  r := public.pay_booking_from_wallet(tenant, bk, 'rm-book-0000b3f0-0000-4000-8000-00000000b302');
  if r ->> 'status' <> 'already_paid' then raise exception 'FAIL 7: second payment answered %', r; end if;
  r := public.open_rent_charge(tenant, insp, v_move_in);
  if r ->> 'status' <> 'exists' or (r ->> 'booking_id')::uuid <> bk then raise exception 'FAIL 7: open after payment answered %', r; end if;
  select count(*) into n from public.transactions where booking_id = bk and status = 'SUCCESSFUL';
  if n <> 1 then raise exception 'FAIL 7: % settled transactions after a refused second payment', n; end if;
  raise notice 'PASS 7: second payment already_paid, a paid charge is handed back and never reopened';

  -- 8. RLS, as each person. The claims are transaction-local and the role is
  --    reset before the block ends.
  perform set_config('request.jwt.claims', json_build_object('sub', tenant, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.rent_payments;
  if n <> 1 then raise exception 'FAIL 8: tenant reads % rent_payments rows, expected 1', n; end if;
  select count(*) into n from public.notifications where title = 'Rent paid';
  if n <> 1 then raise exception 'FAIL 8: tenant reads % Rent paid rows, expected 1', n; end if;
  begin
    perform public.open_rent_charge(tenant, insp, v_move_in);
    raise exception 'FAIL 8: an authenticated caller executed the service-role door';
  exception when insufficient_privilege then
    null;
  end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', lister, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.rent_payments;
  if n <> 1 then raise exception 'FAIL 8: lister reads % rent_payments rows, expected 1', n; end if;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', third, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.rent_payments;
  if n <> 0 then raise exception 'FAIL 8: a third person reads % rent_payments rows', n; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  raise notice 'PASS 8: RLS tenant 1, lister 1, third 0; the door refused to an authenticated caller (42501)';

  raise notice 'ALL PASS. Rolling back.';
end $$;

rollback;
