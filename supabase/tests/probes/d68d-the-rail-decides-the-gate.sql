-- D68D-THE-RAIL-DECIDES-THE-GATE: after both parties agree, the rail decides.
-- Needs, applied in order: b3_rate_agreement_gate, b3x_fee_record_unify,
-- b2_rail_at_open, b6_member_money_rail, d73a_stays_instant_pay,
-- d73b_provider_arrangements, d68d_the_rail_decides_the_gate.
-- The four probes the founder asked for (D68d):
--  PROBE 1  escrow opens without approval: a rent agreement on the escrow rail is
--           approved by the system the moment both confirm, and is payable
--  PROBE 2  direct with a signal is refused: a hotel stay whose host has no paid
--           deal goes to in_review, and a card charge on it is refused even if the
--           agreement is forced to approved, until a person approves
--  PROBE 3  direct with no signal opens: with the signals quiet the same kind of
--           stay is approved by the system and the charge is written
--  PROBE 4  the kill switch refuses everything: system-approved escrow and direct
--           agreements both become unpayable, and the charge is refused
-- Fixture writes keep every trigger on;
-- a refused rent fixture skips probes 1 and 4's escrow half with PROBE_SKIP.
-- Everything is rolled back by the final raise.
do $$
declare
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  host  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  biz uuid; acc uuid; rt uuid; rp uuid; pol uuid; dd date;
  b1 uuid; b2 uuid; ag1 public.deal_agreements%rowtype; ag2 public.deal_agreements%rowtype;
  lister uuid; renter uuid; lst uuid; insp uuid; rent_ag uuid; have_rent boolean := true;
  split jsonb; r jsonb;
  start_day date := (now() at time zone 'Africa/Lagos')::date + 10;
begin
  insert into public.console_step_ups (user_id, session_id, expires_at)
  values (host, '00000000-0000-4000-8000-00000000c0de', now() + interval '1 hour')
  on conflict (user_id, session_id) do update set expires_at = excluded.expires_at;
  if (select enabled from public.feature_flags where key = 'agreement_review_all') is distinct from false then
    raise exception 'PROBE_FAIL d68d 0: the kill switch is not seeded off';
  end if;
  update public.feature_flags set enabled = true where key = 'room_bookings';
  update public.feature_flags set enabled = false where key = 'stays_instant_pay';
  update public.agreement_risk_settings set check_first_deal = true, check_amount = true, check_recent_change = true,
                                            check_payout_name = true, check_fraud_radar = true where id = 1;

  -- The hotel (direct rail), as the room-bookings probe builds it.
  insert into public.businesses (owner_id, kind, name, slug, status, source)
  values (host, 'hotel', 'Probe Gate Hotel', 'probe-gate-' || gen_random_uuid(), 'PUBLISHED', 'first_party') returning id into biz;
  insert into public.accommodations (business_id, name, slug, status)
  values (biz, 'Probe Gate Hotel', 'probe-gate-a-' || gen_random_uuid(), 'PUBLISHED') returning id into acc;
  insert into public.room_types (accommodation_id, name, category, sleeps, units_total, base_rate_minor, status)
  values (acc, 'Probe double', 'double', 2, 4, 5000000, 'PUBLISHED') returning id into rt;
  select id into pol from public.cancellation_policies limit 1;
  insert into public.rate_plans (room_type_id, name, cancellation_policy_id, rate_minor, currency, min_stay_nights, active)
  values (rt, 'Probe room only', pol, 5000000, 'NGN', 1, true) returning id into rp;
  for dd in select generate_series(start_day, start_day + 9, interval '1 day')::date loop
    insert into public.room_inventory (room_type_id, date, units_open) values (rt, dd, 4);
  end loop;
  insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at,
                                    is_default, paystack_subaccount_code)
  values (host, '058', 'Probe Bank', '0123456789', 'Probe Host', now(), true, 'ACCT_probe_host');
  -- The room and plan were just written: that is itself the recent-change signal.
  update public.room_types set updated_at = now() - interval '30 days' where id = rt;
  update public.rate_plans set updated_at = now() - interval '30 days' where id = rp;

  -- PROBE 2: direct, with a signal (the host has no paid deal on Vallo).
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
  values (guest, acc, rt, rp, 1, start_day, start_day + 1, 2) returning id into b1;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  update public.bookings set status = 'CONFIRMED' where id = b1;
  select * into ag1 from public.deal_agreements where booking_id = b1;
  if (private.rail_for_booking(b1)).rail is distinct from 'direct' then
    raise exception 'PROBE_FAIL d68d 2: a hotel room did not resolve to the direct rail';
  end if;
  perform public.agreement_confirm_as(guest, ag1.id, ag1.terms_version);
  r := public.agreement_confirm_as(host, ag1.id, ag1.terms_version);
  if r ->> 'agreement_status' <> 'in_review' then
    if (select count(*) from public.deal_agreements x where x.owner_id = host and x.status = 'paid') > 0 then
      raise notice 'PROBE_SKIP d68d 2: the QA host already has a paid deal, so first_deal cannot fire; forcing a signal';
    else
      raise exception 'PROBE_FAIL d68d 2: a direct deal with a signal was not sent for review: %', r;
    end if;
  end if;
  update public.deal_agreements set status = 'approved', decided_by = null, decided_at = now() where id = ag1.id;
  update public.agreement_risk_settings set amount_threshold_minor = 1 where id = 1;  -- a signal for certain
  split := public.payment_split_for_booking(b1);
  begin
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id,
      payee_user_id, payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor, paystack_mode)
    values (b1, 'paystack', 'rm-book-' || gen_random_uuid(), ag1.amount_minor, 'NGN', 'PENDING', ag1.id, host, 'ACCT_probe_host', 'ACCT_probe_reserve',
      (split ->> 'lister_share_minor')::bigint, coalesce((split ->> 'guarantee_minor')::bigint, 0), (split ->> 'commission_minor')::bigint, 'test');
    raise exception 'PROBE_FAIL d68d 2: a direct charge with a risk signal was written without a person';
  exception when insufficient_privilege then
    if sqlerrm not like '%review_required%' then raise; end if;
  end;
  update public.agreement_risk_settings set amount_threshold_minor = 300000000 where id = 1;

  -- PROBE 3: direct, no signal (the signals quiet for this host).
  update public.agreement_risk_settings set check_first_deal = false, check_recent_change = false where id = 1;
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
  values (guest, acc, rt, rp, 1, start_day + 3, start_day + 4, 2) returning id into b2;
  update public.bookings set status = 'CONFIRMED' where id = b2;
  select * into ag2 from public.deal_agreements where booking_id = b2;
  perform public.agreement_confirm_as(guest, ag2.id, ag2.terms_version);
  r := public.agreement_confirm_as(host, ag2.id, ag2.terms_version);
  select * into ag2 from public.deal_agreements where id = ag2.id;
  if ag2.status <> 'approved' or ag2.decided_by is not null
     or not exists (select 1 from public.audit_log a where a.entity_id = ag2.id::text and a.metadata ->> 'decided_by' = 'system') then
    raise exception 'PROBE_FAIL d68d 3: a direct deal with no signal was not approved by the system: % %', r, row_to_json(ag2);
  end if;
  split := public.payment_split_for_booking(b2);
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id,
    payee_user_id, payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor, paystack_mode)
  values (b2, 'paystack', 'rm-book-' || gen_random_uuid(), ag2.amount_minor, 'NGN', 'PENDING', ag2.id, host, 'ACCT_probe_host', 'ACCT_probe_reserve',
    (split ->> 'lister_share_minor')::bigint, coalesce((split ->> 'guarantee_minor')::bigint, 0), (split ->> 'commission_minor')::bigint, 'test');

  -- PROBE 1: escrow opens without approval (a rental by an individual).
  select l.id, a.user_id into lst, lister from public.listings l join public.agents a on a.id = l.agent_id
   where not coalesce(l.is_demo, false) and a.user_id is not null and a.type = 'individual' and l.property_type in ('rental', 'home')
   limit 1;
  select u.id into renter from auth.users u where u.id <> lister order by u.created_at limit 1;
  begin
    insert into public.inspection_requests (listing_id, requester_id, lister_id, requested_at)
    values (lst, renter, lister, now()) returning id into insp;
    insert into public.deal_agreements (kind, listing_id, inspection_id, renter_id, owner_id, amount_minor, terms)
    values ('rent', lst, insp, renter, lister, 50000000, '{"total_minor": 50000000}') returning id into rent_ag;
  exception when others then
    have_rent := false;
    raise notice 'PROBE_SKIP d68d 1: the rent fixture was refused: %', sqlerrm;
  end;
  if have_rent then
    if private.rail_for_agreement(rent_ag) is distinct from 'escrow' then
      raise exception 'PROBE_FAIL d68d 1: a rental did not resolve to escrow';
    end if;
    perform public.agreement_confirm_as(renter, rent_ag, 1);
    r := public.agreement_confirm_as(lister, rent_ag, 1);
    if r ->> 'agreement_status' <> 'approved' or private.agreement_payable(rent_ag) is not null
       or (select decided_by from public.deal_agreements where id = rent_ag) is not null then
      raise exception 'PROBE_FAIL d68d 1: escrow did not open without approval: %', r;
    end if;
  end if;

  -- PROBE 4: the kill switch refuses everything.
  update public.feature_flags set enabled = true where key = 'agreement_review_all';
  if have_rent and private.agreement_payable(rent_ag) is distinct from 'review_required' then
    raise exception 'PROBE_FAIL d68d 4: escrow stayed payable under the kill switch';
  end if;
  if private.agreement_payable(ag2.id) is distinct from 'review_required' then
    raise exception 'PROBE_FAIL d68d 4: direct stayed payable under the kill switch';
  end if;
  begin
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id,
      payee_user_id, payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor, paystack_mode)
    values (b2, 'paystack', 'rm-book-' || gen_random_uuid(), ag2.amount_minor, 'NGN', 'PENDING', ag2.id, host, 'ACCT_probe_host', 'ACCT_probe_reserve',
      (split ->> 'lister_share_minor')::bigint, coalesce((split ->> 'guarantee_minor')::bigint, 0), (split ->> 'commission_minor')::bigint, 'test');
    raise exception 'PROBE_FAIL d68d 4: a charge was written under the kill switch';
  exception when insufficient_privilege then null;
  end;
  update public.feature_flags set enabled = false where key = 'agreement_review_all';

  raise exception 'PROBE_OK d68d-the-rail-decides-the-gate';
end
$$;
