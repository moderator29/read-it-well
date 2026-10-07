-- D68d / B.3.5: THE RAIL DECIDES THE GATE AFTER BOTH PARTIES AGREE.
-- Pending: NOT applied. The lead reviews it, applies it through the MCP, and
-- commits it under the version the server stamps (scripts/check-migrations.mjs).
-- Probe: supabase/tests/probes-pending/d68d-the-rail-decides-the-gate.sql.
--
-- APPLY AFTER (it builds on each): b3_rate_agreement_gate.sql (the payment gate
-- below is b3's version with one rule changed), b3x_fee_record_unify.sql,
-- b2_rail_at_open.sql (rail_for_booking, redefined here for stays),
-- b6_member_money_rail.sql, d73a_stays_instant_pay.sql (book_stay_instantly,
-- redefined here), d73b_provider_arrangements.sql (provider_arrangements).
--
-- THE RULE (founder, D68d)
--   Escrow (Payluk): no review. Payment opens as soon as both parties agree;
--     the protection is structural (the provider holds the money) and Vallo
--     reviews during the hold, with the power to pause a release.
--   Direct (Paystack split): opens as soon as both agree UNLESS a risk signal
--     fires. No signal, no queue.
--   Kill switch `agreement_review_all` (off): forces review on everything.
--   Not a global "approval off" switch.
--
-- THE SIGNALS (direct rail only), each configurable in agreement_risk_settings:
--   first_deal          the lister has no paid deal on Vallo yet
--   amount_over         the amount is above the configured threshold
--   recent_change       the listing's price or availability changed (listing_changes),
--                       or the hotel's room or rate plan was edited, in the last N days
--   payout_name         the payout account's resolved name matches neither the
--                       lister's verified legal name nor their business's registered name
--   fraud_radar         the lister's latest risk class is high, or an open high or
--                       critical risk alert names the lister, listing, hotel, booking
--                       or agreement
--
-- WHAT CHANGES
--  1. agreement_risk_settings (one row) and the kill switch flag.
--  2. private.rail_for_booking (b2, REDEFINED): a fixed-price stay (a hotel room, or
--     a listing stay at a published nightly rate) resolves as a hotel room does,
--     direct (D73, D75: fixed-price shortlets take the direct rail). Without this,
--     b2 refuses every Paystack charge on a shortlet or on a room at a guest house
--     or resort. Rent charges resolve exactly as b2 does.
--  3. private.rail_for_agreement, private.agreement_risk_signals,
--     private.agreement_review_required (the resolver), private.agreement_payable.
--  4. private.transactions_payment_gate (LIVE FUNCTION CHANGED, from b3's version):
--     instead of demanding status 'approved' unconditionally it asks
--     agreement_payable: approved, and if the resolver says review is required
--     now, approved by a person. Enforced in the database, so no path bypasses it.
--  5. public.agreement_confirm_as (LIVE FUNCTION CHANGED): when both parties have
--     confirmed, the resolver decides. Not required: APPROVED by the system
--     (decided_by null, an 'approved' event, an audit_log row, the same
--     agreement.approved notices and emails). Required: in_review, as today, with
--     the signals named in the event.
--  6. provider_arrangements: opening one asks agreement_payable (a trigger), and a
--     release can be PAUSED by staff (admin_pause_release / admin_resume_release);
--     a paused arrangement refuses release_requested in the database.
--  7. private.book_stay_instantly (d73a, REDEFINED): an instant booking falls back to
--     a request when the resolver would require review, so a guest is never shown a
--     payment the gate refuses.
--  8. public.admin_agreement_watch_list(): the admin queue becomes a watch list over
--     every live deal (waiting for review, payable and unpaid, held by the provider),
--     ordered by risk.
-- NOT CHANGED: admin_decide_agreement (staff still approve or reject in_review).

-- 1. ---------------------------------------------------------------------------
insert into public.feature_flags (key, enabled, note)
values ('agreement_review_all', false,
        'D68d kill switch: forces Vallo review on every agreement and refuses payment on any agreement a person has not approved. For an incident only. Off by default.')
on conflict (key) do nothing;

create table public.agreement_risk_settings (
  id smallint primary key default 1 check (id = 1),
  -- Above this, a direct-rail deal waits for a person. 3,000,000 naira to start.
  amount_threshold_minor bigint not null default 300000000 check (amount_threshold_minor > 0),
  recent_change_days smallint not null default 3 check (recent_change_days between 0 and 60),
  check_first_deal boolean not null default true,
  check_amount boolean not null default true,
  check_recent_change boolean not null default true,
  check_payout_name boolean not null default true,
  check_fraud_radar boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
insert into public.agreement_risk_settings (id) values (1) on conflict (id) do nothing;
alter table public.agreement_risk_settings enable row level security;
create policy agreement_risk_settings_staff on public.agreement_risk_settings
  for all to authenticated
  using (private.staff_can((select auth.uid()), 'agreements'))
  with check (private.staff_can((select auth.uid()), 'agreements'));
revoke all on public.agreement_risk_settings from anon, authenticated;
grant select, update on public.agreement_risk_settings to authenticated;

-- 2. ---------------------------------------------------------------------------
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
  -- D73/D75: a fixed-price stay (a room, or a nightly rate) settles as a hotel
  -- room does. A rent charge is never a stay.
  if not exists (select 1 from public.rent_payments rp where rp.booking_id = p_booking)
     and coalesce(current_setting('vallo.rent_charge', true), '') <> 'true' then
    if v_listing is null and v_room is not null then
      r := public.resolve_payment_rail('hotel'::public.property_type, 'rent'::public.listing_intent,
                                       'business'::public.agent_type);
      rail := r.rail; policy_id := r.policy_id;
      return;
    end if;
    if v_listing is not null then
      select l.rate_period::text into v_period from public.listings l where l.id = v_listing;
      if v_period = 'night' then
        r := public.resolve_payment_rail('hotel'::public.property_type, 'rent'::public.listing_intent,
                                         'business'::public.agent_type);
        rail := r.rail; policy_id := r.policy_id;
        return;
      end if;
    end if;
  end if;
  -- Otherwise exactly b2_rail_at_open's resolution.
  if v_listing is not null then
    select l.property_type, l.listing_intent, a.type
      into v_pt, v_li, v_lk
      from public.listings l left join public.agents a on a.id = l.agent_id
     where l.id = v_listing;
  elsif v_acc is not null then
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
end;
$function$;
revoke all on function private.rail_for_booking(uuid) from public, anon, authenticated;

-- 3. The resolver. -------------------------------------------------------------
create or replace function private.rail_for_agreement(p_agreement uuid)
returns text language plpgsql stable security definer set search_path to '' as $function$
declare
  ag public.deal_agreements%rowtype;
  v_pt public.property_type;
  v_li public.listing_intent;
  v_lk public.agent_type;
  v_kind text;
begin
  select * into ag from public.deal_agreements where id = p_agreement;
  if ag.id is null then return null; end if;
  if ag.booking_id is not null then
    return (private.rail_for_booking(ag.booking_id)).rail;
  end if;
  -- A rent agreement before its charge exists: the listing decides.
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
  return (public.resolve_payment_rail(v_pt, v_li, v_lk)).rail;
end;
$function$;
revoke all on function private.rail_for_agreement(uuid) from public, anon, authenticated;

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
begin
  select * into ag from public.deal_agreements where id = p_agreement;
  if ag.id is null then return array['not_found']; end if;
  select * into s from public.agreement_risk_settings where id = 1;
  if s.id is null then
    -- No settings row: every signal on, at the defaults (fail towards review).
    s.amount_threshold_minor := 300000000; s.recent_change_days := 3;
    s.check_first_deal := true; s.check_amount := true; s.check_recent_change := true;
    s.check_payout_name := true; s.check_fraud_radar := true;
  end if;

  if s.check_first_deal and not exists (
       select 1 from public.deal_agreements x where x.owner_id = ag.owner_id and x.status = 'paid' and x.id <> ag.id) then
    out_signals := out_signals || 'first_deal'::text;
  end if;

  if s.check_amount and ag.amount_minor > s.amount_threshold_minor then
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
    -- A mismatch needs both a payout name and a verified name to compare.
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

-- { required, rail, reasons }. Escrow: never required. Direct: required when a
-- signal fires. No rail: required (fail closed). Kill switch: always required.
create or replace function private.agreement_review_required(p_agreement uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
  v_rail text := private.rail_for_agreement(p_agreement);
  sig text[];
begin
  if coalesce((select f.enabled from public.feature_flags f where f.key = 'agreement_review_all'), false) then
    return jsonb_build_object('required', true, 'rail', v_rail, 'reasons', jsonb_build_array('kill_switch'));
  end if;
  if v_rail is null then
    return jsonb_build_object('required', true, 'rail', null, 'reasons', jsonb_build_array('no_rail'));
  end if;
  if v_rail = 'escrow' then
    return jsonb_build_object('required', false, 'rail', v_rail, 'reasons', '[]'::jsonb);
  end if;
  sig := private.agreement_risk_signals(p_agreement);
  return jsonb_build_object('required', coalesce(array_length(sig, 1), 0) > 0, 'rail', v_rail, 'reasons', to_jsonb(sig));
end;
$function$;
revoke all on function private.agreement_review_required(uuid) from public, anon, authenticated;

-- Null when payment may open on this agreement now; otherwise the reason.
create or replace function private.agreement_payable(p_agreement uuid)
returns text language plpgsql stable security definer set search_path to '' as $function$
declare
  ag public.deal_agreements%rowtype;
  rv jsonb;
begin
  select * into ag from public.deal_agreements where id = p_agreement;
  if ag.id is null then return 'not_found'; end if;
  if ag.status <> 'approved' then return 'not_approved'; end if;
  -- A person's approval stands whatever the signals say now.
  if ag.decided_by is not null then return null; end if;
  rv := private.agreement_review_required(p_agreement);
  if (rv ->> 'required')::boolean then return 'review_required'; end if;
  return null;
end;
$function$;
revoke all on function private.agreement_payable(uuid) from public, anon, authenticated;

-- The same answer for the app, so a member is told why in a sentence before the
-- gate refuses in a code. A party to the agreement, staff, or the service role.
create or replace function public.agreement_payable_for(p_agreement uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
  ag public.deal_agreements%rowtype;
  me uuid := auth.uid();
  role_name text := coalesce(current_setting('role', true), 'none');
begin
  select * into ag from public.deal_agreements where id = p_agreement;
  if ag.id is null or not (role_name = 'service_role' or me in (ag.renter_id, ag.owner_id)
                           or private.staff_can(me, 'agreements')) then
    return jsonb_build_object('status', 'not_found');
  end if;
  return jsonb_build_object('status', coalesce(private.agreement_payable(p_agreement), 'payable'),
                            'rail', private.rail_for_agreement(p_agreement));
end;
$function$;
revoke all on function public.agreement_payable_for(uuid) from public, anon;
grant execute on function public.agreement_payable_for(uuid) to authenticated, service_role;

-- 4. The payment gate: b3's version, asking the resolver. ----------------------
create or replace function private.transactions_payment_gate()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  rp public.rent_payments%rowtype;
  owed bigint;
  why text;
begin
  if coalesce(current_setting('vallo.recording_unknown_charge', true), '') = 'on' then
    return new;
  end if;
  if new.status <> 'PENDING' then
    raise exception 'payment_gate: a charge opens as PENDING' using errcode = '42501';
  end if;
  if new.lister_share_minor is null or new.payee_subaccount_code is null or new.agreement_id is null
     or (coalesce(new.guarantee_minor, 0) > 0 and new.reserve_subaccount_code is null) then
    raise exception 'payment_gate: a charge needs its split and its agreement' using errcode = '42501';
  end if;
  -- D68d: the rail and the risk signals decide, through agreement_payable.
  why := private.agreement_payable(new.agreement_id);
  if why is not null then
    raise exception 'payment_gate: payment is not available on this agreement (%)', why using errcode = '42501';
  end if;
  if new.share_payer_id is null then
    if not exists (select 1 from public.deal_agreements a
                    where a.id = new.agreement_id and a.booking_id = new.booking_id
                      and a.amount_minor = new.amount_minor) then
      raise exception 'payment_gate: the charge must be this agreement''s, at its amount' using errcode = '42501';
    end if;
    return new;
  end if;
  -- V-86: a flatmate's share, or the lead's remainder, of one rent charge.
  if not exists (select 1 from public.deal_agreements a
                  where a.id = new.agreement_id and a.booking_id = new.booking_id) then
    raise exception 'payment_gate: the charge must be this agreement''s' using errcode = '42501';
  end if;
  select * into rp from public.rent_payments where booking_id = new.booking_id;
  owed := private.rent_share_owed(rp.id, new.share_payer_id);
  if rp.id is null or owed is null or owed <= 0 or owed <> new.amount_minor then
    raise exception 'payment_gate: a share must be exactly what this person owes on the move-in' using errcode = '42501';
  end if;
  if exists (select 1 from public.transactions t
              where t.booking_id = new.booking_id and t.status = 'SUCCESSFUL'
                and (t.share_payer_id is null or t.share_payer_id = new.share_payer_id)) then
    raise exception 'payment_gate: this share is already paid' using errcode = '42501';
  end if;
  return new;
end;
$function$;

-- 5. Both parties agree: the rail decides. Copied from the live definition; the
-- step after both confirmations is the change. -----------------------------------
create or replace function public.agreement_confirm_as(p_actor uuid, p_agreement uuid, p_version integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  ag public.deal_agreements%rowtype;
  mandate uuid;
  has_mandates boolean;
  before_status public.agreement_status;
  rv jsonb;
  why text;
begin
  select * into ag from public.deal_agreements where id = p_agreement for update;
  if ag.id is null or p_actor not in (ag.renter_id, ag.owner_id) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if ag.status <> 'awaiting_parties' then
    return jsonb_build_object('status', 'locked', 'agreement_status', ag.status);
  end if;
  if p_version is distinct from ag.terms_version then
    return jsonb_build_object('status', 'terms_changed', 'terms_version', ag.terms_version);
  end if;
  if p_actor = ag.renter_id then
    update public.deal_agreements
       set renter_confirmed_version = ag.terms_version, renter_confirmed_at = now(), updated_at = now()
     where id = ag.id returning * into ag;
  else
    select exists (select 1 from public.listing_mandates m where m.listing_id = ag.listing_id) into has_mandates;
    if has_mandates then
      select m.id into mandate from public.listing_mandates m
       where m.listing_id = ag.listing_id
         and m.review_status = 'approved'
         and (m.expires_on is null or m.expires_on >= (now() at time zone 'Africa/Lagos')::date)
         and m.principal_consent_withdrawn_at is null
       order by m.reviewed_at desc nulls last limit 1;
      if mandate is null then
        return jsonb_build_object('status', 'mandate_not_live');
      end if;
    end if;
    update public.deal_agreements
       set owner_confirmed_version = ag.terms_version, owner_confirmed_at = now(),
           mandate_id = mandate, updated_at = now()
     where id = ag.id returning * into ag;
  end if;
  perform private.agreement_log(ag, p_actor, 'confirmed', ag.status, null);
  if ag.renter_confirmed_version = ag.terms_version and ag.owner_confirmed_version = ag.terms_version then
    before_status := ag.status;
    rv := private.agreement_review_required(ag.id);
    if not (rv ->> 'required')::boolean then
      -- D68d: no review needed on this rail with no signal. Approved by the system.
      why := format('No review needed: %s rail, no risk signal.', rv ->> 'rail');
      update public.deal_agreements
         set status = 'approved', submitted_at = now(), decided_at = now(), decided_by = null,
             decision_reason = why, updated_at = now()
       where id = ag.id returning * into ag;
      perform private.agreement_log(ag, null, 'approved', before_status, why);
      insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
      values (null, 'agreement.approve', 'deal_agreement', ag.id::text,
              jsonb_build_object('reason', why, 'decided_by', 'system', 'rail', rv ->> 'rail',
                                 'terms_version', ag.terms_version, 'amount_minor', ag.amount_minor, 'kind', ag.kind));
      perform private.agreement_tell_both(ag, 'agreement.approved');
    else
      update public.deal_agreements set status = 'in_review', submitted_at = now(), updated_at = now()
       where id = ag.id returning * into ag;
      perform private.agreement_log(ag, null, 'submitted', before_status,
        'Both parties confirmed. Waiting for Vallo review: ' ||
        coalesce((select string_agg(x, ', ') from jsonb_array_elements_text(rv -> 'reasons') x), 'review') || '.');
    end if;
  end if;
  return jsonb_build_object('status', 'ok', 'agreement_status', ag.status,
                            'review', case when ag.status = 'in_review' then rv -> 'reasons' else '[]'::jsonb end);
end;
$function$;

-- 6. The provider-held path. -----------------------------------------------------
alter table public.provider_arrangements
  add column release_paused_at timestamptz,
  add column release_paused_by uuid references auth.users (id) on delete set null,
  add column release_pause_reason text check (release_pause_reason is null or length(release_pause_reason) between 10 and 1000);

create or replace function private.provider_arrangements_payable()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  why text := private.agreement_payable(new.agreement_id);
begin
  if why is not null then
    raise exception 'agreement_not_payable: % ', why using errcode = '42501';
  end if;
  return new;
end;
$function$;
revoke all on function private.provider_arrangements_payable() from public, anon, authenticated;
create trigger provider_arrangements_00_payable
  before insert on public.provider_arrangements
  for each row execute function private.provider_arrangements_payable();

create or replace function private.provider_arrangements_release_not_paused()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.status = 'release_requested' and old.status is distinct from 'release_requested'
     and new.release_paused_at is not null then
    raise exception 'release_paused: Vallo has paused the release of this payment' using errcode = '42501';
  end if;
  return new;
end;
$function$;
revoke all on function private.provider_arrangements_release_not_paused() from public, anon, authenticated;
create trigger provider_arrangements_01_release_not_paused
  before update of status on public.provider_arrangements
  for each row execute function private.provider_arrangements_release_not_paused();

create or replace function public.admin_pause_release(p_arrangement uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  actor uuid := auth.uid();
  a public.provider_arrangements%rowtype;
  reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not private.staff_can(actor, 'agreements') then return jsonb_build_object('status', 'forbidden'); end if;
  if reason is null or length(reason) < 10 then return jsonb_build_object('status', 'reason_required'); end if;
  select * into a from public.provider_arrangements where id = p_arrangement for update;
  if a.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if a.status in ('released', 'refunded', 'split', 'failed', 'cancelled') then
    return jsonb_build_object('status', 'final', 'arrangement_status', a.status);
  end if;
  update public.provider_arrangements
     set release_paused_at = now(), release_paused_by = actor, release_pause_reason = left(reason, 1000)
   where id = a.id;
  insert into public.provider_arrangement_events (arrangement_id, from_status, to_status, source, detail)
  values (a.id, a.status, a.status, 'vallo', jsonb_build_object('release_paused', true, 'by', actor, 'reason', reason));
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'arrangement.release_paused', 'provider_arrangement', a.id::text, jsonb_build_object('reason', reason));
  return jsonb_build_object('status', 'ok');
end;
$function$;
revoke all on function public.admin_pause_release(uuid, text) from public, anon;
grant execute on function public.admin_pause_release(uuid, text) to authenticated;

create or replace function public.admin_resume_release(p_arrangement uuid)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  actor uuid := auth.uid();
  a public.provider_arrangements%rowtype;
begin
  if not private.staff_can(actor, 'agreements') then return jsonb_build_object('status', 'forbidden'); end if;
  select * into a from public.provider_arrangements where id = p_arrangement for update;
  if a.id is null then return jsonb_build_object('status', 'not_found'); end if;
  update public.provider_arrangements
     set release_paused_at = null, release_paused_by = null, release_pause_reason = null
   where id = a.id;
  insert into public.provider_arrangement_events (arrangement_id, from_status, to_status, source, detail)
  values (a.id, a.status, a.status, 'vallo', jsonb_build_object('release_paused', false, 'by', actor));
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'arrangement.release_resumed', 'provider_arrangement', a.id::text, '{}'::jsonb);
  return jsonb_build_object('status', 'ok');
end;
$function$;
revoke all on function public.admin_resume_release(uuid) from public, anon;
grant execute on function public.admin_resume_release(uuid) to authenticated;

-- 7. Instant bookings ask the resolver (d73a's function, one check added). -------
create or replace function private.book_stay_instantly()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  api_role     text := coalesce(current_setting('role', true), 'none');
  lst          record;
  host         uuid;
  has_mandates boolean := false;
  mandate      uuid;
  ag           public.deal_agreements%rowtype;
  split        jsonb;
begin
  if tg_op <> 'INSERT' or new.status <> 'PENDING' then
    return new;
  end if;
  if not private.stays_instant_pay_on() then
    return new;
  end if;
  if api_role <> 'authenticated' or auth.uid() is distinct from new.guest_id then
    return new;
  end if;
  if coalesce(current_setting('vallo.rent_charge', true), '') = 'true'
     or exists (select 1 from public.rent_payments rp where rp.booking_id = new.id) then
    return new;
  end if;
  if new.listing_id is null then
    if new.room_type_id is null or new.rate_plan_id is null or new.accommodation_id is null then
      return new;
    end if;
  else
    select l.id, l.rate_period, l.rate_minor into lst from public.listings l where l.id = new.listing_id;
    if lst.id is null or lst.rate_period is distinct from 'night'
       or new.price_per_night_minor is distinct from lst.rate_minor then
      return new;
    end if;
  end if;
  if exists (select 1 from public.deal_agreements a where a.booking_id = new.id) then
    return new;
  end if;
  host := private.booking_host(new.id);
  if host is null or host = new.guest_id then
    return new;
  end if;
  if new.listing_id is not null then
    select exists (select 1 from public.listing_mandates m where m.listing_id = new.listing_id) into has_mandates;
    if has_mandates then
      select m.id into mandate from public.listing_mandates m
       where m.listing_id = new.listing_id
         and m.review_status = 'approved'
         and (m.expires_on is null or m.expires_on >= (now() at time zone 'Africa/Lagos')::date)
         and m.principal_consent_withdrawn_at is null
       order by m.reviewed_at desc nulls last limit 1;
      if mandate is null then
        return new;
      end if;
    end if;
  end if;

  begin
    perform set_config('vallo.instant_booking', new.id::text, true);

    insert into public.deal_agreements (
      kind, listing_id, accommodation_id, booking_id, renter_id, owner_id, amount_minor, terms,
      renter_confirmed_version, renter_confirmed_at, owner_confirmed_version, owner_confirmed_at, mandate_id,
      status, submitted_at, decided_at, decided_by, decision_reason)
    values (
      'stay', new.listing_id, new.accommodation_id, new.id, new.guest_id, host, new.total_minor,
      jsonb_build_object('check_in', new.check_in, 'check_out', new.check_out, 'nights', new.nights,
                         'adults', new.adults, 'children', new.children,
                         'price_per_night_minor', new.price_per_night_minor,
                         'cleaning_fee_minor', new.cleaning_fee_minor,
                         'service_fee_minor', new.service_fee_minor,
                         'total_minor', new.total_minor,
                         'guarantee_bps', (select m.guarantee_bps from public.money_policy m),
                         'commission_bps', private.current_fee_bps('commission'),
                         'inspection_fee_minor', 0, 'room_type_id', new.room_type_id,
                         'rate_plan_id', new.rate_plan_id, 'rooms', new.rooms,
                         'instant_booking', true, 'priced_by', 'database'),
      1, now(), 1, now(), mandate,
      'approved', now(), now(), null, 'Fixed price, instant booking.')
    returning * into ag;

    -- D68d: if this deal needs a person (a risk signal on the direct rail, or the
    -- kill switch), it is not instant: the guest's booking stays a request.
    if private.agreement_payable(ag.id) is not null then
      raise exception 'stays_instant_not_ready' using detail = 'review_required';
    end if;

    perform private.agreement_log(ag, null, 'opened', null,
      'Drawn up at the published price when the guest booked (instant booking).');
    perform private.agreement_log(ag, null, 'approved', null,
      'Fixed price, instant booking: approved by the system, not by a person.');
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (null, 'agreement.approve', 'deal_agreement', ag.id::text,
            jsonb_build_object('reason', 'fixed price, instant booking', 'decided_by', 'system',
                               'instant_booking', true, 'booking_id', new.id,
                               'terms_version', ag.terms_version, 'amount_minor', ag.amount_minor,
                               'kind', ag.kind));

    split := public.payment_split_for_booking(new.id);
    if coalesce(split ->> 'status', '') <> 'ok' then
      raise exception 'stays_instant_not_ready' using detail = coalesce(split ->> 'status', 'no answer');
    end if;

    update public.bookings set status = 'CONFIRMED' where id = new.id and status = 'PENDING';
    insert into public.booking_state_events (booking_id, from_status, to_status, actor_id, note)
    values (new.id, 'PENDING', 'CONFIRMED', null,
            'Instant booking at the published price: accepted when it was made.');
  exception
    when others then
      if sqlerrm <> 'stays_instant_not_ready' then
        begin
          insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
          values ('medium', 'open', 'An instant booking fell back to a request',
                  format('Booking %s could not be booked instantly and waits for the host instead: %s (%s)',
                         new.id, sqlerrm, sqlstate),
                  'booking', new.id::text);
        exception when others then
          null;
        end;
      end if;
      return new;
  end;
  return new;
end;
$function$;
revoke all on function private.book_stay_instantly() from public, anon, authenticated;

-- 8. The watch list. -----------------------------------------------------------
-- Every live deal staff should see, riskiest first: waiting for a decision,
-- payable but unpaid, and money held by the provider. Staff with the
-- `agreements` scope only.
create or replace function public.admin_agreement_watch_list(p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
  actor uuid := auth.uid();
  out_rows jsonb;
begin
  if not private.staff_can(actor, 'agreements') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select coalesce(jsonb_agg(row_to_json(w)::jsonb order by w.needs_decision desc, w.risk_score desc, w.since asc), '[]'::jsonb)
    into out_rows
    from (
      select ag.id as agreement_id, ag.kind, ag.status::text as agreement_status, ag.amount_minor,
             ag.listing_id, ag.accommodation_id, ag.renter_id, ag.owner_id,
             coalesce(ag.submitted_at, ag.created_at) as since,
             (ag.status = 'in_review') as needs_decision,
             rv -> 'reasons' as reasons, rv ->> 'rail' as rail,
             coalesce(jsonb_array_length(rv -> 'reasons'), 0) as risk_score,
             pa.id as arrangement_id, pa.status as held_status, pa.release_paused_at
        from public.deal_agreements ag
        left join public.provider_arrangements pa
          on pa.agreement_id = ag.id and pa.status not in ('failed', 'cancelled')
        cross join lateral (
          select jsonb_build_object('rail', private.rail_for_agreement(ag.id),
                                    'reasons', to_jsonb(private.agreement_risk_signals(ag.id))) as rv
        ) r
       where ag.status = 'in_review'
          or (ag.status = 'approved')
          or (pa.status in ('awaiting_payment', 'payment_processing', 'protected', 'release_requested', 'disputed'))
       order by (ag.status = 'in_review') desc, coalesce(jsonb_array_length(rv -> 'reasons'), 0) desc,
                coalesce(ag.submitted_at, ag.created_at) asc
       limit greatest(1, least(coalesce(p_limit, 100), 500))
    ) w;
  return jsonb_build_object('status', 'ok', 'rows', out_rows);
end;
$function$;
revoke all on function public.admin_agreement_watch_list(integer) from public, anon;
grant execute on function public.admin_agreement_watch_list(integer) to authenticated;
