-- FM02-GUARANTEE-CLAIM-PAYOUTS-CHARGEBACK-HOLD (migration fm02): while the
-- claimant is a lister with a lost chargeback still owed, approving their
-- Guarantee claim and marking it paid are refused (`chargeback_hold`, audited
-- `chargeback.hold_refused`, nothing changes); rejecting is never refused;
-- finance overrides ONE claim with a reason (audited, kept in
-- chargeback_hold_claim_overrides) and that claim can then be approved and
-- marked paid, while another claim stays held; a stranger, a decided claim
-- and the staffer's own hold are refused; the override table is closed to
-- every app role. The cbh01 kinds keep working. Everything is rolled back by
-- the final raise.
do $$
declare
  lister uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  payer uuid;
  staffer uuid;
  sess uuid := gen_random_uuid();
  stay uuid := 'ed000000-0000-4000-8000-000000000003';
  lagos date := (now() at time zone 'Africa/Lagos')::date;
  tg name;
  rate bigint;
  bk uuid;
  tx uuid;
  ag uuid := gen_random_uuid();
  c1 uuid := gen_random_uuid();
  c2 uuid := gen_random_uuid();
  c3 uuid := gen_random_uuid();
  rp uuid := gen_random_uuid();
  ref text := 'fm02-probe-' || gen_random_uuid()::text;
  r jsonb;
  cb uuid;
begin
  for tg in select tgname from pg_trigger where tgrelid = 'public.listings'::regclass and tgfoid = 'private.listing_supply_proof_gate'::regproc loop
    execute format('alter table public.listings disable trigger %I', tg);
  end loop;
  update public.listings set is_demo = false where id = stay;
  for tg in select tgname from pg_trigger where tgrelid = 'public.listings'::regclass and tgfoid = 'private.listing_supply_proof_gate'::regproc loop
    execute format('alter table public.listings enable trigger %I', tg);
  end loop;
  select rate_minor into rate from public.listings where id = stay;
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (stay, lister, lagos + 50, lagos + 52, 2, rate, rate * 2, rate * 2, 'PENDING') returning id into bk;
  perform set_config('vallo.recording_unknown_charge', 'on', true);
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, payee_user_id)
  values (bk, 'paystack', ref, 100000, 'NGN', 'SUCCESSFUL', lister) returning id into tx;
  perform set_config('vallo.recording_unknown_charge', '', true);

  select u.id into payer from auth.users u where u.id <> lister order by u.created_at desc limit 1;
  select u.id into staffer from auth.users u where u.id not in (lister, payer) order by u.created_at limit 1;
  insert into public.user_roles (user_id, role) values (staffer, 'admin') on conflict do nothing;
  insert into public.console_step_ups (user_id, session_id, expires_at) values (staffer, sess, now() + interval '1 hour');

  -- The agreement, three claims by the lister, a funded reserve and a
  -- Rewards payout. Fixture rows only, triggers off for these inserts.
  set local session_replication_role = replica;
  insert into public.deal_agreements (id, kind, renter_id, owner_id, amount_minor, terms, listing_id, booking_id)
  values (ag, 'stay', payer, lister, 200000, '{}'::jsonb, stay, bk);
  insert into public.guarantee_claims (id, agreement_id, booking_id, claimant_id, items, description, evidence_paths,
                                       requested_minor, status, approved_minor)
  values (c1, ag, bk, lister, array['interior'], 'Probe claim one, a broken door', '{}', 20000, 'submitted', null),
         (c2, ag, bk, lister, array['kitchen'], 'Probe claim two, a cracked sink', '{}', 10000, 'approved', 10000),
         (c3, ag, bk, lister, array['overall'], 'Probe claim three, general wear', '{}', 5000, 'submitted', null);
  insert into public.guarantee_reserve_entries (direction, kind, amount_minor, booking_id, transaction_id)
  values ('in', 'contribution', 500000, bk, tx);
  insert into public.rewards_payouts (id, member_id, amount_minor, reference, status, bank_code, account_last4, account_name, recipient_code)
  values (rp, lister, 5000, 'vallo-rw-' || replace(rp::text, '-', ''), 'under_review', '058', '1234', 'Probe Lister', 'RCP_probe');
  set local session_replication_role = origin;

  -- The chargeback is lost and owed: the hold applies to the lister.
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  r := public.chargeback_open(ref, 'paystack', 'dsp-fm02-' || ag, 40000);
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL fm02: open %', r; end if;
  cb := (r->>'chargeback_id')::uuid;
  r := public.chargeback_move(cb, 'lost');
  if r->>'status' <> 'ok' or not public.lister_chargeback_hold(lister) then raise exception 'PROBE_FAIL fm02: lost %', r; end if;

  perform set_config('request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', staffer, 'session_id', sess)::text, true);

  -- 1. Approving is refused, audited, and nothing changes.
  r := public.admin_decide_guarantee_claim(c1, 'approve', 10000, null);
  if r->>'status' <> 'chargeback_hold' then raise exception 'PROBE_FAIL fm02 1: approve while held %', r; end if;
  if (select status from public.guarantee_claims where id = c1) <> 'submitted'
     or exists (select 1 from public.guarantee_reserve_entries where claim_id = c1) then
    raise exception 'PROBE_FAIL fm02 1: the claim moved'; end if;
  if not exists (select 1 from public.audit_log where action = 'chargeback.hold_refused' and entity_type = 'guarantee_claim'
                   and entity_id = c1::text and metadata->>'path' = 'guarantee_claim_approve') then
    raise exception 'PROBE_FAIL fm02 1: refusal not audited'; end if;

  -- 2. Marking paid is refused too.
  r := public.admin_mark_guarantee_claim_paid(c2, 'TRF-PROBE-1');
  if r->>'status' <> 'chargeback_hold' then raise exception 'PROBE_FAIL fm02 2: paid while held %', r; end if;
  if (select status from public.guarantee_claims where id = c2) <> 'approved' then
    raise exception 'PROBE_FAIL fm02 2: the claim was marked paid'; end if;
  if not exists (select 1 from public.audit_log where action = 'chargeback.hold_refused' and entity_id = c2::text
                   and metadata->>'path' = 'guarantee_claim_mark_paid') then
    raise exception 'PROBE_FAIL fm02 2: refusal not audited'; end if;

  -- 3. Rejecting pays nothing and is never refused.
  r := public.admin_decide_guarantee_claim(c3, 'reject', null, 'No damage shown in the photographs');
  if r->>'status' <> 'ok' or (select status from public.guarantee_claims where id = c3) <> 'rejected' then
    raise exception 'PROBE_FAIL fm02 3: reject while held %', r; end if;

  -- 4. The override: finance only, a reason, one claim, audited.
  perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', payer)::text, true);
  r := public.admin_chargeback_hold_override('guarantee_claim', c1, 'the payer confirmed and finance agrees');
  if r->>'status' <> 'forbidden' then raise exception 'PROBE_FAIL fm02 4: stranger overrode %', r; end if;
  perform set_config('request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', staffer, 'session_id', sess)::text, true);
  r := public.admin_chargeback_hold_override('guarantee_claim', c1, 'too short');
  if r->>'status' <> 'reason_required' then raise exception 'PROBE_FAIL fm02 4: short reason %', r; end if;
  r := public.admin_chargeback_hold_override('guarantee_claim', c3, 'Rejected claims never need an override');
  if r->>'status' <> 'not_found' then raise exception 'PROBE_FAIL fm02 4: decided claim overridden %', r; end if;
  r := public.admin_chargeback_hold_override('guarantee_claim', c1, 'Damage is proven and the lister agreed a recovery plan');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL fm02 4: override %', r; end if;
  if not exists (select 1 from public.audit_log where action = 'chargeback.hold_overridden' and entity_type = 'guarantee_claim'
                   and entity_id = c1::text and actor_id = staffer) then
    raise exception 'PROBE_FAIL fm02 4: override not audited'; end if;
  if not exists (select 1 from public.chargeback_hold_claim_overrides where claim_id = c1 and actor_id = staffer) then
    raise exception 'PROBE_FAIL fm02 4: override not kept'; end if;
  r := public.admin_chargeback_hold_override('guarantee_claim', c1, 'Damage is proven and the lister agreed a recovery plan');
  if r->>'status' <> 'already' then raise exception 'PROBE_FAIL fm02 4: second override %', r; end if;

  -- 5. That claim goes, through the existing functions; the other stays held.
  r := public.admin_decide_guarantee_claim(c1, 'approve', 10000, null);
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL fm02 5: overridden approve %', r; end if;
  r := public.admin_mark_guarantee_claim_paid(c1, 'TRF-PROBE-2');
  if r->>'status' <> 'ok' or (select status from public.guarantee_claims where id = c1) <> 'paid' then
    raise exception 'PROBE_FAIL fm02 5: overridden mark paid %', r; end if;
  r := public.admin_mark_guarantee_claim_paid(c2, 'TRF-PROBE-3');
  if r->>'status' <> 'chargeback_hold' then raise exception 'PROBE_FAIL fm02 5: override leaked to another claim %', r; end if;

  -- 6. The cbh01 kinds still work, and a bad kind is refused.
  r := public.admin_chargeback_hold_override('rewards_payout', rp, 'Lister repaid by transfer, awaiting the record');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL fm02 6: rewards override %', r; end if;
  r := public.admin_chargeback_hold_override('booking', c2, 'Not a kind the payout rule knows');
  if r->>'status' <> 'bad_kind' then raise exception 'PROBE_FAIL fm02 6: bad kind %', r; end if;

  -- 7. A staffer cannot override their own hold.
  update public.chargebacks set lister_user_id = staffer where id = cb;
  set local session_replication_role = replica;
  update public.guarantee_claims set claimant_id = staffer where id = c2;
  set local session_replication_role = origin;
  r := public.admin_chargeback_hold_override('guarantee_claim', c2, 'I would like my own claim paid please');
  if r->>'status' <> 'own_hold' then raise exception 'PROBE_FAIL fm02 7: own hold %', r; end if;

  -- 8. Grants: the override table is closed to every app role.
  if has_table_privilege('authenticated', 'public.chargeback_hold_claim_overrides', 'select')
     or has_table_privilege('anon', 'public.chargeback_hold_claim_overrides', 'select')
     or has_table_privilege('service_role', 'public.chargeback_hold_claim_overrides', 'insert')
     or has_function_privilege('anon', 'public.admin_chargeback_hold_override(text,uuid,text)', 'execute') then
    raise exception 'PROBE_FAIL fm02 8: grants';
  end if;

  raise exception 'PROBE_OK fm02-guarantee-claim-payouts-chargeback-hold';
end $$;
