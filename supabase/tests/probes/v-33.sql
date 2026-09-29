-- V-33: rent never rests at Vallo. A paid rent charge credits the lister's
-- wallet (payment_in) in the same transaction as the tenant's debit, for the
-- gross less the processor's cut, once per booking; a support refund takes
-- back at most that credit (payment_in_return). When the lister no longer holds
-- it the refund waits: the debt is recorded, held against the lister's
-- spendable balance, and paid on retry. Run after m1 (the enum values).
-- Everything runs on an example listing made real inside the transaction, and
-- the block always rolls back.
do $$
declare
  member uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin  uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  lister uuid := 'e0000000-0000-4000-8000-000000000001';
  lst    uuid := 'ed000000-0000-4000-8000-000000000003';
  insp uuid; r jsonb; bk uuid; mw uuid; lw uuid; lbal0 bigint; lbal bigint; mbal0 bigint; mbal bigint; total bigint; tx uuid;
  credits int; n int;
begin
  -- SCUML item 17 (live 29 Sep): an agent listing goes live only on an
  -- approved mandate. The fixture files one as the platform would.
  insert into public.listing_mandates (listing_id, kind, principal_name, review_status, reviewed_by, reviewed_at,
         principal_relationship, principal_verified_how, principal_verified_by, principal_verified_at)
  select id, 'letting', 'Probe Principal', 'approved', '03f3dd52-ea28-4852-9abe-e5b0a67c2a43', now(),
         'owner', 'call_back', '03f3dd52-ea28-4852-9abe-e5b0a67c2a43', now()
    from public.listings where id = lst and listing_role <> 'owner'
     and not private.listing_has_live_mandate(id);
  update public.listings set is_demo = false, status = 'PUBLISHED', listing_intent = 'rent',
         rent_amount_minor = 200000000, caution_deposit_minor = 20000000, service_charge_minor = null,
         agency_fee_minor = 20000000, legal_fee_minor = null, agreement_fee_minor = null,
         total_move_in_cost_minor = null, rent_period = 'year', rate_minor = 0, rate_period = null
   where id = lst;
  insert into public.wallets (user_id) values (member) on conflict do nothing;
  insert into public.wallets (user_id) values (lister) on conflict do nothing;
  select id into mw from public.wallets where user_id = member;
  select id into lw from public.wallets where user_id = lister;

  -- 1. A wallet-paid rent charge credits the lister in the same transaction.
  insert into public.inspection_requests (listing_id, requester_id, lister_id, state, requested_at, slot_at)
  values (lst, member, lister, 'CONFIRMED', now(), now() + interval '1 day') returning id into insp;
  r := private.open_rent_charge(member, insp, current_date + 7);
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL v-33: open %', r; end if;
  bk := (r->>'booking_id')::uuid; total := (r->>'total_minor')::bigint;
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
  values (mw, 'deposit', 'credit', total, 'probe-v33-dep-' || gen_random_uuid(), 'COMPLETED');
  lbal0 := private.wallet_spendable_locked(lw);
  mbal0 := private.wallet_spendable_locked(mw);
  r := private.pay_booking_from_wallet(member, bk, 'probe-v33-pay-' || gen_random_uuid());
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL v-33: pay %', r; end if;
  if private.wallet_spendable_locked(lw) - lbal0 <> total then
    raise exception 'PROBE_FAIL v-33: lister credited % of %', private.wallet_spendable_locked(lw) - lbal0, total;
  end if;
  if mbal0 - private.wallet_spendable_locked(mw) <> total then raise exception 'PROBE_FAIL v-33: tenant not debited'; end if;
  select count(*) into credits from public.wallet_entries
   where wallet_id = lw and kind = 'payment_in' and metadata->>'booking_id' = bk::text;
  if credits <> 1 then raise exception 'PROBE_FAIL v-33: % lister credits', credits; end if;

  -- 2. A full refund takes it back out of the lister, not from nothing.
  r := private.refund_and_cancel_booking(admin, bk, total, 'probe-v33-ref-' || gen_random_uuid(), 'guest_choice', 'probe');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL v-33: refund %', r; end if;
  if private.wallet_spendable_locked(lw) <> lbal0 then raise exception 'PROBE_FAIL v-33: lister not debited on refund'; end if;
  if private.wallet_spendable_locked(mw) <> mbal0 then raise exception 'PROBE_FAIL v-33: tenant not refunded'; end if;

  -- 3. A refund the lister can no longer cover: recorded as owed, held against
  --    the lister's wallet, and paid on retry once the lister holds it.
  insert into public.inspection_requests (listing_id, requester_id, lister_id, state, requested_at, slot_at)
  values (lst, member, lister, 'CONFIRMED', now(), now() + interval '1 day') returning id into insp;
  r := private.open_rent_charge(member, insp, current_date + 8);
  bk := (r->>'booking_id')::uuid;
  r := private.pay_booking_from_wallet(member, bk, 'probe-v33-pay2-' || gen_random_uuid());
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL v-33: pay2 %', r; end if;
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
  values (lw, 'withdrawal', 'debit', total, 'probe-v33-wd-' || gen_random_uuid(), 'COMPLETED');
  mbal := private.wallet_spendable_locked(mw);
  r := private.refund_and_cancel_booking(admin, bk, total, 'probe-v33-ref2-' || gen_random_uuid(), 'guest_choice', 'probe');
  if r->>'status' <> 'lister_short' then raise exception 'PROBE_FAIL v-33: short refund answered %', r; end if;
  if private.wallet_spendable_locked(mw) <> mbal then raise exception 'PROBE_FAIL v-33: short refund moved money'; end if;
  select count(*) into n from public.rent_refunds_owed where booking_id = bk and cleared_at is null and amount_minor = total;
  if n <> 1 then raise exception 'PROBE_FAIL v-33: the debt was not recorded'; end if;
  -- the lister's next income is held against the debt
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
  values (lw, 'deposit', 'credit', total, 'probe-v33-dep2-' || gen_random_uuid(), 'COMPLETED');
  if private.wallet_spendable_locked(lw) <> lbal0 then
    raise exception 'PROBE_FAIL v-33: owed rent is spendable (% vs %)', private.wallet_spendable_locked(lw), lbal0;
  end if;
  r := private.refund_and_cancel_booking(admin, bk, total, 'probe-v33-ref3-' || gen_random_uuid(), 'guest_choice', 'probe');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL v-33: retried refund %', r; end if;
  select count(*) into n from public.rent_refunds_owed where booking_id = bk and cleared_at is null;
  if n <> 0 then raise exception 'PROBE_FAIL v-33: the debt was not cleared'; end if;
  if private.wallet_spendable_locked(mw) - mbal <> total then raise exception 'PROBE_FAIL v-33: retried refund did not land'; end if;

  -- 4. Card: the lister is credited gross less the processor's fee, and a
  --    full refund takes back only that, the fee being the platform's cost.
  insert into public.inspection_requests (listing_id, requester_id, lister_id, state, requested_at, slot_at)
  values (lst, member, lister, 'CONFIRMED', now(), now() + interval '1 day') returning id into insp;
  r := private.open_rent_charge(member, insp, current_date + 9);
  bk := (r->>'booking_id')::uuid;
  lbal0 := private.wallet_spendable_locked(lw);
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status)
  values (bk, 'paystack', 'probe-v33-card-' || gen_random_uuid(), total, 'NGN', 'PENDING') returning id into tx;
  update public.transactions set status = 'SUCCESSFUL' where id = tx;
  insert into public.ledger_entries (booking_id, transaction_id, gross_minor, platform_fee_minor, agent_share_minor, processor_fee_minor, net_settlement_minor)
  values (bk, tx, total, 0, total - 200000, 200000, total - 200000);
  if private.wallet_spendable_locked(lw) - lbal0 <> total - 200000 then
    raise exception 'PROBE_FAIL v-33: card credit %', private.wallet_spendable_locked(lw) - lbal0;
  end if;
  -- 5. A second positive ledger row for the same booking credits nobody.
  insert into public.ledger_entries (booking_id, transaction_id, gross_minor, platform_fee_minor, agent_share_minor, processor_fee_minor, net_settlement_minor)
  values (bk, null, total, 0, total, 0, total);
  select count(*) into credits from public.wallet_entries
   where wallet_id = lw and kind = 'payment_in' and metadata->>'booking_id' = bk::text;
  if credits <> 1 then raise exception 'PROBE_FAIL v-33: a second payment credited the lister again (% credits)', credits; end if;
  delete from public.ledger_entries where booking_id = bk and transaction_id is null;
  mbal := private.wallet_spendable_locked(mw);
  r := private.refund_and_cancel_booking(admin, bk, total, 'probe-v33-ref4-' || gen_random_uuid(), 'guest_choice', 'probe');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL v-33: card full refund %', r; end if;
  if private.wallet_spendable_locked(lw) <> lbal0 then raise exception 'PROBE_FAIL v-33: card refund left the lister at %', private.wallet_spendable_locked(lw) - lbal0; end if;
  if private.wallet_spendable_locked(mw) - mbal <> total then raise exception 'PROBE_FAIL v-33: card refund to tenant'; end if;

  if has_function_privilege('authenticated', 'private.settle_rent_charge_to_lister()', 'execute') then
    raise exception 'PROBE_FAIL v-33: authenticated can execute the trigger function';
  end if;

  -- CONTROL (member, API role): reads own wallet rows. REFUSAL: writes a ledger row.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  perform count(*) from public.wallet_entries;
  begin
    insert into public.ledger_entries (booking_id, transaction_id, gross_minor, platform_fee_minor, agent_share_minor, processor_fee_minor, net_settlement_minor)
    values (bk, null, 1, 0, 1, 0, 1);
    raise exception 'PROBE_FAIL v-33: member wrote a ledger row';
  exception when insufficient_privilege then null;
  end;
  reset role;

  raise exception 'PROBE_OK v-33';
end $$;
