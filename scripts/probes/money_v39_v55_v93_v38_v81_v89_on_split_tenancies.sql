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
  adm    constant uuid := '00000000-0000-4000-8000-0000000ee0a5';
  third  constant uuid := '00000000-0000-4000-8000-0000000ee0a6';
  insp   constant uuid := '00000000-0000-4000-8000-0000000ee0d1';
  r jsonb; ag uuid; v int; bk uuid; rp uuid; sp jsonb; s jsonb; n int; c1 uuid; ob uuid; code text; code_id uuid; rep uuid; fresh uuid;
  mv date := (now() at time zone 'Africa/Lagos')::date + 7;
  out text := '';
begin
  r := public.agreement_open_rent_as(tenant, insp, mv, null, null); ag := (r->>'agreement_id')::uuid;
  select terms_version into v from public.deal_agreements where id = ag;
  perform public.agreement_confirm_as(tenant, ag, v); perform public.agreement_confirm_as(lister, ag, v);
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform public.admin_decide_agreement(ag, 'approve', null);
  r := public.open_rent_charge(tenant, insp, mv); bk := (r->>'booking_id')::uuid; rp := (r->>'rent_payment_id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', tenant, 'role', 'authenticated')::text, true);
  r := public.add_rent_contributor(rp, mate1, 50000000); c1 := (r->>'contributor_id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', mate1, 'role', 'authenticated')::text, true);
  perform public.answer_rent_share(c1, 'accepted');
  sp := public.payment_split_for_rent_share(rp, mate1);
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id, payee_user_id,
    payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor, share_payer_id)
  values (bk, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee3f1', 50000000, 'NGN', 'PENDING', ag, lister,
    sp->>'payee_subaccount_code', 'ACCT_reserveprobe', (sp->>'lister_share_minor')::bigint, (sp->>'guarantee_minor')::bigint, (sp->>'commission_minor')::bigint, mate1);
  perform public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee3f1', 50000000, 0, null);

  -- V-55.1 no receipt on a half-paid move-in
  perform set_config('request.jwt.claims', json_build_object('sub', tenant, 'role', 'authenticated')::text, true);
  r := public.create_receipt_code(rp); if r->>'status' <> 'not_paid' then raise exception 'FAIL 55.1 %', r; end if;
  -- V-93.0 nor a renewal
  perform set_config('request.jwt.claims', json_build_object('sub', lister, 'role', 'authenticated')::text, true);
  r := public.offer_renewal(rp, 110000000, null, 0, 0, 0); if r->>'status' <> 'not_paid' then raise exception 'FAIL 93.0 %', r; end if;
  sp := public.payment_split_for_rent_share(rp, tenant);
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id, payee_user_id,
    payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor, share_payer_id)
  values (bk, 'paystack', 'rm-book-00000000-0000-4000-8000-0000000ee3f2', 100000000, 'NGN', 'PENDING', ag, lister,
    sp->>'payee_subaccount_code', 'ACCT_reserveprobe', (sp->>'lister_share_minor')::bigint, (sp->>'guarantee_minor')::bigint, (sp->>'commission_minor')::bigint, tenant);
  s := public.settle_booking_charge('rm-book-00000000-0000-4000-8000-0000000ee3f2', 100000000, 0, null);
  if s->>'outcome' <> 'settled' then raise exception 'FAIL setup %', s; end if;
  out := out || '55/93 nothing opens on a half-paid split; ';

  -- V-55.2 the receipt, verified by anyone through the service role
  perform set_config('request.jwt.claims', json_build_object('sub', tenant, 'role', 'authenticated')::text, true);
  r := public.create_receipt_code(rp); if r->>'status' <> 'ok' then raise exception 'FAIL 55.2 create %', r; end if;
  code := r->>'code'; code_id := (r->>'id')::uuid;
  r := public.verify_receipt('VR-' || left(code, 5) || '-' || right(code, 5), 'probe-subject');
  if r->>'status' <> 'ok' or (r->>'paid_minor')::bigint <> 150000000 or (r->>'paid_in_shares')::boolean is not true
     or r->>'tenant' <> 'Ada O.' or r->>'area' <> 'Yaba' or r ? 'address' then raise exception 'FAIL 55.2 verify %', r; end if;
  r := public.revoke_receipt_code(code_id);
  r := public.verify_receipt(code, 'probe-subject'); if r->>'status' <> 'not_found' then raise exception 'FAIL 55.3 revoked %', r; end if;
  if exists (select 1 from public.area_paid_summary('LA', 'Yaba')) then raise exception 'FAIL 39 a crowd of one answered'; end if;
  out := out || '55 receipt minted, verified (150000000 paid in shares, first name and initial, area only), revoked answers not found; 39 one tenancy is no crowd; ';

  -- V-93 / V-38 near the end of the tenancy
  update public.rent_payments set move_in = (now() at time zone 'Africa/Lagos')::date - 340 where id = rp;
  select id into ob from public.caution_obligations where rent_payment_id = rp;
  perform set_config('request.jwt.claims', json_build_object('sub', lister, 'role', 'authenticated')::text, true);
  r := public.offer_renewal(rp, 110000000, 10000000, 0, 0, 0); if r->>'status' <> 'ok' then raise exception 'FAIL 93.1 offer %', r; end if;
  r := public.offer_renewal(rp, 110000000, 10000000, 0, 0, 0); if (r->>'unchanged')::boolean is not true then raise exception 'FAIL 93.1 repeat %', r; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', tenant, 'role', 'authenticated')::text, true);
  r := public.answer_renewal(rp, 'leaving'); if r->>'status' <> 'ok' then raise exception 'FAIL 93.2 answer %', r; end if;
  r := public.answer_exit_account(rp, 'most_of_the_day', 'always', 'never');
  if r->>'status' <> 'caution_not_settled' then raise exception 'FAIL 38.1 exit before caution %', r; end if;
  r := public.record_caution_return(ob, 20000000, (now() at time zone 'Africa/Lagos')::date, 'bank_transfer', 'NIP9', gen_random_uuid());
  r := public.answer_exit_account(rp, 'most_of_the_day', 'always', 'never');
  if r->>'status' <> 'ok' then raise exception 'FAIL 38.2 exit %', r; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', lister, 'role', 'authenticated')::text, true);
  r := public.relist_from_tenancy(rp); if r->>'status' <> 'ok' then raise exception 'FAIL 38.3 relist %', r; end if;
  fresh := (r->>'listing_id')::uuid;
  if (select status from public.listings where id = fresh) <> 'DRAFT' then raise exception 'FAIL 38.3 not a draft'; end if;
  begin
    update public.listings set status = 'PUBLISHED' where id = fresh;
    r := public.listing_last_let(fresh);
    if (r->>'rent_minor')::bigint <> 100000000 or r->'exit'->>'water' <> 'always' then raise exception 'FAIL 38.4 last let %', r; end if;
    out := out || '38.4 the published successor prints the last let and the tenant''s account; ';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
    out := out || '38.4 (publish gate outside MONEY refused the probe draft: ' || left(sqlerrm, 60) || '); ';
  end;
  out := out || '93 offer once, answer once; 38 exit account waits for the caution, relist makes a draft; ';

  -- V-81 the lock's tables
  set local role authenticated;
  begin
    perform public_key_spki from public.money_credentials limit 1;
    raise exception 'FAIL 81.1 key material readable';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.money_step_ups (user_id, method, digest) values (tenant, 'password', repeat('a', 64));
    raise exception 'FAIL 81.2 a member recorded a step-up';
  exception when insufficient_privilege then null; end;
  reset role;
  set local role service_role;
  insert into public.money_step_ups (user_id, method, digest) values (tenant, 'password', repeat('a', 64));
  reset role;
  out := out || '81 a member reads no key and writes no proof, the service role records one; ';

  -- V-89 the reporter's side, saved views and signals
  insert into public.reports (reporter_id, target_type, target_id, reason, status, category)
  values (mate1, 'listing', '00000000-0000-4000-8000-0000000ee0c1', 'Probe report', 'open', 'other') returning id into rep;
  perform set_config('request.jwt.claims', json_build_object('sub', mate1, 'role', 'authenticated')::text, true);
  r := public.withdraw_my_report(rep); if r->>'status' <> 'ok' then raise exception 'FAIL 89.1 %', r; end if;
  r := public.withdraw_my_report(rep); if r->>'status' <> 'closed' then raise exception 'FAIL 89.1 twice %', r; end if;
  select count(*) into n from public.my_reports() where id = rep and status = 'withdrawn'; if n <> 1 then raise exception 'FAIL 89.2 my_reports'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', third, 'role', 'authenticated')::text, true);
  r := public.withdraw_my_report(rep); if r->>'status' <> 'not_found' then raise exception 'FAIL 89.1 stranger %', r; end if;
  select count(*) into n from public.admin_report_signals(array[rep]); if n <> 0 then raise exception 'FAIL 89.3 stranger reads signals'; end if;
  set local role authenticated;
  begin
    insert into public.admin_saved_views (owner, name, filters) values (third, 'x', '{}');
    raise exception 'FAIL 89.4 a member saved a view';
  exception when insufficient_privilege then null; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  select count(*) into n from public.admin_report_signals(array[rep]); if n <> 1 then raise exception 'FAIL 89.3 admin signals'; end if;
  set local role authenticated;
  insert into public.admin_saved_views (owner, name, filters, shared) values (adm, 'Probe view', '{"tab":"reports"}', false);
  select count(*) into n from public.admin_saved_views where owner = adm; if n <> 1 then raise exception 'FAIL 89.4 admin view'; end if;
  reset role;
  out := out || '89 withdraw once, my reports shows it, signals only for moderators, views only for admins.';
  raise exception 'PROBE PASS (rolled back): %', out;
end $$;
