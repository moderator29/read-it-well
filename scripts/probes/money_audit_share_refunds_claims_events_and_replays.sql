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
  r jsonb; ag uuid; v int; bk uuid; rp uuid; sp jsonb; s jsonb; n int; c1 uuid; sbk uuid; sag uuid; rf uuid; brf uuid; st text;
  bk2 uuid; rp2 uuid; ag2 uuid; c2 uuid; rf2 uuid; alerts int;
  mv date := (now() at time zone 'Africa/Lagos')::date + 7;
  out text := '';
begin
  -- A paid stay: settled carries total_minor (item 5)
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
  values (sbk, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee3f0', (sp->>'amount_minor')::bigint, 'NGN', 'PENDING', sag, lister,
    sp->>'payee_subaccount_code', 'ACCT_reserveprobe', (sp->>'lister_share_minor')::bigint, (sp->>'guarantee_minor')::bigint, (sp->>'commission_minor')::bigint);
  -- A second whole charge on the same booking, opened while the first was still unpaid.
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id, payee_user_id,
    payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor)
  values (sbk, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee3f9', (sp->>'amount_minor')::bigint, 'NGN', 'PENDING', sag, lister,
    sp->>'payee_subaccount_code', 'ACCT_reserveprobe', (sp->>'lister_share_minor')::bigint, (sp->>'guarantee_minor')::bigint, (sp->>'commission_minor')::bigint);
  s := public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee3f0', (sp->>'amount_minor')::bigint, 0, null);
  if s->>'outcome' <> 'settled' or (s->>'total_minor')::bigint <> (sp->>'amount_minor')::bigint then raise exception 'FAIL 5 settled %', s; end if;
  out := out || '5 settled carries total_minor; ';

  -- Item 4: a second whole charge is refund-due once, and a replay is already-settled, not a second refund
  s := public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee3f9', (sp->>'amount_minor')::bigint, 0, null);
  if s->>'outcome' <> 'refund-due' then raise exception 'FAIL 4 first %', s; end if;
  s := public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee3f9', (sp->>'amount_minor')::bigint, 0, null);
  if s->>'outcome' <> 'already-settled' or s->>'transaction_status' <> 'REFUND_DUE' then raise exception 'FAIL 4 replay %', s; end if;
  select count(*) into n from public.audit_log where action = 'booking.charge_refund_due' and metadata->>'reference' = 'rm-book-00000000-0000-4000-8000-0000000ee3f9';
  if n <> 1 then raise exception 'FAIL 4 refund-due recorded % times', n; end if;
  out := out || '4 a replay after refund-due answers already-settled (REFUND_DUE), refund-due recorded once; ';

  -- Item 3 on booking refunds: Paystack's processed arrives while the row is still pending
  r := private.refund_booking_payment(adm, sbk, 4000000, 'rf-probe-a1', 'guest_choice', 'Probe refund');
  if r->>'status' <> 'ok' then raise exception 'FAIL 3 refund %', r; end if;
  brf := (r->>'refund_id')::uuid;
  r := public.record_processor_refund_outcome(null, 'rm-book-00000000-0000-4000-8000-0000000ee3f0', 'processed', 3999999);
  if r->>'status' <> 'not_found' then raise exception 'FAIL 2 wrong amount matched a booking refund %', r; end if;
  r := public.record_processor_refund_outcome(null, 'rm-book-00000000-0000-4000-8000-0000000ee3f0', 'processed', 4000000);
  if r->>'status' <> 'ok' or (r->>'refund_id')::uuid <> brf then raise exception 'FAIL 3 early processed %', r; end if;
  if (select processor_submitted_at is null or processor_settled_at is null or processor_status <> 'processed' from public.booking_refunds where id = brf) then
    raise exception 'FAIL 3 early processed not stamped'; end if;
  out := out || '3 processed from pending is kept with submitted_at coalesced; 2 a booking refund of another amount is not matched; ';

  -- A shared move-in the lead cancels, so a share refund is queued
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
  values (bk, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee3f1', 30000000, 'NGN', 'PENDING', ag, lister,
    sp->>'payee_subaccount_code', 'ACCT_reserveprobe', (sp->>'lister_share_minor')::bigint, (sp->>'guarantee_minor')::bigint, (sp->>'commission_minor')::bigint, mate1);
  s := public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee3f1', 30000000, 0, null);
  if s->>'outcome' <> 'share-settled' then raise exception 'FAIL share %', s; end if;
  r := public.rent_split_cancel_as(tenant, rp, 'We found another flat.');
  rf := (r->'refunds'->0->>'refund_id')::uuid;

  -- Item 1: the claim is taken once
  select count(*) into n from public.claim_rent_share_refund(rf);
  if n <> 1 then raise exception 'FAIL 1 first claim'; end if;
  select count(*) into n from public.claim_rent_share_refund(rf);
  if n <> 0 then raise exception 'FAIL 1 claimed twice'; end if;
  select count(*) into n from public.rent_share_refunds_due(25) where refund_id = rf;
  if n <> 0 then raise exception 'FAIL 1 a sending refund is still due'; end if;
  select count(*) into alerts from public.risk_alerts where entity_type = 'rent_share_refund' and entity_id = rf::text;
  r := public.record_rent_share_refund(rf, 'unknown', '');
  if r->>'status' <> 'ok' then raise exception 'FAIL 1 unknown %', r; end if;
  if (select count(*) from public.risk_alerts where entity_type = 'rent_share_refund' and entity_id = rf::text and severity = 'high' and title like 'A move-in share refund may%') <> 1 then
    raise exception 'FAIL 1 unknown raised no alert'; end if;
  select count(*) into n from public.rent_share_refunds_due(25) where refund_id = rf;
  if n <> 0 then raise exception 'FAIL 1 unknown is due again'; end if;
  select count(*) into n from public.claim_rent_share_refund(rf);
  if n <> 0 then raise exception 'FAIL 1 unknown claimed again'; end if;
  begin
    update public.rent_share_refunds set processor_status = 'pending' where id = rf;
    raise exception 'FAIL 1 unknown moved back to pending';
  exception when sqlstate '42501' then null; end;
  r := public.record_rent_share_refund(rf, 'submitted', 'RF-PROBE-S1');
  if r->>'status' <> 'ok' then raise exception 'FAIL 1 resolve %', r; end if;
  r := public.record_rent_share_refund(rf, 'submitted', 'RF-PROBE-S1');
  if r->>'status' <> 'not_claimed' then raise exception 'FAIL 1 re-recorded %', r; end if;
  out := out || '1 a share refund is claimed once, unknown raises an alert and is never due or claimable again, a person resolves it; ';

  -- Item 2: an event with another refund id does not close this refund by reference; wrong amount refused
  r := public.record_processor_refund_outcome('RF-SOMEONE-ELSE', 'rm-book-00000000-0000-4000-8000-0000000ee3f1', 'processed', 30000000);
  if r->>'status' <> 'not_found' then raise exception 'FAIL 2 foreign id closed it %', r; end if;
  r := public.record_processor_refund_outcome('RF-PROBE-S1', null, 'processed', 29999999);
  if r->>'status' <> 'amount_mismatch' then raise exception 'FAIL 2 amount %', r; end if;
  if (select processor_status from public.rent_share_refunds where id = rf) <> 'submitted' then raise exception 'FAIL 2 moved on mismatch'; end if;
  r := public.record_processor_refund_outcome('RF-PROBE-S1', null, 'processed', 30000000);
  if r->>'status' <> 'ok' then raise exception 'FAIL 2 own id %', r; end if;
  r := public.record_processor_refund_outcome('RF-PROBE-S1', null, 'processed', 30000000);
  if r->>'status' <> 'already' then raise exception 'FAIL 2 replay %', r; end if;
  out := out || '2 a foreign refund id answers not_found, a wrong amount is refused and alerted, its own id closes it once; ';

  -- Item 1 cap: a failing share refund is retried at most three times
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
  values (bk2, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee3f2', 20000000, 'NGN', 'PENDING', ag2, lister,
    sp->>'payee_subaccount_code', 'ACCT_reserveprobe', (sp->>'lister_share_minor')::bigint, (sp->>'guarantee_minor')::bigint, (sp->>'commission_minor')::bigint, mate1);
  s := public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee3f2', 20000000, 0, null);
  r := public.rent_split_cancel_as(tenant, rp2, 'Group split up.');
  rf2 := (r->'refunds'->0->>'refund_id')::uuid;
  for n in 1..3 loop
    if (select count(*) from public.claim_rent_share_refund(rf2)) <> 1 then raise exception 'FAIL 1 cap claim %', n; end if;
    r := public.record_rent_share_refund(rf2, 'failed', '');
    if r->>'status' <> 'ok' then raise exception 'FAIL 1 cap fail % %', n, r; end if;
  end loop;
  if (select count(*) from public.claim_rent_share_refund(rf2)) <> 0 then raise exception 'FAIL 1 fourth attempt claimed'; end if;
  if (select count(*) from public.rent_share_refunds_due(25) where refund_id = rf2) <> 0 then raise exception 'FAIL 1 fourth attempt due'; end if;
  if (select attempts from public.rent_share_refunds where id = rf2) <> 3 then raise exception 'FAIL 1 attempts not counted'; end if;
  begin
    update public.rent_share_refunds set attempts = 0 where id = rf2;
    raise exception 'FAIL 1 attempts reset';
  exception when sqlstate '42501' then null; end;
  -- Item 3 on shares: Paystack's failed word from a sending row
  if (select count(*) from public.claim_rent_share_refund(rf)) <> 0 then raise exception 'FAIL processed claimed'; end if;
  out := out || '1 a failing share refund is retried three times, never a fourth, and attempts cannot be reset.';
  raise exception 'PROBE PASS (rolled back): %', out;
end $$;
