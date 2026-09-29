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
insert into public.listings (id, agent_id, title, property_type, is_demo, status, listing_intent, listing_role, state_code, city, area, rate_minor, rate_period)
values ('00000000-0000-4000-8000-0000000ee0c2', '00000000-0000-4000-8000-0000000ee0b1', 'Money probe shortlet', 'shortlet', false, 'PUBLISHED', 'rent', 'owner', 'LA', 'Lagos', 'Yaba', 5000000, 'night');
insert into public.listings (id, agent_id, title, property_type, is_demo, status, listing_intent, listing_role, state_code, city, area,
                             rent_amount_minor, rent_period, caution_deposit_minor, total_move_in_cost_minor)
values ('00000000-0000-4000-8000-0000000ee0c3', '00000000-0000-4000-8000-0000000ee0b1', 'Money probe room', 'apartment', false, 'PUBLISHED', 'rent', 'owner', 'LA', 'Lagos', 'Yaba',
        60000000, 'year', 10000000, 70000000);
insert into public.inspection_requests (id, listing_id, requester_id, lister_id, state, requested_at, slot_at)
values ('00000000-0000-4000-8000-0000000ee0d3', '00000000-0000-4000-8000-0000000ee0c3', '00000000-0000-4000-8000-0000000ee0a1', '00000000-0000-4000-8000-0000000ee0a2', 'REQUESTED', now() + interval '1 day', null);
update public.inspection_requests set state = 'CONFIRMED', slot_at = now() + interval '1 day' where id = '00000000-0000-4000-8000-0000000ee0d3';
insert into public.inspection_reports (inspection_id, author_id, notes) values ('00000000-0000-4000-8000-0000000ee0d3', '00000000-0000-4000-8000-0000000ee0a1', 'Probe viewing 2.');
insert into public.inspection_report_items (inspection_id, item, checked, checked_at)
select '00000000-0000-4000-8000-0000000ee0d3', i, true, now()
  from unnest(array['exterior','interior','kitchen','bathrooms','utilities','appliances','safety','overall']) i;
insert into public.inspection_report_photos (inspection_id, item, storage_path)
select '00000000-0000-4000-8000-0000000ee0d3', 'overall', '00000000-0000-4000-8000-0000000ee0a1/probe2-' || g || '.jpg' from generate_series(1, 5) g;
update public.inspection_reports set submitted_at = now() where inspection_id = '00000000-0000-4000-8000-0000000ee0d3';
do $$
declare
  tenant constant uuid := '00000000-0000-4000-8000-0000000ee0a1';
  lister constant uuid := '00000000-0000-4000-8000-0000000ee0a2';
  mate1  constant uuid := '00000000-0000-4000-8000-0000000ee0a3';
  adm    constant uuid := '00000000-0000-4000-8000-0000000ee0a5';
  r jsonb; ag uuid; v int; bk uuid; rp uuid; sp jsonb; s jsonb; n int; c1 uuid; rf uuid;
  bk2 uuid; rp2 uuid; ag2 uuid; c2 uuid; rf2 uuid;
  mv date := (now() at time zone 'Africa/Lagos')::date + 7;
  out text := '';
begin
  -- two shared move-ins, each cancelled after one share was paid
  r := public.agreement_open_rent_as(tenant, '00000000-0000-4000-8000-0000000ee0d1', mv, null, null); ag := (r->>'agreement_id')::uuid;
  select terms_version into v from public.deal_agreements where id = ag;
  perform public.agreement_confirm_as(tenant, ag, v); perform public.agreement_confirm_as(lister, ag, v);
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform public.admin_decide_agreement(ag, 'approve', null);
  r := public.open_rent_charge(tenant, '00000000-0000-4000-8000-0000000ee0d1', mv); bk := (r->>'booking_id')::uuid; rp := (r->>'rent_payment_id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', tenant, 'role', 'authenticated')::text, true);
  r := public.add_rent_contributor(rp, mate1, 30000000); c1 := (r->>'contributor_id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', mate1, 'role', 'authenticated')::text, true);
  perform public.answer_rent_share(c1, 'accepted');
  sp := public.payment_split_for_rent_share(rp, mate1);
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id, payee_user_id,
    payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor, share_payer_id)
  values (bk, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee4f1', 30000000, 'NGN', 'PENDING', ag, lister,
    sp->>'payee_subaccount_code', 'ACCT_reserveprobe', (sp->>'lister_share_minor')::bigint, (sp->>'guarantee_minor')::bigint, (sp->>'commission_minor')::bigint, mate1);
  s := public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee4f1', 30000000, 0, null);
  r := public.rent_split_cancel_as(tenant, rp, 'We found another flat.');
  rf := (r->'refunds'->0->>'refund_id')::uuid;

  r := public.agreement_open_rent_as(tenant, '00000000-0000-4000-8000-0000000ee0d3', mv, null, null); ag2 := (r->>'agreement_id')::uuid;
  select terms_version into v from public.deal_agreements where id = ag2;
  perform public.agreement_confirm_as(tenant, ag2, v); perform public.agreement_confirm_as(lister, ag2, v);
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform public.admin_decide_agreement(ag2, 'approve', null);
  r := public.open_rent_charge(tenant, '00000000-0000-4000-8000-0000000ee0d3', mv); bk2 := (r->>'booking_id')::uuid; rp2 := (r->>'rent_payment_id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', tenant, 'role', 'authenticated')::text, true);
  r := public.add_rent_contributor(rp2, mate1, 20000000); c2 := (r->>'contributor_id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', mate1, 'role', 'authenticated')::text, true);
  perform public.answer_rent_share(c2, 'accepted');
  sp := public.payment_split_for_rent_share(rp2, mate1);
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id, payee_user_id,
    payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor, share_payer_id)
  values (bk2, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee4f2', 20000000, 'NGN', 'PENDING', ag2, lister,
    sp->>'payee_subaccount_code', 'ACCT_reserveprobe', (sp->>'lister_share_minor')::bigint, (sp->>'guarantee_minor')::bigint, (sp->>'commission_minor')::bigint, mate1);
  s := public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee4f2', 20000000, 0, null);
  r := public.rent_split_cancel_as(tenant, rp2, 'Group split up.');
  rf2 := (r->'refunds'->0->>'refund_id')::uuid;

  -- 2. a pending refund and a fresh claim are not stuck
  select count(*) into n from public.rent_share_refunds_stuck() where refund_id in (rf, rf2);
  if n <> 0 then raise exception 'FAIL 2 pending counted stuck'; end if;
  perform public.claim_rent_share_refund(rf);
  select count(*) into n from public.rent_share_refunds_stuck() where refund_id = rf;
  if n <> 0 then raise exception 'FAIL 2 a fresh claim counted stuck'; end if;
  -- a claim never answered for 16 minutes is stuck (the claim time is moved back with the guard off, inside this rolled-back probe only)
  alter table public.rent_share_refunds disable trigger rent_share_refunds_forward_only;
  update public.rent_share_refunds set claimed_at = now() - interval '16 minutes' where id = rf;
  alter table public.rent_share_refunds enable trigger rent_share_refunds_forward_only;
  select count(*) into n from public.rent_share_refunds_stuck() where refund_id = rf and processor_status = 'sending';
  if n <> 1 then raise exception 'FAIL 2 a stale claim is not stuck'; end if;
  out := out || '2 pending and fresh claims are not stuck, a claim unanswered for 15 minutes is; ';
  -- failed twice is not stuck, three times is
  for n in 1..2 loop
    perform public.claim_rent_share_refund(rf2);
    perform public.record_rent_share_refund(rf2, 'failed', '');
  end loop;
  select count(*) into n from public.rent_share_refunds_stuck() where refund_id = rf2;
  if n <> 0 then raise exception 'FAIL 2 failed twice counted stuck'; end if;
  perform public.claim_rent_share_refund(rf2);
  perform public.record_rent_share_refund(rf2, 'failed', '');
  select count(*) into n from public.rent_share_refunds_stuck() where refund_id = rf2 and attempts = 3;
  if n <> 1 then raise exception 'FAIL 2 failed three times not stuck'; end if;
  out := out || 'failed twice is retried, three times is stuck; ';
  -- 6. the clock runs with an empty search path and still answers the admin
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  -- the clock lists only what is due within 24 hours, so date both refunds a month back (guard off, rolled back)
  alter table public.rent_share_refunds disable trigger rent_share_refunds_forward_only;
  update public.rent_share_refunds set created_at = now() - interval '30 days' where id in (rf, rf2);
  alter table public.rent_share_refunds enable trigger rent_share_refunds_forward_only;
  set local role authenticated;
  select count(*) into n from public.admin_refund_clock() where subject_id in (rf, rf2) and kind = 'share_unsent';
  reset role;
  if n <> 2 then raise exception 'FAIL 6 clock saw % share refunds', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', tenant, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.admin_refund_clock();
  reset role;
  if n <> 0 then raise exception 'FAIL 6 a tenant read the clock'; end if;
  begin
    set local role authenticated;
    perform public.rent_share_refunds_stuck();
    reset role;
    raise exception 'FAIL 2 authenticated read the stuck list';
  exception when insufficient_privilege then reset role; end;
  out := out || '6 the refund clock answers an admin (sending and failed share refunds as share_unsent) and nobody else, with an empty search path; the stuck list is service-role only.';
  raise exception 'PROBE PASS (rolled back): %', out;
end $$;
