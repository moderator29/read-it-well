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
do $$
declare
  tenant constant uuid := '00000000-0000-4000-8000-0000000ee0a1';
  lister constant uuid := '00000000-0000-4000-8000-0000000ee0a2';
  adm    constant uuid := '00000000-0000-4000-8000-0000000ee0a5';
  insp   constant uuid := '00000000-0000-4000-8000-0000000ee0d1';
  flat   constant uuid := '00000000-0000-4000-8000-0000000ee0c1';
  stay   constant uuid := '00000000-0000-4000-8000-0000000ee0c2';
  r jsonb; ag uuid; v int; bk uuid; sp jsonb; s jsonb; n int; t jsonb; amt bigint; frozen timestamptz; sbk uuid; sag uuid;
  mv date := (now() at time zone 'Africa/Lagos')::date + 7;
  out text := '';
begin
  -- V-13.1 the yes froze the quote
  select count(*) into n from public.move_in_quotes where inspection_id = insp and total_minor = 150000000 and agency_minor = 10000000 and total_stated = false and tenant_id = tenant and lister_id = lister;
  if n <> 1 then raise exception 'FAIL 13.1 no quote at the yes'; end if;
  out := out || '13.1 quote frozen at the yes; ';
  -- V-13.2 the lister raises the agency fee after the yes
  update public.listings set agency_fee_minor = 50000000 where id = flat;
  r := public.agreement_open_rent_as(tenant, insp, mv, null, null);
  ag := (r->>'agreement_id')::uuid;
  select amount_minor, terms, terms_version into amt, t, v from public.deal_agreements where id = ag;
  if amt <> 150000000 or (t->>'agency_minor')::bigint <> 10000000 or not (t ? 'quoted_at') then
    raise exception 'FAIL 13.2 agreement did not take the quote: % %', amt, t; end if;
  out := out || '13.2 agreement drawn at the quote (150000000) after the listing rose to 190000000; ';
  -- amend keeps the quote
  r := public.agreement_amend_as(tenant, ag, mv + 1, null, 'probe');
  select amount_minor, terms, terms_version into amt, t, v from public.deal_agreements where id = ag;
  if amt <> 150000000 or (t->>'agency_minor')::bigint <> 10000000 then raise exception 'FAIL 13.2b amend lost the quote %', t; end if;
  mv := mv + 1;
  out := out || '13.2b amendment keeps the quote; ';
  r := public.agreement_confirm_as(tenant, ag, v);
  r := public.agreement_confirm_as(lister, ag, v);
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  r := public.admin_decide_agreement(ag, 'approve', null);
  perform set_config('request.jwt.claims', '', true);
  -- V-13.3 the charge is the quote
  r := public.open_rent_charge(tenant, insp, mv);
  if r->>'status' <> 'ok' or (r->>'total_minor')::bigint <> 150000000 then raise exception 'FAIL 13.3 charge %', r; end if;
  bk := (r->>'booking_id')::uuid;
  select count(*) into n from public.rent_payments where booking_id = bk and agency_minor = 10000000 and total_minor = 150000000;
  if n <> 1 then raise exception 'FAIL 13.3 parts not from the quote'; end if;
  out := out || '13.3 charge opened at the quote, parts from the quote; ';
  -- V-13.4 the guard
  begin
    update public.rent_payments set agency_minor = 50000000, total_minor = 190000000 where booking_id = bk;
    raise exception 'FAIL 13.4 guard let a changed figure through';
  exception when sqlstate 'VQ013' then out := out || '13.4 VQ013 refuses a changed charge; ';
            when sqlstate '42501' then out := out || '13.4 refused (agreement guard first); ';
  end;
  begin
    update public.move_in_quotes set total_minor = 1 where inspection_id = insp;
    raise exception 'FAIL 13.5 quote editable';
  exception when sqlstate '42501' then out := out || '13.5 quote is frozen; ';
  end;
  -- V-13.6 settlement unaffected
  sp := public.payment_split_for_booking(bk);
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id, payee_user_id,
    payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor)
  values (bk, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee0f1', (sp->>'amount_minor')::bigint, 'NGN', 'PENDING', ag, lister,
    sp->>'payee_subaccount_code', 'ACCT_reserveprobe', (sp->>'lister_share_minor')::bigint, (sp->>'guarantee_minor')::bigint, (sp->>'commission_minor')::bigint);
  s := public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee0f1', 150000000, 1000, null);
  if s->>'outcome' <> 'settled' then raise exception 'FAIL 13.6 settle %', s; end if;
  select count(*) into n from public.booking_cancellation_terms where booking_id = bk;
  if n <> 0 then raise exception 'FAIL 20.0 a rent charge got cancellation terms'; end if;
  out := out || '13.6 settled with triggers in place, rent charge has no stay terms; ';
  -- V-20.1 a stay: acceptance freezes the terms into the agreement and the table
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, adults, children, price_per_night_minor, cleaning_fee_minor, service_fee_minor, subtotal_minor, total_minor, currency, status)
  values (stay, tenant, (now() at time zone 'Africa/Lagos')::date + 20, (now() at time zone 'Africa/Lagos')::date + 22, 2, 1, 0, 5000000, 0, 0, 10000000, 10000000, 'NGN', 'PENDING')
  returning id into sbk;
  update public.bookings set status = 'CONFIRMED' where id = sbk;
  select id, terms into sag, t from public.deal_agreements where booking_id = sbk;
  if sag is null or not (t ? 'cancellation') then raise exception 'FAIL 20.1 agreement has no cancellation terms %', t; end if;
  select frozen_at into frozen from public.booking_cancellation_terms where booking_id = sbk and source = 'platform_schedule_v1' and terms = t->'cancellation';
  if frozen is null then raise exception 'FAIL 20.1 not frozen at acceptance'; end if;
  out := out || '20.1 frozen at acceptance, inside the confirmed agreement; ';
  select terms_version into v from public.deal_agreements where id = sag;
  r := public.agreement_confirm_as(tenant, sag, v);
  r := public.agreement_confirm_as(lister, sag, v);
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  r := public.admin_decide_agreement(sag, 'approve', null);
  perform set_config('request.jwt.claims', '', true);
  sp := public.payment_split_for_booking(sbk);
  if sp->>'status' <> 'ok' then raise exception 'FAIL 20.2 split %', sp; end if;
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id, payee_user_id,
    payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor)
  values (sbk, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee0f2', (sp->>'amount_minor')::bigint, 'NGN', 'PENDING', sag, lister,
    sp->>'payee_subaccount_code', 'ACCT_reserveprobe', (sp->>'lister_share_minor')::bigint, (sp->>'guarantee_minor')::bigint, (sp->>'commission_minor')::bigint);
  s := public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee0f2', (sp->>'amount_minor')::bigint, 500, null);
  if s->>'outcome' <> 'settled' then raise exception 'FAIL 20.2 settle %', s; end if;
  select count(*) into n from public.booking_cancellation_terms where booking_id = sbk and frozen_at = frozen;
  if n <> 1 then raise exception 'FAIL 20.2 payment rewrote the terms'; end if;
  select count(*) into n from public.risk_alerts where entity_id in (sbk::text, bk::text) and title like 'Cancellation terms%';
  if n <> 0 then raise exception 'FAIL 20.2 an alert was raised'; end if;
  begin
    update public.booking_cancellation_terms set source = 'policy:x' where booking_id = sbk;
    raise exception 'FAIL 20.3 terms editable';
  exception when sqlstate '42501' then out := out || '20.3 terms frozen; ';
  end;
  out := out || '20.2 stay settled, terms kept from acceptance, no alert; ';
  -- RLS: the guest reads the terms, a stranger does not
  perform set_config('request.jwt.claims', json_build_object('sub', tenant, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.booking_cancellation_terms where booking_id = sbk;
  if n <> 1 then raise exception 'FAIL RLS guest cannot read terms'; end if;
  select count(*) into n from public.move_in_quotes where inspection_id = insp;
  if n <> 1 then raise exception 'FAIL RLS tenant cannot read quote'; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-8000-0000000ee0a6', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.booking_cancellation_terms where booking_id = sbk;
  if n <> 0 then raise exception 'FAIL RLS stranger reads terms'; end if;
  select count(*) into n from public.move_in_quotes where inspection_id = insp;
  if n <> 0 then raise exception 'FAIL RLS stranger reads quote'; end if;
  reset role;
  out := out || 'RLS: parties read, a stranger reads nothing.';
  raise exception 'PROBE PASS (rolled back): %', out;
end $$;
