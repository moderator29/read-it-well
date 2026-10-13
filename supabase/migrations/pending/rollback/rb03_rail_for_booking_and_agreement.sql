-- ROLLBACK for pov03 (and for the rail half of pov01 to pov04).
-- The live definitions of private.rail_for_booking and private.rail_for_agreement,
-- read from the live database (pg_get_functiondef) on 13 October 2026, before
-- pov03 replaces them, and private.agreement_review_required. Running this file puts the rail back exactly as it was:
-- a nightly listing takes the hotel row again and the payer's choice is no
-- longer read. The helpers pov03 adds (rail_base_for_booking,
-- rail_base_for_agreement, rail_options_for_agreement,
-- rail_policy_lets_payer_choose, rail_business_scope) are left in place:
-- nothing reads them once these two are restored, and nothing is dropped.
set lock_timeout = '5s';

CREATE OR REPLACE FUNCTION private.rail_for_booking(p_booking uuid, OUT rail text, OUT policy_id uuid)
 RETURNS record
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

CREATE OR REPLACE FUNCTION private.rail_for_agreement(p_agreement uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

-- The gate, as it was before pov03's instant-stay card rule.
CREATE OR REPLACE FUNCTION private.agreement_review_required(p_agreement uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
