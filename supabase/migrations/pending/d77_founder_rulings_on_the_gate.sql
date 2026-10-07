-- D77: the founder's rulings on the gate, the fee record and the one Payluk switch.
-- Pending: NOT applied. Apply AFTER d68d_the_rail_decides_the_gate.sql (and so
-- after every file in its apply order). The lead reviews it, applies it through
-- the MCP, and commits it under the version the server stamps.
-- Probe: supabase/tests/probes-pending/d77-founder-rulings-on-the-gate.sql.
--
-- 1. FIRST-DEAL SIGNAL, SCOPED. It fires only on a first deal AND (the lister's
--    business is not verified OR the amount is over the threshold). A
--    CAC-verified business (businesses.verified with a cac_number) behind the
--    property is a different risk from an individual's first listing.
--    (private.agreement_risk_signals, from d68d, redefined.)
-- 2. THE DIRECT THRESHOLD IS 500,000 NAIRA (the direct rail carries nightly stays;
--    the top listing is 150,000 a night). Still configuration:
--    agreement_risk_settings.amount_threshold_minor, default changed and the row
--    moved from the old default only if nobody has edited it.
-- 3. A SALE NEVER ROUTES TO DIRECT. private.rail_for_booking and
--    private.rail_for_agreement (from d68d) answer no rail for a sale that would
--    otherwise resolve direct (fail closed, so no Paystack charge can carry a
--    sale), and a sale listing is never treated as a fixed-price stay. Live
--    policy already sends every sale to escrow (precedence 100); this makes the
--    database refuse even if a policy row changed. The app router does the same.
-- 4. THE LISTER'S FEE ACCEPTANCE IS RECORDED. public.lister_fee_policy and
--    public.lister_fee_accept, which the listing wizard has called since D61 and
--    which existed nowhere. The policy read answers the rates in force; the
--    accept re-derives every figure exactly as lib/money/lister-fee.ts does and
--    writes D61's listing_fee_acceptances (the record b3x reads for the gate and
--    the split). Refuses a stale rate ('rate_moved') or any figure that differs
--    ('mismatch').
-- 5. ONE PAYLUK SWITCH. The escrow rail is ready when the key is set and
--    `payments_payluk_on` is on, nothing else: private.rentals_protected_pay_on()
--    (d73b) now reads `payments_payluk_on`; the `rentals_protected_pay` row is
--    kept, noted as superseded, and read by nothing.
-- 6. STAFF CONTROLS for the admin risk settings screen: admin_update_risk_settings
--    and admin_set_review_kill_switch, `agreements` scope, validated and audited.
-- 7. THE GATE REACHES THE PROTECTED PAYMENT. Opening a protected payment and
--    funding it (Vallo's two steps toward Payluk) ask private.agreement_payable,
--    so the incident switch stops escrow too. Provider reports are never refused.

-- 1. -----------------------------------------------------------------------------
create or replace function private.lister_business_verified(p_agreement uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce(
    (select bz.verified and bz.cac_number is not null
       from public.deal_agreements ag
       join public.accommodations ac on ac.id = ag.accommodation_id
       join public.businesses bz on bz.id = ac.business_id
      where ag.id = p_agreement),
    (select exists (select 1 from public.businesses bz
                     where bz.agent_id = l.agent_id and bz.verified and bz.cac_number is not null)
       from public.deal_agreements ag join public.listings l on l.id = ag.listing_id
      where ag.id = p_agreement),
    false);
$$;
revoke all on function private.lister_business_verified(uuid) from public, anon, authenticated;

create or replace function private.agreement_risk_signals(p_agreement uuid)
returns text[] language plpgsql stable security definer set search_path to '' as $function$
declare
  ag public.deal_agreements%rowtype;
  s public.agreement_risk_settings%rowtype;
  out_signals text[] := '{}';
  payout_name text;
  legal_name text;
  registered_name text;
  latest_class text;
  over boolean;
begin
  select * into ag from public.deal_agreements where id = p_agreement;
  if ag.id is null then return array['not_found']; end if;
  select * into s from public.agreement_risk_settings where id = 1;
  if s.id is null then
    s.amount_threshold_minor := 50000000; s.recent_change_days := 3;
    s.check_first_deal := true; s.check_amount := true; s.check_recent_change := true;
    s.check_payout_name := true; s.check_fraud_radar := true;
  end if;
  over := ag.amount_minor > s.amount_threshold_minor;

  -- D77 ruling 1: a first deal is a signal only for an unverified business, or above the threshold.
  if s.check_first_deal
     and not exists (select 1 from public.deal_agreements x where x.owner_id = ag.owner_id and x.status = 'paid' and x.id <> ag.id)
     and (not private.lister_business_verified(ag.id) or over) then
    out_signals := out_signals || 'first_deal'::text;
  end if;

  if s.check_amount and over then
    out_signals := out_signals || 'amount_over'::text;
  end if;

  if s.check_recent_change and (
       (ag.listing_id is not null and exists (
          select 1 from public.listing_changes c
           where c.listing_id = ag.listing_id and c.changed_at > now() - make_interval(days => s.recent_change_days)))
       or (ag.accommodation_id is not null and exists (
          select 1 from public.room_types rt
            left join public.rate_plans rp on rp.room_type_id = rt.id
           where rt.accommodation_id = ag.accommodation_id
             and (rt.updated_at > now() - make_interval(days => s.recent_change_days)
                  or rp.updated_at > now() - make_interval(days => s.recent_change_days))))) then
    out_signals := out_signals || 'recent_change'::text;
  end if;

  if s.check_payout_name then
    select coalesce(pa.resolved_account_name, pa.account_name) into payout_name
      from public.payout_accounts pa join public.agents a on a.id = pa.agent_id
     where a.user_id = ag.owner_id and pa.paystack_subaccount_code is not null
     order by pa.is_default desc, pa.created_at desc limit 1;
    if payout_name is null then
      select ba.resolved_account_name into payout_name from public.bank_accounts ba
       where ba.user_id = ag.owner_id and ba.deleted_at is null and ba.paystack_subaccount_code is not null
       order by ba.is_default desc, ba.created_at desc limit 1;
    end if;
    select iv.legal_name into legal_name from public.identity_verifications iv
     where iv.subject_id = ag.owner_id and iv.outcome = 'matched'
     order by iv.decided_at desc nulls last limit 1;
    if ag.accommodation_id is not null then
      select bz.registered_name into registered_name
        from public.accommodations ac join public.businesses bz on bz.id = ac.business_id where ac.id = ag.accommodation_id;
    end if;
    if payout_name is not null and (legal_name is not null or registered_name is not null)
       and not coalesce(private.name_matches(payout_name, legal_name), false)
       and not coalesce(private.name_matches(payout_name, registered_name), false) then
      out_signals := out_signals || 'payout_name'::text;
    end if;
  end if;

  if s.check_fraud_radar then
    select rc.risk_class into latest_class from public.risk_classes rc
     where rc.user_id = ag.owner_id order by rc.set_at desc limit 1;
    if latest_class = 'high' or exists (
         select 1 from public.risk_alerts ra
          where ra.status = 'open' and ra.severity::text in ('high', 'critical')
            and ra.entity_id in (ag.owner_id::text, ag.listing_id::text, ag.accommodation_id::text,
                                 ag.booking_id::text, ag.id::text)) then
      out_signals := out_signals || 'fraud_radar'::text;
    end if;
  end if;
  return out_signals;
end;
$function$;
revoke all on function private.agreement_risk_signals(uuid) from public, anon, authenticated;

-- 2. -----------------------------------------------------------------------------
alter table public.agreement_risk_settings alter column amount_threshold_minor set default 50000000;
update public.agreement_risk_settings set amount_threshold_minor = 50000000, updated_at = now()
 where id = 1 and amount_threshold_minor = 300000000 and updated_by is null;

-- 3. -----------------------------------------------------------------------------
create or replace function private.rail_for_booking(p_booking uuid, out rail text, out policy_id uuid)
returns record
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_pt public.property_type;
  v_li public.listing_intent;
  v_lk public.agent_type;
  v_listing uuid;
  v_acc uuid;
  v_room uuid;
  v_kind text;
  v_period text;
  r record;
begin
  select b.listing_id, b.accommodation_id, b.room_type_id into v_listing, v_acc, v_room
    from public.bookings b where b.id = p_booking;
  if v_listing is not null then
    select l.property_type, l.listing_intent, a.type, l.rate_period::text
      into v_pt, v_li, v_lk, v_period
      from public.listings l left join public.agents a on a.id = l.agent_id
     where l.id = v_listing;
  end if;
  -- D73/D75: a fixed-price stay settles as a hotel room does. Never a rent
  -- charge, and (D77) never a sale.
  if not exists (select 1 from public.rent_payments rp where rp.booking_id = p_booking)
     and coalesce(current_setting('vallo.rent_charge', true), '') <> 'true'
     and v_li is distinct from 'sale' then
    if (v_listing is null and v_room is not null) or (v_listing is not null and v_period = 'night') then
      r := public.resolve_payment_rail('hotel'::public.property_type, 'rent'::public.listing_intent,
                                       'business'::public.agent_type);
      rail := r.rail; policy_id := r.policy_id;
      return;
    end if;
  end if;
  if v_listing is null and v_acc is not null then
    select bz.kind::text into v_kind
      from public.accommodations ac join public.businesses bz on bz.id = ac.business_id
     where ac.id = v_acc;
    v_pt := case v_kind when 'hotel' then 'hotel' when 'restaurant' then 'restaurant'
                        when 'serviced_apartments' then 'apartment' end::public.property_type;
    v_li := 'rent';
    v_lk := 'business';
  end if;
  if v_pt is null or v_li is null then
    rail := null; policy_id := null;
    return;
  end if;
  r := public.resolve_payment_rail(v_pt, v_li, v_lk);
  rail := r.rail;
  policy_id := r.policy_id;
  -- D77 ruling 3: a sale is never carried by the direct rail.
  if v_li = 'sale' and rail = 'direct' then
    rail := null; policy_id := null;
  end if;
end;
$function$;
revoke all on function private.rail_for_booking(uuid) from public, anon, authenticated;

create or replace function private.rail_for_agreement(p_agreement uuid)
returns text language plpgsql stable security definer set search_path to '' as $function$
declare
  ag public.deal_agreements%rowtype;
  v_pt public.property_type;
  v_li public.listing_intent;
  v_lk public.agent_type;
  v_kind text;
  v_rail text;
begin
  select * into ag from public.deal_agreements where id = p_agreement;
  if ag.id is null then return null; end if;
  if ag.booking_id is not null then
    return (private.rail_for_booking(ag.booking_id)).rail;
  end if;
  if ag.listing_id is not null then
    select l.property_type, l.listing_intent, a.type into v_pt, v_li, v_lk
      from public.listings l left join public.agents a on a.id = l.agent_id where l.id = ag.listing_id;
  elsif ag.accommodation_id is not null then
    select bz.kind::text into v_kind
      from public.accommodations ac join public.businesses bz on bz.id = ac.business_id where ac.id = ag.accommodation_id;
    v_pt := case v_kind when 'hotel' then 'hotel' when 'serviced_apartments' then 'apartment' end::public.property_type;
    v_li := 'rent'; v_lk := 'business';
  end if;
  if v_pt is null or v_li is null then return null; end if;
  v_rail := (public.resolve_payment_rail(v_pt, v_li, v_lk)).rail;
  if v_li = 'sale' and v_rail = 'direct' then return null; end if;
  return v_rail;
end;
$function$;
revoke all on function private.rail_for_agreement(uuid) from public, anon, authenticated;

-- 4. The lister's fee: the policy read and the acceptance. ----------------------
-- Paystack's own fee on a direct payment is capped at 2,000 naira and borne by
-- the lister (VALLO_PRICING.md section 2). The worst case the lister is shown.
create or replace function private.direct_processor_fee_cap_minor()
returns bigint language sql immutable set search_path to '' as $$ select 200000::bigint $$;

create or replace function public.lister_fee_policy(p_listing uuid, p_property_type text, p_listing_intent text)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
  v public.money_policy_versions%rowtype;
  pr public.fee_protection_rates%rowtype;
  r public.money_policy_commission_rates%rowtype;
  pt public.property_type;
begin
  if (select auth.uid()) is null then return null; end if;
  if p_listing is not null then
    select l.property_type into pt from public.listings l join public.agents a on a.id = l.agent_id
     where l.id = p_listing and a.user_id = (select auth.uid());
    if pt is null and not private.is_staff() then return null; end if;
    if pt is null then select l.property_type into pt from public.listings l where l.id = p_listing; end if;
  end if;
  if pt is null and p_property_type is not null then
    begin
      pt := p_property_type::public.property_type;
    exception when others then
      return null;
    end;
  end if;
  v := public.money_policy_at(now());
  pr := public.fee_protection_rate_at(now());
  if v.id is null or pr.id is null then return null; end if;
  if pt is not null then
    select * into r from public.money_policy_commission_rates where policy_version_id = v.id and property_type = pt;
  end if;
  return jsonb_build_object(
    'rate_version', v.version,
    'commission_bps', coalesce(r.commission_bps, v.commission_bps),
    'escrow_protection_bps', pr.protection_bps,
    'direct_processor_fee_cap_minor', private.direct_processor_fee_cap_minor(),
    'cap_minor', r.cap_minor);
end;
$function$;
revoke all on function public.lister_fee_policy(uuid, text, text) from public, anon;
grant execute on function public.lister_fee_policy(uuid, text, text) to authenticated;

create or replace function public.lister_fee_accept(
  p_listing uuid, p_terms_version text, p_rate_version text,
  p_vallo_bps integer, p_escrow_protection_bps integer, p_direct_processor_fee_cap_minor bigint, p_cap_minor bigint,
  p_price_minor bigint, p_vallo_minor bigint, p_escrow_protection_minor bigint, p_processor_up_to_minor bigint,
  p_receive_low_minor bigint, p_receive_high_minor bigint
) returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  me uuid := (select auth.uid());
  l public.listings%rowtype;
  v public.money_policy_versions%rowtype;
  pr public.fee_protection_rates%rowtype;
  r public.money_policy_commission_rates%rowtype;
  bps integer;
  price bigint;
  by_rate bigint;
  vallo bigint;
  esc bigint;
  proc bigint;
  esc_total bigint;
  dir_total bigint;
  recv_low bigint;
  recv_high bigint;
  tv text;
  at_ timestamptz;
begin
  if me is null then return jsonb_build_object('status', 'signed_out'); end if;
  select l2.* into l from public.listings l2 join public.agents a on a.id = l2.agent_id
   where l2.id = p_listing and a.user_id = me for update of l2;
  if l.id is null then return jsonb_build_object('status', 'not_found'); end if;
  v := public.money_policy_at(now());
  pr := public.fee_protection_rate_at(now());
  if v.id is null or pr.id is null then return jsonb_build_object('status', 'rate_moved'); end if;
  select * into r from public.money_policy_commission_rates where policy_version_id = v.id and property_type = l.property_type;
  bps := coalesce(r.commission_bps, v.commission_bps);
  -- The rates the lister was shown must be the rates in force now.
  if p_rate_version is distinct from v.version or p_vallo_bps is distinct from bps
     or p_escrow_protection_bps is distinct from pr.protection_bps
     or p_direct_processor_fee_cap_minor is distinct from private.direct_processor_fee_cap_minor()
     or p_cap_minor is distinct from r.cap_minor then
    return jsonb_build_object('status', 'rate_moved');
  end if;
  price := case when l.listing_intent = 'sale' then l.sale_price_minor else coalesce(l.rent_amount_minor, l.rate_minor) end;
  if price is null or price <= 0 or p_price_minor is distinct from price then
    return jsonb_build_object('status', 'mismatch');
  end if;
  -- lib/money/lister-fee.ts listerFeeFigures, exactly.
  by_rate := (price * bps) / 10000;
  vallo := case when r.cap_minor is not null and by_rate > r.cap_minor then r.cap_minor else by_rate end;
  esc := (price * pr.protection_bps) / 10000;
  proc := least(private.direct_processor_fee_cap_minor(), price - vallo);
  esc_total := vallo + esc;
  dir_total := vallo + proc;
  recv_low := price - greatest(esc_total, dir_total);
  recv_high := price - least(esc_total, dir_total);
  if p_vallo_minor is distinct from vallo or p_escrow_protection_minor is distinct from esc
     or p_processor_up_to_minor is distinct from proc
     or p_receive_low_minor is distinct from recv_low or p_receive_high_minor is distinct from recv_high then
    return jsonb_build_object('status', 'mismatch');
  end if;
  -- The record keeps the date form of the terms version; the shown string is kept beside it.
  tv := (regexp_match(coalesce(p_terms_version, ''), '([0-9]{4}-[0-9]{2}-[0-9]{2}(\.[0-9]+)?)'))[1];
  if tv is null or length(p_terms_version) > 120 then return jsonb_build_object('status', 'mismatch'); end if;
  insert into public.listing_fee_acceptances
    (listing_id, member_id, accepted_at, terms_version, policy_version_id, policy_version, protection_rate_id,
     property_type, commission_bps, protection_bps, cap_threshold_minor, cap_minor,
     rent_minor, fee_low_minor, fee_high_minor, receive_low_minor, receive_high_minor, figures_shown)
  values
    (l.id, me, clock_timestamp(), tv, v.id, v.version, pr.id,
     l.property_type, bps, pr.protection_bps, r.cap_threshold_minor, r.cap_minor,
     price, price - recv_high, price - recv_low, recv_low, recv_high,
     jsonb_build_object('terms_version_shown', p_terms_version, 'rate_version', p_rate_version,
                        'price_minor', price, 'vallo_minor', vallo, 'escrow_protection_minor', esc,
                        'processor_up_to_minor', proc, 'receive_low_minor', recv_low, 'receive_high_minor', recv_high,
                        'price_naira', to_char(price / 100.0, 'FM999,999,999,990.00'),
                        'receive_low_naira', to_char(recv_low / 100.0, 'FM999,999,999,990.00'),
                        'receive_high_naira', to_char(recv_high / 100.0, 'FM999,999,999,990.00')))
  returning accepted_at into at_;
  return jsonb_build_object('status', 'recorded', 'recorded_at', at_);
end;
$function$;
revoke all on function public.lister_fee_accept(uuid, text, text, integer, integer, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint)
  from public, anon;
grant execute on function public.lister_fee_accept(uuid, text, text, integer, integer, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint)
  to authenticated;

-- 5. One Payluk switch. --------------------------------------------------------
create or replace function private.rentals_protected_pay_on()
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'payments_payluk_on'), false);
$$;
revoke all on function private.rentals_protected_pay_on() from public, anon, authenticated;
-- Live has no row for the switch yet (read as off by the app); seed it off.
insert into public.feature_flags (key, enabled, note)
values ('payments_payluk_on', false,
        'The escrow rail (Payluk, Protected payment). On only once PAYLUK_TEST_SECRET_KEY (staging) or PAYLUK_SECRET_KEY (production) is set. D77.')
on conflict (key) do nothing;
update public.feature_flags
   set note = 'Superseded by payments_payluk_on (D77): the escrow rail is ready when the Payluk key is set and that switch is on. Read by nothing.'
 where key = 'rentals_protected_pay';

-- 6. Staff controls. -----------------------------------------------------------
create or replace function public.admin_update_risk_settings(
  p_amount_threshold_minor bigint, p_recent_change_days integer,
  p_check_first_deal boolean, p_check_amount boolean, p_check_recent_change boolean,
  p_check_payout_name boolean, p_check_fraud_radar boolean
) returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  actor uuid := auth.uid();
  before_row public.agreement_risk_settings%rowtype;
begin
  if not private.staff_can(actor, 'agreements') then return jsonb_build_object('status', 'forbidden'); end if;
  if p_amount_threshold_minor is null or p_amount_threshold_minor < 100 or p_amount_threshold_minor > 100000000000 then
    return jsonb_build_object('status', 'bad_threshold');
  end if;
  if p_recent_change_days is null or p_recent_change_days < 0 or p_recent_change_days > 60 then
    return jsonb_build_object('status', 'bad_days');
  end if;
  select * into before_row from public.agreement_risk_settings where id = 1 for update;
  insert into public.agreement_risk_settings (id) values (1) on conflict (id) do nothing;
  update public.agreement_risk_settings set
    amount_threshold_minor = p_amount_threshold_minor, recent_change_days = p_recent_change_days,
    check_first_deal = coalesce(p_check_first_deal, true), check_amount = coalesce(p_check_amount, true),
    check_recent_change = coalesce(p_check_recent_change, true), check_payout_name = coalesce(p_check_payout_name, true),
    check_fraud_radar = coalesce(p_check_fraud_radar, true), updated_at = now(), updated_by = actor
  where id = 1;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'agreement_risk_settings.update', 'agreement_risk_settings', '1',
          jsonb_build_object('before', to_jsonb(before_row),
                             'after', (select to_jsonb(s) from public.agreement_risk_settings s where s.id = 1)));
  return jsonb_build_object('status', 'ok');
end;
$function$;
revoke all on function public.admin_update_risk_settings(bigint, integer, boolean, boolean, boolean, boolean, boolean) from public, anon;
grant execute on function public.admin_update_risk_settings(bigint, integer, boolean, boolean, boolean, boolean, boolean) to authenticated;

create or replace function public.admin_set_review_kill_switch(p_on boolean, p_reason text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  actor uuid := auth.uid();
  reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not private.staff_can(actor, 'agreements') then return jsonb_build_object('status', 'forbidden'); end if;
  if p_on is null then return jsonb_build_object('status', 'bad_request'); end if;
  if reason is null or length(reason) < 10 then return jsonb_build_object('status', 'reason_required'); end if;
  insert into public.feature_flags (key, enabled, note)
  values ('agreement_review_all', p_on, left(reason, 500))
  on conflict (key) do update set enabled = excluded.enabled, updated_at = now();
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, case when p_on then 'agreement_review_all.on' else 'agreement_review_all.off' end,
          'feature_flag', 'agreement_review_all', jsonb_build_object('reason', reason));
  return jsonb_build_object('status', 'ok', 'enabled', p_on);
end;
$function$;
revoke all on function public.admin_set_review_kill_switch(boolean, text) from public, anon;
grant execute on function public.admin_set_review_kill_switch(boolean, text) to authenticated;

-- 7. The gate reaches the protected payment. ------------------------------------
-- d73b's provider_arrangement_open checks the agreement is an approved rental,
-- but not D68d's gate, so the incident switch did not stop a protected payment
-- from opening. Vallo's own two steps toward Payluk now ask the gate: creating
-- the arrangement, and moving it to payment_processing (the renter's funding).
-- What the provider reports afterwards (protected, released, refunded) is never
-- refused: money already taken is always recorded.
create or replace function private.provider_arrangements_payable_gate()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  why text;
begin
  if tg_op = 'UPDATE' and not (new.status = 'payment_processing' and old.status is distinct from 'payment_processing'
                               and new.status_source = 'vallo') then
    return new;
  end if;
  why := private.agreement_payable(new.agreement_id);
  if why is not null then
    raise exception 'agreement_not_payable: %', why
      using errcode = '42501', hint = 'The agreement gate (D68d) refuses this payment for now.';
  end if;
  return new;
end;
$function$;
revoke all on function private.provider_arrangements_payable_gate() from public, anon, authenticated;
drop trigger if exists provider_arrangements_00_payable_gate on public.provider_arrangements;
create trigger provider_arrangements_00_payable_gate
  before insert or update of status on public.provider_arrangements
  for each row execute function private.provider_arrangements_payable_gate();
