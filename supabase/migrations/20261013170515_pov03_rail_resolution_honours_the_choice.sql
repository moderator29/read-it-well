-- Applied 13 October 2026. PAY ON VALLO 3 of 8. Needs pov01 and pov02.
-- The database decides the rail from the policy AND the payer's choice
-- (founder rulings, 13 October 2026):
--
--   rent or shortlet listing   escrow unless the payer chose card
--   nightly shortlet listing   the same (it no longer takes the hotel row)
--   sale                       escrow only, whatever is stored (D77 kept: a
--                              direct answer for a sale is no rail)
--   a room or stay at a        card only, no choice (the hotel row): the
--   hotel, guest house,        business kinds hotel, guest_house, resort and
--   resort or serviced         serviced_apartments
--   apartments business
--   a room or stay at a        escrow by default with the card choice (the
--   shortlet operator          shortlet row), no hotel-room fee
--   restaurant                 card only (its own row; bill payment stays off)
--   an agency business         no rail
--
-- New: private.rail_business_scope, private.rail_policy_lets_payer_choose,
-- private.rail_base_for_booking, private.rail_base_for_agreement,
-- private.rail_options_for_agreement.
-- Replaced (live definitions saved in pending/rollback/rb03, same
-- signatures): private.rail_for_booking, private.rail_for_agreement. Their
-- callers (transactions_rail_at_open, agreement_review_required and through
-- it agreement_payable, the payment gate and the protected-payment gate,
-- agreement_payable_for) are unchanged and now see the payer's choice, so the
-- gate works the same on both rails: escrow needs no review, card (direct) is
-- reviewed when a risk signal fires. pov04 keeps that from becoming a dead
-- end when the payer moves a system-approved stay to card.
-- Probe: supabase/tests/probes-pending/pov03-rail-resolution-honours-the-choice.sql
set lock_timeout = '5s';

/* A business kind onto the policy row its bookings take. Null: no rail. */
create or replace function private.rail_business_scope(p_kind text)
 returns text
 language sql
 immutable
 set search_path to ''
as $fn$
  select case
    when p_kind in ('hotel', 'guest_house', 'resort', 'serviced_apartments') then 'hotel'
    when p_kind = 'shortlet_operator' then 'shortlet'
    when p_kind = 'restaurant' then 'restaurant'
  end;
$fn$;

create or replace function private.rail_policy_lets_payer_choose(p_policy uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $fn$
  select coalesce((select p.payer_may_choose from public.payment_rail_policy p where p.id = p_policy), false);
$fn$;

/* The rail of a business's accommodation, before any choice. */
create or replace function private.rail_base_for_accommodation(
  p_accommodation uuid, out rail text, out policy_id uuid, out may_choose boolean)
 returns record
 language plpgsql
 stable security definer
 set search_path to ''
as $fn$
declare
  v_scope text;
  r record;
begin
  may_choose := false;
  select private.rail_business_scope(bz.kind::text) into v_scope
    from public.accommodations ac join public.businesses bz on bz.id = ac.business_id
   where ac.id = p_accommodation;
  if v_scope is null then
    return;
  end if;
  r := public.resolve_payment_rail(v_scope::public.property_type, 'rent'::public.listing_intent,
                                   'business'::public.agent_type);
  rail := r.rail;
  policy_id := r.policy_id;
  -- Only the shortlet operator's rooms carry the payer's choice; a hotel's
  -- and a restaurant's rows never do (pov01's check keeps them that way).
  may_choose := r.rail is not null and v_scope = 'shortlet' and private.rail_policy_lets_payer_choose(r.policy_id);
end;
$fn$;

/* The rail of a listing, before any choice. */
create or replace function private.rail_base_for_listing(
  p_listing uuid, out rail text, out policy_id uuid, out may_choose boolean, out is_sale boolean)
 returns record
 language plpgsql
 stable security definer
 set search_path to ''
as $fn$
declare
  v_pt public.property_type;
  v_li public.listing_intent;
  v_lk public.agent_type;
  r record;
begin
  may_choose := false;
  is_sale := false;
  select l.property_type, l.listing_intent, a.type into v_pt, v_li, v_lk
    from public.listings l left join public.agents a on a.id = l.agent_id
   where l.id = p_listing;
  if v_pt is null or v_li is null then
    return;
  end if;
  r := public.resolve_payment_rail(v_pt, v_li, v_lk);
  if v_li = 'sale' then
    -- D77 and ruling 2: a sale is escrow, and nothing else.
    is_sale := true;
    if r.rail = 'escrow' then
      rail := 'escrow'; policy_id := r.policy_id;
    end if;
    return;
  end if;
  rail := r.rail;
  policy_id := r.policy_id;
  may_choose := r.rail is not null and private.rail_policy_lets_payer_choose(r.policy_id);
end;
$fn$;

/* The rail before the payer's choice: the policy's answer, whether the payer
   may choose, and whether this is a sale. */
create or replace function private.rail_base_for_booking(
  p_booking uuid, out rail text, out policy_id uuid, out may_choose boolean, out is_sale boolean)
 returns record
 language plpgsql
 stable security definer
 set search_path to ''
as $fn$
declare
  v_listing uuid;
  v_acc uuid;
  r record;
begin
  may_choose := false;
  is_sale := false;
  select b.listing_id, b.accommodation_id into v_listing, v_acc
    from public.bookings b where b.id = p_booking;
  if v_listing is not null then
    r := private.rail_base_for_listing(v_listing);
    rail := r.rail; policy_id := r.policy_id; may_choose := r.may_choose; is_sale := r.is_sale;
    return;
  end if;
  if v_acc is not null then
    r := private.rail_base_for_accommodation(v_acc);
    rail := r.rail; policy_id := r.policy_id; may_choose := r.may_choose;
  end if;
end;
$fn$;

create or replace function private.rail_base_for_agreement(
  p_agreement uuid, out rail text, out policy_id uuid, out may_choose boolean, out is_sale boolean)
 returns record
 language plpgsql
 stable security definer
 set search_path to ''
as $fn$
declare
  ag public.deal_agreements%rowtype;
  r record;
begin
  may_choose := false;
  is_sale := false;
  select * into ag from public.deal_agreements where id = p_agreement;
  if ag.id is null then
    return;
  end if;
  if ag.booking_id is not null then
    r := private.rail_base_for_booking(ag.booking_id);
    rail := r.rail; policy_id := r.policy_id; may_choose := r.may_choose; is_sale := r.is_sale;
    return;
  end if;
  if ag.listing_id is not null then
    r := private.rail_base_for_listing(ag.listing_id);
    rail := r.rail; policy_id := r.policy_id; may_choose := r.may_choose; is_sale := r.is_sale;
    return;
  end if;
  if ag.accommodation_id is not null then
    r := private.rail_base_for_accommodation(ag.accommodation_id);
    rail := r.rail; policy_id := r.policy_id; may_choose := r.may_choose;
  end if;
end;
$fn$;

/* The live rail for a booking: the base, with the payer's choice applied
   where the policy allows one. Same signature as the live function. */
create or replace function private.rail_for_booking(p_booking uuid, out rail text, out policy_id uuid)
 returns record
 language plpgsql
 stable security definer
 set search_path to ''
as $fn$
declare
  b record;
  v_choice text;
begin
  b := private.rail_base_for_booking(p_booking);
  rail := b.rail;
  policy_id := b.policy_id;
  if b.may_choose and not b.is_sale then
    select a.payer_rail_choice into v_choice
      from public.deal_agreements a
     where a.booking_id = p_booking and a.status <> 'cancelled'
     order by a.created_at desc
     limit 1;
    rail := case when v_choice = 'card' then 'direct' else 'escrow' end;
  end if;
end;
$fn$;

create or replace function private.rail_for_agreement(p_agreement uuid)
 returns text
 language plpgsql
 stable security definer
 set search_path to ''
as $fn$
declare
  b record;
  v_choice text;
begin
  b := private.rail_base_for_agreement(p_agreement);
  if b.rail is null then
    return null;
  end if;
  if not b.may_choose or b.is_sale then
    return b.rail;
  end if;
  select a.payer_rail_choice into v_choice from public.deal_agreements a where a.id = p_agreement;
  return case when v_choice = 'card' then 'direct' else 'escrow' end;
end;
$fn$;

/* What the payer may pick from, in the members' words: '{escrow,card}',
   '{escrow}' (a sale, or an escrow row with no choice), '{card}' (a hotel
   room, a restaurant), or '{}' when no rail resolves. */
create or replace function private.rail_options_for_agreement(p_agreement uuid)
 returns text[]
 language plpgsql
 stable security definer
 set search_path to ''
as $fn$
declare
  b record;
begin
  b := private.rail_base_for_agreement(p_agreement);
  if b.rail is null then
    return '{}'::text[];
  end if;
  if b.may_choose and not b.is_sale then
    return array['escrow', 'card'];
  end if;
  if b.rail = 'escrow' then
    return array['escrow'];
  end if;
  return array['card'];
end;
$fn$;

/* The gate, with one change (live definition saved in pending/rollback/rb03).
   D73 approves an instant stay at the published price by the system, and
   ruling 2 lets its payer move it to card afterwards. The direct rail's risk
   signals were read when nothing was on card, and a system-approved
   agreement cannot be put in front of a person without pov04, so for such a
   stay only the fraud radar (and the incident switch, above it) still asks a
   person; every other signal is about a negotiated price, and this price was
   set by the database. Every other agreement is gated exactly as before. */
create or replace function private.agreement_review_required(p_agreement uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $fn$
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
  if exists (select 1 from public.deal_agreements a
              where a.id = p_agreement and a.decided_by is null and a.payer_rail_choice = 'card'
                and a.terms -> 'instant_booking' = 'true'::jsonb and a.terms ->> 'priced_by' = 'database') then
    sig := array(select s from unnest(sig) as s where s = 'fraud_radar');
  end if;
  return jsonb_build_object('required', coalesce(array_length(sig, 1), 0) > 0, 'rail', v_rail, 'reasons', to_jsonb(sig));
end;
$fn$;

revoke all on function private.rail_business_scope(text) from public, anon, authenticated;
revoke all on function private.rail_policy_lets_payer_choose(uuid) from public, anon, authenticated;
revoke all on function private.rail_base_for_accommodation(uuid) from public, anon, authenticated;
revoke all on function private.rail_base_for_listing(uuid) from public, anon, authenticated;
revoke all on function private.rail_base_for_booking(uuid) from public, anon, authenticated;
revoke all on function private.rail_base_for_agreement(uuid) from public, anon, authenticated;
revoke all on function private.rail_options_for_agreement(uuid) from public, anon, authenticated;
revoke all on function private.rail_for_booking(uuid) from public, anon, authenticated;
revoke all on function private.rail_for_agreement(uuid) from public, anon, authenticated;
revoke all on function private.agreement_review_required(uuid) from public, anon, authenticated;
