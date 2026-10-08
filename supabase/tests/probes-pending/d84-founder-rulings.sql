-- D84-FOUNDER-RULINGS: the founder's rulings of 8 October 2026.
-- Needs, applied in order: everything d77 needs, d68d_the_rail_decides_the_gate,
-- d77_founder_rulings_on_the_gate, d84_founder_rulings_8_october (pending).
--  PROBE 1  the switch: `agreement_staff_review` is a row and it is off; a
--           missing row reads as on
--  PROBE 2  switch off: the second confirmation of the same terms approves the
--           agreement, writes the event log and the audit row, and queues the
--           `agreement.approved` email for both parties, as a staff approval does
--  PROBE 3  switch on: the same deal waits for a person (in_review, staff_review)
--  PROBE 4  agreement_review_all still forces review with the switch off; and a
--           direct-rail risk signal still sends the deal to review (D68d unchanged)
--  PROBE 5  the first-deal signal is scoped: first deal AND (unverified business
--           OR over the threshold)
--  PROBE 6  the direct-rail threshold is 500,000 naira
--  PROBE 7  Vallo Pro and Vallo Business are plan rows with their price, their
--           grants and quotas; the trial length is a settings value (4 days,
--           the founder's decision) members can read and cannot write
-- Switches are set inside the transaction. Fixture writes keep every trigger
-- on; a refused fixture skips its probe with PROBE_SKIP. Everything is rolled
-- back by the final raise.
do $$
declare
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  host  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  biz uuid; acc uuid; rt uuid; rp uuid; pol uuid; dd date;
  b uuid; ag public.deal_agreements%rowtype; r jsonb; reasons jsonb; n int;
  pro_id bigint; business_id bigint;
  start_day date := (now() at time zone 'Africa/Lagos')::date + 14;
  host_paid boolean;
begin
  -- PROBE 6 (read first, before anything moves it).
  if (select amount_threshold_minor from public.agreement_risk_settings where id = 1) <> 50000000 then
    if (select updated_by from public.agreement_risk_settings where id = 1) is not null then
      raise notice 'PROBE_SKIP d84 6: staff have since set the threshold to %',
        (select amount_threshold_minor from public.agreement_risk_settings where id = 1);
    else
      raise exception 'PROBE_FAIL d84 6: the direct-rail threshold is not 500,000 naira (50,000,000 minor)';
    end if;
  end if;

  -- PROBE 1.
  if (select enabled from public.feature_flags where key = 'agreement_staff_review') is distinct from false then
    raise exception 'PROBE_FAIL d84 1: the agreement_staff_review row is missing or on';
  end if;
  if private.agreement_staff_review_on() then
    raise exception 'PROBE_FAIL d84 1: the switch reads on while its row says off';
  end if;
  delete from public.feature_flags where key = 'agreement_staff_review';
  if not private.agreement_staff_review_on() then
    raise exception 'PROBE_FAIL d84 1: a missing row did not read as on';
  end if;
  insert into public.feature_flags (key, enabled) values ('agreement_staff_review', false);

  -- The fixture: a hotel (direct rail), as d68d and d77 build it.
  update public.feature_flags set enabled = true where key = 'room_bookings';
  update public.feature_flags set enabled = false where key in ('stays_instant_pay', 'agreement_review_all');
  update public.agreement_risk_settings set amount_threshold_minor = 50000000, check_first_deal = false, check_amount = true,
                                            check_recent_change = false, check_payout_name = false, check_fraud_radar = false
   where id = 1;
  insert into public.businesses (owner_id, kind, name, slug, status, source)
  values (host, 'hotel', 'Probe D84 Hotel', 'probe-d84-' || gen_random_uuid(), 'PUBLISHED', 'first_party') returning id into biz;
  insert into public.accommodations (business_id, name, slug, status)
  values (biz, 'Probe D84 Hotel', 'probe-d84-a-' || gen_random_uuid(), 'PUBLISHED') returning id into acc;
  insert into public.room_types (accommodation_id, name, category, sleeps, units_total, base_rate_minor, status)
  values (acc, 'Probe double', 'double', 2, 8, 5000000, 'PUBLISHED') returning id into rt;
  select id into pol from public.cancellation_policies limit 1;
  insert into public.rate_plans (room_type_id, name, cancellation_policy_id, rate_minor, currency, min_stay_nights, active)
  values (rt, 'Probe room only', pol, 5000000, 'NGN', 1, true) returning id into rp;
  for dd in select generate_series(start_day, start_day + 12, interval '1 day')::date loop
    insert into public.room_inventory (room_type_id, date, units_open) values (rt, dd, 8);
  end loop;
  host_paid := exists (select 1 from public.deal_agreements x where x.owner_id = host and x.status = 'paid');

  -- PROBE 2: switch off, no signal: the second confirmation approves.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
  values (guest, acc, rt, rp, 1, start_day, start_day + 1, 2) returning id into b;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  update public.bookings set status = 'CONFIRMED' where id = b;
  select * into ag from public.deal_agreements where booking_id = b;
  if ag.id is null then raise exception 'PROBE_FAIL d84 2: no agreement was drawn up for the stay'; end if;
  if ag.status <> 'awaiting_parties' then
    raise exception 'PROBE_FAIL d84 2: the fixture agreement opened as %, not awaiting_parties', ag.status;
  end if;
  if (private.rail_for_booking(b)).rail is distinct from 'direct' then
    raise exception 'PROBE_FAIL d84 2: a hotel room did not resolve to the direct rail';
  end if;
  r := public.agreement_confirm_as(guest, ag.id, ag.terms_version);
  if r ->> 'agreement_status' <> 'awaiting_parties' then
    raise exception 'PROBE_FAIL d84 2: one confirmation moved the agreement: %', r;
  end if;
  r := public.agreement_confirm_as(host, ag.id, ag.terms_version);
  select * into ag from public.deal_agreements where id = ag.id;
  if ag.status <> 'approved' or ag.decided_by is not null or r ->> 'agreement_status' <> 'approved' then
    raise exception 'PROBE_FAIL d84 2: the second confirmation did not approve the agreement: %', r;
  end if;
  if not exists (select 1 from public.deal_agreement_events e where e.agreement_id = ag.id and e.action = 'approved'
                   and e.to_status = 'approved') then
    raise exception 'PROBE_FAIL d84 2: no approved event in the agreement''s log';
  end if;
  if not exists (select 1 from public.audit_log a where a.entity_type = 'deal_agreement' and a.entity_id = ag.id::text
                   and a.action = 'agreement.approve' and a.metadata ->> 'decided_by' = 'system') then
    raise exception 'PROBE_FAIL d84 2: no audit row for the approval';
  end if;
  select count(distinct o.user_id) into n from public.email_outbox o
   where o.template = 'agreement.approved' and o.payload ->> 'agreement_id' = ag.id::text
     and o.user_id in (ag.renter_id, ag.owner_id);
  if n <> 2 then
    raise exception 'PROBE_FAIL d84 2: the agreement.approved email went to % of the 2 parties', n;
  end if;
  if private.agreement_payable(ag.id) is not null then
    raise exception 'PROBE_FAIL d84 2: the approved agreement is not payable: %', private.agreement_payable(ag.id);
  end if;

  -- PROBE 3: switch on, the same deal waits for a person.
  update public.feature_flags set enabled = true where key = 'agreement_staff_review';
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
  values (guest, acc, rt, rp, 1, start_day + 2, start_day + 3, 2) returning id into b;
  update public.bookings set status = 'CONFIRMED' where id = b;
  select * into ag from public.deal_agreements where booking_id = b;
  perform public.agreement_confirm_as(guest, ag.id, ag.terms_version);
  r := public.agreement_confirm_as(host, ag.id, ag.terms_version);
  if r ->> 'agreement_status' <> 'in_review' or not (r -> 'review') ? 'staff_review' then
    raise exception 'PROBE_FAIL d84 3: with the switch on the deal did not wait for a person: %', r;
  end if;
  if exists (select 1 from public.email_outbox o where o.template = 'agreement.approved' and o.payload ->> 'agreement_id' = ag.id::text) then
    raise exception 'PROBE_FAIL d84 3: an approval email went out for a deal waiting for review';
  end if;
  update public.feature_flags set enabled = false where key = 'agreement_staff_review';

  -- PROBE 4a: the kill switch still forces review with the switch off.
  update public.feature_flags set enabled = true where key = 'agreement_review_all';
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
  values (guest, acc, rt, rp, 1, start_day + 4, start_day + 5, 2) returning id into b;
  update public.bookings set status = 'CONFIRMED' where id = b;
  select * into ag from public.deal_agreements where booking_id = b;
  perform public.agreement_confirm_as(guest, ag.id, ag.terms_version);
  r := public.agreement_confirm_as(host, ag.id, ag.terms_version);
  if r ->> 'agreement_status' <> 'in_review' or not (r -> 'review') ? 'kill_switch' then
    raise exception 'PROBE_FAIL d84 4: agreement_review_all did not force review: %', r;
  end if;
  update public.feature_flags set enabled = false where key = 'agreement_review_all';

  -- PROBE 4b: a direct-rail risk signal still goes to review (D68d unchanged).
  update public.agreement_risk_settings set amount_threshold_minor = 100 where id = 1;
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
  values (guest, acc, rt, rp, 1, start_day + 6, start_day + 7, 2) returning id into b;
  update public.bookings set status = 'CONFIRMED' where id = b;
  select * into ag from public.deal_agreements where booking_id = b;
  perform public.agreement_confirm_as(guest, ag.id, ag.terms_version);
  r := public.agreement_confirm_as(host, ag.id, ag.terms_version);
  if r ->> 'agreement_status' <> 'in_review' or not (r -> 'review') ? 'amount_over' then
    raise exception 'PROBE_FAIL d84 4: a direct deal over the threshold was not sent for review: %', r;
  end if;
  update public.agreement_risk_settings set amount_threshold_minor = 50000000 where id = 1;

  -- PROBE 5: the first-deal signal, scoped.
  update public.agreement_risk_settings set check_first_deal = true, check_amount = true where id = 1;
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
  values (guest, acc, rt, rp, 1, start_day + 8, start_day + 9, 2) returning id into b;
  update public.bookings set status = 'CONFIRMED' where id = b;
  select * into ag from public.deal_agreements where booking_id = b;
  if host_paid then
    raise notice 'PROBE_SKIP d84 5: the QA host already has a paid deal, so first_deal cannot fire';
  else
    reasons := private.agreement_review_required(ag.id) -> 'reasons';
    if not reasons ? 'first_deal' then
      raise exception 'PROBE_FAIL d84 5: an unverified business''s first deal raised no signal: %', reasons;
    end if;
    update public.businesses set verification_tier = 1, verified = true, cac_number = 'RC-8400084' where id = biz;
    reasons := private.agreement_review_required(ag.id) -> 'reasons';
    if reasons ? 'first_deal' then
      raise exception 'PROBE_FAIL d84 5: a verified business''s first deal under the threshold raised first_deal';
    end if;
    update public.agreement_risk_settings set amount_threshold_minor = 100 where id = 1;
    reasons := private.agreement_review_required(ag.id) -> 'reasons';
    if not (reasons ? 'first_deal' and reasons ? 'amount_over') then
      raise exception 'PROBE_FAIL d84 5: a verified first deal over the threshold did not raise first_deal: %', reasons;
    end if;
    update public.agreement_risk_settings set amount_threshold_minor = 50000000 where id = 1;
  end if;

  -- PROBE 7: the plans.
  select id into pro_id from public.entitlement_plans
   where plan_key = 'pro' and name = 'Vallo Pro' and not is_default and price_minor = 950000 and billing_interval = 'month'
     and perks @> array['deep_analytics', 'pro_badge', 'priority_support'] and effective_to is null;
  select id into business_id from public.entitlement_plans
   where plan_key = 'business' and name = 'Vallo Business' and not is_default and price_minor = 3500000 and billing_interval = 'month'
     and perks @> array['team_members', 'command_centre', 'bulk_tools', 'export'] and effective_to is null;
  if pro_id is null or business_id is null then
    raise exception 'PROBE_FAIL d84 7: the Pro or Business plan row is missing or wrong';
  end if;
  if (select price_minor from public.entitlement_plans where plan_key = 'free' and is_default) is not null then
    raise exception 'PROBE_FAIL d84 7: the free plan carries a price';
  end if;
  if not exists (select 1 from public.entitlement_plan_features where plan_id = pro_id and feature_key = 'listing_boost' and granted and quota = 4)
     or not exists (select 1 from public.entitlement_plan_features where plan_id = business_id and feature_key = 'listing_spotlight' and granted and quota = 2)
     or not exists (select 1 from public.entitlement_plan_features where plan_id = business_id and feature_key = 'listing_featured' and granted and quota = 1)
     or not exists (select 1 from public.entitlement_plan_features where plan_id = business_id and feature_key = 'team_members' and granted)
     or (select count(*) from public.entitlement_plan_features where plan_id in (pro_id, business_id)) <> 18 then
    raise exception 'PROBE_FAIL d84 7: the plan grants are not the ruling''s';
  end if;
  insert into public.member_entitlement_plans (user_id, plan_id, reason) values (guest, pro_id, 'PROBE d84, rolled back');
  if not public.entitlement_check(guest, 'listing_boost') or public.entitlement_check(guest, 'listing_spotlight')
     or not public.entitlement_check(guest, 'listing_create') then
    raise exception 'PROBE_FAIL d84 7: a Pro member does not answer as the Pro plan grants';
  end if;
  insert into public.member_entitlement_plans (user_id, plan_id, reason, effective_from)
  values (guest, business_id, 'PROBE d84, rolled back', now() + interval '1 second');
  if not public.entitlement_check(guest, 'listing_featured', now() + interval '2 seconds')
     or not public.entitlement_check(guest, 'business_pro', now() + interval '2 seconds') then
    raise exception 'PROBE_FAIL d84 7: a Business member does not answer as the Business plan grants';
  end if;
  if not exists (select 1 from public.subscription_settings where id = 1 and trial_days between 0 and 60) then
    raise exception 'PROBE_FAIL d84 7: the trial length row is missing';
  end if;
  if (select trial_days from public.subscription_settings where id = 1) <> 4 then
    -- A value set since the seed is the founder's answer, not a fault.
    raise notice 'PROBE_SKIP d84 7: the trial length has since been set to % days',
      (select trial_days from public.subscription_settings where id = 1);
  end if;
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  if (select count(*) from public.subscription_settings) <> 1 then
    raise exception 'PROBE_FAIL d84 7: a visitor cannot read the trial length';
  end if;
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  begin
    update public.subscription_settings set trial_days = 60 where id = 1;
    raise exception 'PROBE_FAIL d84 7: a member changed the trial length';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.member_entitlement_plans (user_id, plan_id, reason) values (guest, business_id, 'self-granted');
    raise exception 'PROBE_FAIL d84 7: a member granted themselves a plan';
  exception when insufficient_privilege then null;
  end;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

  raise exception 'PROBE_OK d84-founder-rulings';
end
$$;
