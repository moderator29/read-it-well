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
  stay   constant uuid := '00000000-0000-4000-8000-0000000ee0c2';
  r jsonb; ag uuid; v int; bk uuid; rp uuid; sp jsonb; s jsonb; n int; c1 uuid; sbk uuid; sag uuid; rf uuid; req uuid; st text;
  bk2 uuid; rp2 uuid; ag2 uuid; c2 uuid;
  mv date := (now() at time zone 'Africa/Lagos')::date + 7;
  out text := '';
begin
  -- V-24.1 a paid stay, and the guest asks for a refund
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, adults, children, price_per_night_minor, cleaning_fee_minor, service_fee_minor, subtotal_minor, total_minor, currency, status)
  values (stay, tenant, (now() at time zone 'Africa/Lagos')::date + 20, (now() at time zone 'Africa/Lagos')::date + 22, 2, 1, 0, 5000000, 0, 0, 10000000, 10000000, 'NGN', 'PENDING')
  returning id into sbk;
  update public.bookings set status = 'CONFIRMED' where id = sbk;
  select id, terms_version into sag, v from public.deal_agreements where booking_id = sbk;
  perform public.agreement_confirm_as(tenant, sag, v); perform public.agreement_confirm_as(lister, sag, v);
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform public.admin_decide_agreement(sag, 'approve', null);
  sp := public.payment_split_for_booking(sbk);
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id, payee_user_id,
    payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor)
  values (sbk, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee2f0', (sp->>'amount_minor')::bigint, 'NGN', 'PENDING', sag, lister,
    sp->>'payee_subaccount_code', 'ACCT_reserveprobe', (sp->>'lister_share_minor')::bigint, (sp->>'guarantee_minor')::bigint, (sp->>'commission_minor')::bigint);
  s := public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee2f0', (sp->>'amount_minor')::bigint, 0, null);
  if s->>'outcome' <> 'settled' then raise exception 'FAIL 24.0 %', s; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', tenant, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.refund_requests (booking_id, guest_id, reason, note) values (sbk, tenant, 'guest_choice', 'Plans changed') returning id into req;
  reset role;
  if (select due_by from public.refund_requests where id = req) <> private.business_days_after((select requested_at from public.refund_requests where id = req), 5) then
    raise exception 'FAIL 24.1 due_by not five business days'; end if;
  out := out || '24.1 the ask is stamped with a due-by five Nigerian business days out; ';

  -- V-24.2 decided on the desk is not decided until Paystack has it
  r := private.refund_booking_payment(adm, sbk, 4000000, 'rf-probe-1', 'guest_choice', 'Probe refund');
  if r->>'status' <> 'ok' then raise exception 'FAIL 24.2 refund %', r; end if;
  rf := (r->>'refund_id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  r := public.decide_refund_request(req, 'refunded', null);
  if r->>'status' <> 'no_refund_initiated' then raise exception 'FAIL 24.2 decided before Paystack %', r; end if;
  select count(*) into n from public.admin_refund_clock();
  out := out || '24.2 a refund row still pending at Paystack does not answer the ask; ';

  -- V-24.3 the live bug: the processor's answer can now be written
  r := public.record_processor_refund(rf, 'submitted', 'RF-PROBE-1');
  if r->>'status' <> 'ok' then raise exception 'FAIL 24.3 record %', r; end if;
  select processor_status into st from public.booking_refunds where id = rf and processor_submitted_at is not null and processor_refund_id = 'RF-PROBE-1';
  if st is distinct from 'submitted' then raise exception 'FAIL 24.3 not submitted'; end if;
  begin
    update public.booking_refunds set refund_minor = 1 where id = rf;
    raise exception 'FAIL 24.3 refund row editable';
  exception when sqlstate '42501' then null; end;
  begin
    update public.booking_refunds set processor_status = 'pending' where id = rf;
    raise exception 'FAIL 24.3 processor moved backwards';
  exception when sqlstate '42501' then null; end;
  r := public.decide_refund_request(req, 'refunded', null);
  if r->>'status' <> 'ok' then raise exception 'FAIL 24.3 decide %', r; end if;
  out := out || '24.3 Paystack initiation is recorded (the append-only guard used to refuse it), nothing else moves, and the ask is decided; ';

  -- V-24.4 the success webhook
  r := public.record_processor_refund_outcome('RF-PROBE-1', null, 'processed');
  if r->>'status' <> 'ok' then raise exception 'FAIL 24.4 %', r; end if;
  r := public.record_processor_refund_outcome('RF-PROBE-1', null, 'processed');
  if r->>'status' <> 'already' then raise exception 'FAIL 24.4 replay %', r; end if;
  if (select processor_settled_at from public.booking_refunds where id = rf) is null then raise exception 'FAIL 24.4 not stamped'; end if;
  perform private.alert_overdue_refunds();
  out := out || '24.4 refund.processed recorded once, replay answers already, the hourly clock runs; ';

  -- V-86.6 a shared move-in the lead cancels: the paid share goes back to the card
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
  values (bk, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee2f1', 30000000, 'NGN', 'PENDING', ag, lister,
    sp->>'payee_subaccount_code', 'ACCT_reserveprobe', (sp->>'lister_share_minor')::bigint, (sp->>'guarantee_minor')::bigint, (sp->>'commission_minor')::bigint, mate1);
  s := public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee2f1', 30000000, 0, null);
  if s->>'outcome' <> 'share-settled' then raise exception 'FAIL 86.6 share %', s; end if;
  r := public.rent_split_cancel_as(mate1, rp, 'not the lead');
  if r->>'status' <> 'not_found' then raise exception 'FAIL 86.6 a flatmate cancelled %', r; end if;
  r := public.rent_split_cancel_as(tenant, rp, 'We found another flat.');
  if r->>'status' <> 'ok' or jsonb_array_length(r->'refunds') <> 1 or (r->>'refunded_minor')::bigint <> 30000000 then raise exception 'FAIL 86.6 cancel %', r; end if;
  rf := (r->'refunds'->0->>'refund_id')::uuid;
  if (select status from public.bookings where id = bk) <> 'CANCELLED' or (select status from public.deal_agreements where id = ag) <> 'cancelled' then
    raise exception 'FAIL 86.6 charge not cancelled'; end if;
  if (select amount_minor from public.rent_refunds_owed where booking_id = bk) <> 30000000 then raise exception 'FAIL 86.6 owed not recorded'; end if;
  if not private.tenancy_void(rp) then raise exception 'FAIL 86.6 not void'; end if;
  select count(*) into n from public.rent_share_refunds_due(25) where refund_id = rf;
  if n <> 1 then raise exception 'FAIL 86.6 refund not due'; end if;
  sp := public.payment_split_for_rent_share(rp, tenant);
  if sp->>'status' = 'ok' then raise exception 'FAIL 86.6 a cancelled split still opens a share'; end if;
  r := public.record_rent_share_refund(rf, 'submitted', 'RF-PROBE-2');
  if r->>'status' <> 'ok' then raise exception 'FAIL 86.6 submit %', r; end if;
  r := public.record_processor_refund_outcome(null, 'rm-book-00000000-0000-4000-8000-0000000ee2f1', 'processed');
  if r->>'status' <> 'ok' or (r->>'share_refund_id')::uuid <> rf then raise exception 'FAIL 86.6 webhook %', r; end if;
  begin
    update public.rent_share_refunds set amount_minor = 1 where id = rf;
    raise exception 'FAIL 86.6 share refund editable';
  exception when sqlstate '42501' then null; end;
  perform set_config('request.jwt.claims', json_build_object('sub', mate1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.my_rent_share(c1);
  if r->'refund'->>'status' <> 'processed' or (r->>'void')::boolean is not true then raise exception 'FAIL 86.6 my share %', r; end if;
  select count(*) into n from public.rent_share_refunds where id = rf; if n <> 1 then raise exception 'FAIL 86.6 payer cannot read own refund'; end if;
  reset role;
  out := out || '86.6 the lead cancels: booking and agreement cancel, the paid share is queued, submitted and processed back to the card, owed recorded, void; the flatmate reads their refund; ';

  -- V-86.7 a split still short on its move-in day is cancelled by the daily sweep
  r := public.agreement_open_rent_as(tenant, '00000000-0000-4000-8000-0000000ee0d3', mv, null, null); ag2 := (r->>'agreement_id')::uuid;
  select terms_version into v from public.deal_agreements where id = ag2;
  perform public.agreement_confirm_as(tenant, ag2, v); perform public.agreement_confirm_as(lister, ag2, v);
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform public.admin_decide_agreement(ag2, 'approve', null);
  r := public.open_rent_charge(tenant, '00000000-0000-4000-8000-0000000ee0d3', mv); bk2 := (r->>'booking_id')::uuid; rp2 := (r->>'rent_payment_id')::uuid;
  if r->>'status' <> 'ok' then raise exception 'FAIL 86.7 charge %', r; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', tenant, 'role', 'authenticated')::text, true);
  r := public.add_rent_contributor(rp2, mate1, 20000000); c2 := (r->>'contributor_id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', mate1, 'role', 'authenticated')::text, true);
  perform public.answer_rent_share(c2, 'accepted');
  sp := public.payment_split_for_rent_share(rp2, mate1);
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id, payee_user_id,
    payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor, share_payer_id)
  values (bk2, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee2f2', 20000000, 'NGN', 'PENDING', ag2, lister,
    sp->>'payee_subaccount_code', 'ACCT_reserveprobe', (sp->>'lister_share_minor')::bigint, (sp->>'guarantee_minor')::bigint, (sp->>'commission_minor')::bigint, mate1);
  s := public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee2f2', 20000000, 0, null);
  if s->>'outcome' <> 'share-settled' then raise exception 'FAIL 86.7 share %', s; end if;
  update public.rent_payments set move_in = (now() at time zone 'Africa/Lagos')::date where id = rp2;
  n := private.sweep_rent_splits();
  if (select status from public.bookings where id = bk2) <> 'CANCELLED' then raise exception 'FAIL 86.7 sweep did not cancel'; end if;
  select count(*) into n from public.rent_share_refunds
   where rent_payment_id = rp2 and reason = 'stalled_before_move_in' and amount_minor = 20000000 and processor_status = 'pending';
  if n <> 1 then raise exception 'FAIL 86.7 no stalled refund'; end if;
  out := out || '86.7 a split still short on its move-in day is cancelled by the daily sweep and its paid share queued for a card refund.';
  raise exception 'PROBE PASS (rolled back): %', out;
end $$;
