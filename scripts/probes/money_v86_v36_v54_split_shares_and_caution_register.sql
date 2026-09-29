-- MONEY probe prelude: fixtures on live tables, always rolled back by the
-- final raise. Ids are in the 'ee' block, unused by any earlier probe.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-4000-8000-0000000ee0a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'money-probe-tenant@example.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-4000-8000-0000000ee0a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'money-probe-lister@example.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-4000-8000-0000000ee0a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'money-probe-mate1@example.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-4000-8000-0000000ee0a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'money-probe-mate2@example.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-4000-8000-0000000ee0a5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'money-probe-admin@example.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-4000-8000-0000000ee0a6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'money-probe-third@example.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}');
update public.profiles set first_name = 'Ada', surname = 'Okafor' where id = '00000000-0000-4000-8000-0000000ee0a1';
insert into public.user_roles (user_id, role) values ('00000000-0000-4000-8000-0000000ee0a5', 'admin') on conflict do nothing;
insert into public.agents (id, user_id, display_name)
values ('00000000-0000-4000-8000-0000000ee0b1', '00000000-0000-4000-8000-0000000ee0a2', 'Money probe lister');
insert into public.payout_accounts (agent_id, bank_name, account_number, account_name, is_default, bank_code, paystack_subaccount_code)
values ('00000000-0000-4000-8000-0000000ee0b1', 'Probe Bank', '0000000001', 'Money Probe', true, '058', 'ACCT_moneyprobe01');
insert into public.listings (id, agent_id, title, property_type, is_demo, status, listing_intent, listing_role, state_code, city, area,
                             rent_amount_minor, rent_period, caution_deposit_minor,
                             service_charge_minor, service_charge_period,
                             agency_fee_minor, legal_fee_minor, agreement_fee_minor, total_move_in_cost_minor)
values ('00000000-0000-4000-8000-0000000ee0c1', '00000000-0000-4000-8000-0000000ee0b1', 'Money probe two-bed', 'apartment', false, 'PUBLISHED', 'rent', 'owner', 'LA', 'Lagos', 'Yaba',
        100000000, 'year', 20000000, 10000000, 'year', 10000000, 5000000, 5000000, null);
insert into public.inspection_requests (id, listing_id, requester_id, lister_id, state, requested_at, slot_at)
values ('00000000-0000-4000-8000-0000000ee0d1', '00000000-0000-4000-8000-0000000ee0c1', '00000000-0000-4000-8000-0000000ee0a1', '00000000-0000-4000-8000-0000000ee0a2', 'REQUESTED', now() + interval '1 day', null);
-- The approved-agreement chain, reused by every MONEY probe.
update public.inspection_requests set state = 'CONFIRMED', slot_at = now() + interval '1 day'
 where id = '00000000-0000-4000-8000-0000000ee0d1';
insert into public.inspection_reports (inspection_id, author_id, notes)
values ('00000000-0000-4000-8000-0000000ee0d1', '00000000-0000-4000-8000-0000000ee0a1', 'Probe viewing.');
insert into public.inspection_report_items (inspection_id, item, checked, checked_at)
select '00000000-0000-4000-8000-0000000ee0d1', i, true, now()
  from unnest(array['exterior','interior','kitchen','bathrooms','utilities','appliances','safety','overall']) i;
insert into public.inspection_report_photos (inspection_id, item, storage_path)
select '00000000-0000-4000-8000-0000000ee0d1', 'overall', '00000000-0000-4000-8000-0000000ee0a1/probe-' || g || '.jpg'
  from generate_series(1, 5) g;
update public.inspection_reports set submitted_at = now() where inspection_id = '00000000-0000-4000-8000-0000000ee0d1';
do $$
declare
  tenant constant uuid := '00000000-0000-4000-8000-0000000ee0a1';
  lister constant uuid := '00000000-0000-4000-8000-0000000ee0a2';
  mate1  constant uuid := '00000000-0000-4000-8000-0000000ee0a3';
  mate2  constant uuid := '00000000-0000-4000-8000-0000000ee0a4';
  adm    constant uuid := '00000000-0000-4000-8000-0000000ee0a5';
  third  constant uuid := '00000000-0000-4000-8000-0000000ee0a6';
  insp   constant uuid := '00000000-0000-4000-8000-0000000ee0d1';
  r jsonb; ag uuid; v int; bk uuid; rp uuid; sp jsonb; s jsonb; n int; c1 uuid; c2 uuid; ob uuid; rep uuid; ph uuid; d1 uuid; d2 uuid; ret uuid; claim uuid;
  pos record; b bigint;
  mv date := (now() at time zone 'Africa/Lagos')::date + 7;
  out text := '';
  procedure_ok boolean;
begin
  -- the approved chain
  r := public.agreement_open_rent_as(tenant, insp, mv, null, null); ag := (r->>'agreement_id')::uuid;
  select terms_version into v from public.deal_agreements where id = ag;
  perform public.agreement_confirm_as(tenant, ag, v); perform public.agreement_confirm_as(lister, ag, v);
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform public.admin_decide_agreement(ag, 'approve', null);
  r := public.open_rent_charge(tenant, insp, mv); bk := (r->>'booking_id')::uuid; rp := (r->>'rent_payment_id')::uuid;

  -- V-86.1 the lead invites two flatmates; they accept
  perform set_config('request.jwt.claims', json_build_object('sub', tenant, 'role', 'authenticated')::text, true);
  r := public.add_rent_contributor(rp, mate1, 50000000); if r->>'status' <> 'ok' then raise exception 'FAIL 86.1 add %', r; end if; c1 := (r->>'contributor_id')::uuid;
  r := public.add_rent_contributor(rp, mate2, 30000000); c2 := (r->>'contributor_id')::uuid;
  r := public.add_rent_contributor(rp, third, 70000000); if r->>'status' <> 'exceeds_total' then raise exception 'FAIL 86.1 lead left nothing %', r; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', mate1, 'role', 'authenticated')::text, true);
  r := public.answer_rent_share(c1, 'accepted'); if r->>'status' <> 'ok' then raise exception 'FAIL 86.1 accept %', r; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', mate2, 'role', 'authenticated')::text, true);
  perform public.answer_rent_share(c2, 'accepted');
  if private.rent_share_owed(rp, tenant) <> 70000000 then raise exception 'FAIL 86.1 lead owes %', private.rent_share_owed(rp, tenant); end if;
  out := out || '86.1 two flatmates accepted, lead owes the remainder 70000000; ';

  -- V-86.2 flatmate 1 pays their own share by split, straight to the lister
  sp := public.payment_split_for_rent_share(rp, mate1);
  if sp->>'status' <> 'ok' or (sp->>'amount_minor')::bigint <> 50000000
     or (sp->>'lister_share_minor')::bigint + (sp->>'guarantee_minor')::bigint + (sp->>'commission_minor')::bigint <> 50000000 then
    raise exception 'FAIL 86.2 split %', sp; end if;
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id, payee_user_id,
    payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor, share_payer_id)
  values (bk, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee1f1', 50000000, 'NGN', 'PENDING', ag, lister,
    sp->>'payee_subaccount_code', 'ACCT_reserveprobe', (sp->>'lister_share_minor')::bigint, (sp->>'guarantee_minor')::bigint, (sp->>'commission_minor')::bigint, mate1);
  s := public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee1f1', 50000000, 700, null);
  if s->>'outcome' <> 'share-settled' or (s->>'paid_minor')::bigint <> 50000000 then raise exception 'FAIL 86.2 settle %', s; end if;
  select count(*) into n from public.bookings where id = bk and status = 'PENDING';
  if n <> 1 or (select status from public.deal_agreements where id = ag) <> 'approved' then raise exception 'FAIL 86.2 charge moved on a share'; end if;
  select count(*) into n from public.ledger_entries where transaction_id = (select id from public.transactions where provider_ref = 'rm-book-00000000-0000-4000-8000-0000000ee1f1');
  if n <> 1 then raise exception 'FAIL 86.2 no ledger row'; end if;
  select count(*) into n from public.caution_obligations where rent_payment_id = rp;
  if n <> 0 then raise exception 'FAIL 86.2 caution opened on a part payment'; end if;
  out := out || '86.2 share settled to the lister (ledger + Guarantee), charge still PENDING, no tenancy yet; ';

  -- V-86.3 the split is locked; wrong shares are refused
  perform set_config('request.jwt.claims', json_build_object('sub', tenant, 'role', 'authenticated')::text, true);
  r := public.add_rent_contributor(rp, third, 1000000); if r->>'status' <> 'locked' then raise exception 'FAIL 86.3 add after pay %', r; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', mate2, 'role', 'authenticated')::text, true);
  begin
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id, payee_user_id,
      payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor, share_payer_id)
    values (bk, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee1f9', 100, 'NGN', 'PENDING', ag, lister, 'ACCT_moneyprobe01', 'ACCT_reserveprobe', 100, 0, 0, mate2);
    raise exception 'FAIL 86.3 wrong-size share opened';
  exception when sqlstate '42501' then null; end;
  begin
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id, payee_user_id,
      payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor, share_payer_id)
    values (bk, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee1f8', 50000000, 'NGN', 'PENDING', ag, lister, 'ACCT_moneyprobe01', 'ACCT_reserveprobe', 50000000, 0, 0, mate1);
    raise exception 'FAIL 86.3 second share for the same person opened';
  exception when sqlstate '42501' then null; end;
  r := public.answer_rent_share(c2, 'declined'); if r->>'status' not in ('locked', 'already_answered') then raise exception 'FAIL 86.3 decline %', r; end if;
  out := out || '86.3 split locked; wrong-size and repeat shares refused at the gate; ';

  -- V-86.4 a whole payment on top of a share goes back to the card
  sp := public.payment_split_for_booking(bk);
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id, payee_user_id,
    payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor)
  values (bk, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee1f7', 150000000, 'NGN', 'PENDING', ag, lister,
    sp->>'payee_subaccount_code', 'ACCT_reserveprobe', (sp->>'lister_share_minor')::bigint, (sp->>'guarantee_minor')::bigint, (sp->>'commission_minor')::bigint);
  s := public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee1f7', 150000000, 0, null);
  if s->>'outcome' <> 'refund-due' or s->>'reason' <> 'already_paid' then raise exception 'FAIL 86.4 %', s; end if;
  out := out || '86.4 a whole payment on top of a share is refund-due (already_paid); ';

  -- V-86.5 flatmate 2 and the lead complete it
  sp := public.payment_split_for_rent_share(rp, mate2);
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id, payee_user_id,
    payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor, share_payer_id)
  values (bk, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee1f2', 30000000, 'NGN', 'PENDING', ag, lister,
    sp->>'payee_subaccount_code', 'ACCT_reserveprobe', (sp->>'lister_share_minor')::bigint, (sp->>'guarantee_minor')::bigint, (sp->>'commission_minor')::bigint, mate2);
  s := public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee1f2', 30000000, 0, null);
  if s->>'outcome' <> 'share-settled' then raise exception 'FAIL 86.5 mate2 %', s; end if;
  sp := public.payment_split_for_rent_share(rp, tenant);
  if (sp->>'amount_minor')::bigint <> 70000000 then raise exception 'FAIL 86.5 lead split %', sp; end if;
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id, payee_user_id,
    payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor, share_payer_id)
  values (bk, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee1f3', 70000000, 'NGN', 'PENDING', ag, lister,
    sp->>'payee_subaccount_code', 'ACCT_reserveprobe', (sp->>'lister_share_minor')::bigint, (sp->>'guarantee_minor')::bigint, (sp->>'commission_minor')::bigint, tenant);
  s := public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee1f3', 70000000, 0, null);
  if s->>'outcome' <> 'settled' or (s->>'confirmed')::boolean is not true then raise exception 'FAIL 86.5 last share %', s; end if;
  if (select status from public.deal_agreements where id = ag) <> 'paid' or (select status from public.bookings where id = bk) <> 'CONFIRMED' then
    raise exception 'FAIL 86.5 not paid/confirmed'; end if;
  select coalesce(sum(amount_minor), 0) into b from public.transactions where booking_id = bk and status = 'SUCCESSFUL';
  if b <> 150000000 then raise exception 'FAIL 86.5 paid %', b; end if;
  select coalesce(sum(gross_minor), 0) into b from public.ledger_entries where booking_id = bk;
  if b <> 150000000 then raise exception 'FAIL 86.5 ledger %', b; end if;
  select coalesce(sum(amount_minor), 0) into b from public.guarantee_reserve_entries where booking_id = bk;
  if b <> 750000 + 450000 + 1050000 then raise exception 'FAIL 86.5 guarantee %', b; end if;
  out := out || '86.5 three shares sum to 150000000: agreement paid, booking CONFIRMED, ledger 150000000, Guarantee 2250000; ';

  -- V-36.1 the tenancy file opened on completion, caution held by the lister
  select id into ob from public.caution_obligations where rent_payment_id = rp and amount_minor = 20000000 and lister_id = lister and tenant_id = tenant;
  if ob is null or not exists (select 1 from public.tenancy_snapshots where rent_payment_id = rp) then raise exception 'FAIL 36.1 records not opened'; end if;
  out := out || '36.1 snapshot and caution register opened on the completing share; ';

  -- Move the tenancy into the past to test the end-of-tenancy doors.
  delete from public.caution_obligations where id = ob;
  update public.rent_payments set move_in = (now() at time zone 'Africa/Lagos')::date - 420 where id = rp;
  perform private.open_tenancy_records(bk);
  select id into ob from public.caution_obligations where rent_payment_id = rp;

  -- V-54.1 the lister's move-out report, with a photograph
  perform set_config('request.jwt.claims', json_build_object('sub', lister, 'role', 'authenticated')::text, true);
  r := public.save_tenancy_report(rp, 'move_out',
        (select jsonb_agg(jsonb_build_object('item', i, 'checked', true)) from unnest(array['exterior','interior','kitchen','bathrooms','utilities','appliances','safety','overall']) i),
        'Probe move-out.', false);
  if r->>'status' <> 'ok' then raise exception 'FAIL 54.1 save %', r; end if;
  rep := (r->>'report_id')::uuid;
  insert into storage.objects (bucket_id, name, owner) values ('tenancy-evidence', rp::text || '/' || rep::text || '/wall.jpg', lister);
  r := public.add_tenancy_report_photo(rep, 'interior', rp::text || '/' || rep::text || '/wall.jpg');
  if r->>'status' <> 'ok' then raise exception 'FAIL 54.1 photo %', r; end if;
  ph := (r->>'photo_id')::uuid;
  r := public.save_tenancy_report(rp, 'move_out', '[]'::jsonb, 'Probe move-out.', true);
  if r->>'status' <> 'ok' then raise exception 'FAIL 54.1 submit %', r; end if;
  begin
    update public.tenancy_reports set notes = 'changed' where id = rep;
    raise exception 'FAIL 54.2 submitted report editable';
  exception when sqlstate '42501' then null; end;
  perform set_config('request.jwt.claims', json_build_object('sub', tenant, 'role', 'authenticated')::text, true);
  r := public.countersign_tenancy_report(rep); if r->>'status' <> 'ok' then raise exception 'FAIL 54.3 countersign %', r; end if;
  out := out || '54 move-out report saved, photographed, submitted, frozen, countersigned; ';

  -- V-36.2 deductions: one disputed and ruled by staff, one accepted
  perform set_config('request.jwt.claims', json_build_object('sub', lister, 'role', 'authenticated')::text, true);
  r := public.propose_caution_deduction(ob, 'interior', 5000000, ph, 'Wall damage'); d1 := (r->>'deduction_id')::uuid;
  if r->>'status' <> 'ok' then raise exception 'FAIL 36.2 propose %', r; end if;
  r := public.propose_caution_deduction(ob, 'kitchen', 3000000, ph, 'Cooker'); d2 := (r->>'deduction_id')::uuid;
  r := public.propose_caution_deduction(ob, 'overall', 13000000, ph, null);
  if r->>'status' <> 'exceeds_caution' then raise exception 'FAIL 36.2 cap %', r; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', tenant, 'role', 'authenticated')::text, true);
  perform public.answer_caution_deduction(d1, 'disputed');
  perform public.answer_caution_deduction(d2, 'accepted');
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  r := public.admin_caution_desk(); if jsonb_array_length(r->'disputes') < 1 then raise exception 'FAIL 36.2 desk %', r; end if;
  r := public.admin_rule_caution_dispute(d1, 2000000, 'Photo shows a small mark, not the whole wall.');
  if r->>'status' <> 'ok' then raise exception 'FAIL 36.2 rule %', r; end if;
  out := out || '36.2 deductions proposed against the move-out photo, capped, one accepted, one disputed and ruled by staff (2000000 of 5000000); ';

  -- V-36.3 the lister records a return; the tenant contests it; staff rule
  perform set_config('request.jwt.claims', json_build_object('sub', lister, 'role', 'authenticated')::text, true);
  r := public.record_caution_return(ob, 8000000, (now() at time zone 'Africa/Lagos')::date, 'bank_transfer', 'NIP123', gen_random_uuid());
  if r->>'status' <> 'ok' or r->>'recorded_as' <> 'lister_sent' then raise exception 'FAIL 36.3 record %', r; end if;
  ret := (r->>'return_id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', tenant, 'role', 'authenticated')::text, true);
  r := public.contest_caution_return(ret, 'Nothing arrived in my account.');
  select * into pos from private.caution_position(ob);
  if pos.in_doubt_minor <> 8000000 or pos.returned_minor <> 0 then raise exception 'FAIL 36.3 contested counts %', row_to_json(pos); end if;
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  r := public.admin_rule_caution_return(ret, 'received', 'Bank statement shows the NIP transfer.');
  if r->>'status' <> 'ok' then raise exception 'FAIL 36.3 ruling %', r; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', tenant, 'role', 'authenticated')::text, true);
  r := public.record_caution_return(ob, 2000000, (now() at time zone 'Africa/Lagos')::date, 'cash', null, gen_random_uuid());
  if r->>'recorded_as' <> 'tenant_received' then raise exception 'FAIL 36.3 tenant record %', r; end if;
  select * into pos from private.caution_position(ob);
  if pos.returned_minor <> 10000000 or pos.deducted_minor <> 5000000 or pos.outstanding_minor <> 5000000 or pos.claimable_minor <> 5000000 then
    raise exception 'FAIL 36.3 position %', row_to_json(pos); end if;
  out := out || '36.3 returns recorded by both parties, a contest ruled received; returned 10000000, deducted 5000000, outstanding 5000000; ';

  -- V-36.4 past due: the Vallo Guarantee
  r := public.escalate_caution_to_guarantee(ob);
  if r->>'status' <> 'ok' or (r->>'requested_minor')::bigint <> 5000000 then raise exception 'FAIL 36.4 escalate %', r; end if;
  claim := (r->>'claim_id')::uuid;
  r := public.escalate_caution_to_guarantee(ob); if r->>'status' <> 'already_open' then raise exception 'FAIL 36.4 twice %', r; end if;
  if (select private.remind_caution_due()) < 0 then raise exception 'unreachable'; end if;
  select count(*) into n from public.guarantee_claims where caution_obligation_id = ob;
  if n <> 1 then raise exception 'FAIL 36.4 the daily job filed a second claim'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  r := public.admin_decide_guarantee_claim(claim, 'approve', 2000000, 'Part of the caution from the reserve.');
  if r->>'status' <> 'ok' then raise exception 'FAIL 36.4 decide %', r; end if;
  select * into pos from private.caution_position(ob);
  if pos.guaranteed_minor <> 2000000 or pos.outstanding_minor <> 3000000 then raise exception 'FAIL 36.4 after claim %', row_to_json(pos); end if;
  out := out || '36.4 escalated to a Guarantee claim for the undisputed 5000000, once; staff approved 2000000 capped by the reserve; ';

  -- RLS
  perform set_config('request.jwt.claims', json_build_object('sub', third, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.caution_obligations where id = ob; if n <> 0 then raise exception 'FAIL RLS stranger reads caution'; end if;
  select count(*) into n from public.rent_payment_contributors where rent_payment_id = rp; if n <> 0 then raise exception 'FAIL RLS stranger reads shares'; end if;
  select count(*) into n from public.tenancy_reports where rent_payment_id = rp; if n <> 0 then raise exception 'FAIL RLS stranger reads reports'; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', lister, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.rent_payment_contributors where rent_payment_id = rp; if n <> 0 then raise exception 'FAIL RLS lister reads flatmates'; end if;
  select count(*) into n from public.caution_returns where obligation_id = ob; if n <> 2 then raise exception 'FAIL RLS lister returns %', n; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', mate1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.my_rent_share(c1);
  if (r->>'paid_minor')::bigint <> 50000000 or (r->>'complete')::boolean is not true then raise exception 'FAIL RLS my share %', r; end if;
  select count(*) into n from public.rent_payment_contributors; if n <> 1 then raise exception 'FAIL RLS mate sees % contributor rows', n; end if;
  reset role;
  out := out || 'RLS: a stranger reads nothing, the lister never sees the flatmates, a flatmate sees only their own share.';
  raise exception 'PROBE PASS (rolled back): %', out;
end $$;
