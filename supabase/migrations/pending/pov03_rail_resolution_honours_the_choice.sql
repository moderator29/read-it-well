-- DRAFT, not applied. PAY ON VALLO 3 of 8. Needs pov01 and pov02.
-- The database decides the rail from the policy AND the payer's choice:
--
--   rent or shortlet (a listing, intent rent, a policy row with
--     payer_may_choose)        escrow unless the payer chose card
--   a nightly listing         the same (ruling 4: it no longer takes the
--                             hotel row; it is a shortlet, so it gets the
--                             payer's choice with escrow by default)
--   sale                      escrow only, whatever the choice (D77 kept:
--                             a direct answer for a sale is no rail)
--   hotel room                card only (ruling 3): a room booking, or any
--                             booking at a business's accommodation, takes
--                             the hotel row; a restaurant keeps its own row
--
-- New: private.rail_policy_lets_payer_choose, private.rail_base_for_booking,
-- private.rail_base_for_agreement, private.rail_options_for_agreement.
-- Replaced (copied from the live definitions of 13 October 2026, same
-- signatures): private.rail_for_booking, private.rail_for_agreement. Their
-- callers (transactions_rail_at_open, agreement_review_required and through
-- it agreement_payable, the payment gate and the protected-payment gate,
-- agreement_payable_for) are unchanged and now see the payer's choice, so the
-- gate works the same on both rails: escrow needs no review, card (direct)
-- is reviewed when a risk signal fires.
--
-- A serviced-apartments business's booking without a room type used to map
-- to the apartment row (direct). That row now offers a choice, so it maps to
-- the hotel row instead (still direct, never a choice): a business's
-- accommodation is paid like a hotel room.
-- Probe: supabase/tests/probes-pending/pov03-rail-resolution-honours-the-choice.sql
set lock_timeout = '5s';

create or replace function private.rail_policy_lets_payer_choose(p_policy uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $fn$
  select coalesce((select p.payer_may_choose from public.payment_rail_policy p where p.id = p_policy), false);
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
  v_pt public.property_type;
  v_li public.listing_intent;
  v_lk public.agent_type;
  v_listing uuid;
  v_acc uuid;
  v_room uuid;
  v_kind text;
  r record;
begin
  may_choose := false;
  is_sale := false;
  select b.listing_id, b.accommodation_id, b.room_type_id into v_listing, v_acc, v_room
    from public.bookings b where b.id = p_booking;

  if v_listing is not null then
    select l.property_type, l.listing_intent, a.type into v_pt, v_li, v_lk
      from public.listings l left join public.agents a on a.id = l.agent_id
     where l.id = v_listing;
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
    return;
  end if;

  if v_acc is null then
    return;
  end if;
  -- Ruling 3: a hotel room is paid by card at the shown price, no choice.
  if v_room is null then
    select bz.kind::text into v_kind
      from public.accommodations ac join public.businesses bz on bz.id = ac.business_id
     where ac.id = v_acc;
    if v_kind = 'restaurant' then
      r := public.resolve_payment_rail('restaurant'::public.property_type, 'rent'::public.listing_intent,
                                       'business'::public.agent_type);
      rail := r.rail; policy_id := r.policy_id;
      return;
    end if;
    if v_kind is distinct from 'hotel' and v_kind is distinct from 'serviced_apartments' then
      return;
    end if;
  end if;
  r := public.resolve_payment_rail('hotel'::public.property_type, 'rent'::public.listing_intent,
                                   'business'::public.agent_type);
  rail := r.rail; policy_id := r.policy_id;
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
  v_pt public.property_type;
  v_li public.listing_intent;
  v_lk public.agent_type;
  b record;
  r record;
begin
  may_choose := false;
  is_sale := false;
  select * into ag from public.deal_agreements where id = p_agreement;
  if ag.id is null then
    return;
  end if;
  if ag.booking_id is not null then
    b := private.rail_base_for_booking(ag.booking_id);
    rail := b.rail; policy_id := b.policy_id; may_choose := b.may_choose; is_sale := b.is_sale;
    return;
  end if;
  if ag.listing_id is not null then
    select l.property_type, l.listing_intent, a.type into v_pt, v_li, v_lk
      from public.listings l left join public.agents a on a.id = l.agent_id where l.id = ag.listing_id;
    if v_pt is null or v_li is null then
      return;
    end if;
    r := public.resolve_payment_rail(v_pt, v_li, v_lk);
    if v_li = 'sale' then
      is_sale := true;
      if r.rail = 'escrow' then
        rail := 'escrow'; policy_id := r.policy_id;
      end if;
      return;
    end if;
    rail := r.rail;
    policy_id := r.policy_id;
    may_choose := r.rail is not null and private.rail_policy_lets_payer_choose(r.policy_id);
    return;
  end if;
  if ag.accommodation_id is not null then
    r := public.resolve_payment_rail('hotel'::public.property_type, 'rent'::public.listing_intent,
                                     'business'::public.agent_type);
    rail := r.rail; policy_id := r.policy_id;
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
  if b.may_choose then
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
  if not b.may_choose then
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

revoke all on function private.rail_policy_lets_payer_choose(uuid) from public, anon, authenticated;
revoke all on function private.rail_base_for_booking(uuid) from public, anon, authenticated;
revoke all on function private.rail_base_for_agreement(uuid) from public, anon, authenticated;
revoke all on function private.rail_options_for_agreement(uuid) from public, anon, authenticated;
revoke all on function private.rail_for_booking(uuid) from public, anon, authenticated;
revoke all on function private.rail_for_agreement(uuid) from public, anon, authenticated;
