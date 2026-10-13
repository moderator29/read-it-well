-- POV03 (pending migrations pov01 to pov03): the rail for every case, with
-- and without the payer's choice.
--   rent (a rent charge on a rental)   escrow by default, card when chosen
--   shortlet at a nightly rate         escrow by default (ruling 4), card when chosen
--   sale                               escrow, even with card stored
--   hotel room                         direct (card), whatever is stored
--   restaurant                         card only
-- and the gate follows: an escrow agreement needs no review, a card one is
-- reviewed when a signal fires (agreement_review_required reads the rail).
-- Live fixtures: rental and shortlet listings are is_demo and bookings refuse
-- a demo listing, so the probe clears is_demo on its listings first, and
-- files a mandate where the listing needs one, as b2-rail-at-open does.
-- Everything is rolled back by the final raise.
do $$
declare
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  host  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  v_rental uuid; v_short uuid; v_sale uuid; v_sale_owner uuid; v_rest uuid; v_rest_owner uuid;
  b_rent uuid := gen_random_uuid();
  b_short uuid := gen_random_uuid();
  b_room uuid;
  a_rent uuid := gen_random_uuid();
  a_short uuid := gen_random_uuid();
  a_room uuid := gen_random_uuid();
  a_sale uuid; a_rest uuid; insp uuid;
  biz uuid; acc uuid; rt uuid; rp uuid; pol uuid; dd date;
  start_day date := (now() at time zone 'Africa/Lagos')::date + 30;
  r record;
  opts text[];
  rv jsonb;
begin
  select l.id into v_rental from public.listings l where l.property_type = 'rental' and l.listing_intent = 'rent' limit 1;
  select l.id into v_short from public.listings l
   where l.property_type = 'shortlet' and l.listing_intent = 'rent' and l.rate_period = 'night' limit 1;
  select l.id, a.user_id into v_sale, v_sale_owner from public.listings l join public.agents a on a.id = l.agent_id
   where l.listing_intent = 'sale' and a.user_id is not null limit 1;
  select l.id, a.user_id into v_rest, v_rest_owner from public.listings l join public.agents a on a.id = l.agent_id
   where l.property_type = 'restaurant' and a.user_id is not null limit 1;
  if v_rental is null or v_short is null or v_sale is null then
    raise exception 'PROBE_FAIL pov03-rail-resolution-honours-the-choice: fixtures missing (a rental, a nightly shortlet, a sale)';
  end if;

  insert into public.listing_mandates (listing_id, kind, principal_name, review_status, reviewed_by, reviewed_at,
         principal_relationship, principal_verified_how, principal_verified_by, principal_verified_at)
  select id, 'letting', 'Probe Principal', 'approved', host, now(), 'owner', 'call_back', host, now()
    from public.listings where id in (v_rental, v_short) and listing_role <> 'owner'
     and not private.listing_has_live_mandate(id);
  update public.listings set is_demo = false where id in (v_rental, v_short);

  -- RENT: the booking a rent charge opens.
  perform set_config('vallo.rent_charge', 'true', true);
  insert into public.bookings (id, listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor)
  values (b_rent, v_rental, guest, start_day + 100, start_day + 101, 1, 200000, 200000, 200000);
  perform set_config('vallo.rent_charge', '', true);
  -- SHORTLET at a nightly rate.
  insert into public.bookings (id, listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor)
  values (b_short, v_short, guest, start_day + 110, start_day + 111, 1, 200000, 200000, 200000);
  insert into public.deal_agreements (id, kind, listing_id, booking_id, renter_id, owner_id, amount_minor, terms, status, decided_by, decided_at)
  values (a_rent, 'stay', v_rental, b_rent, guest, host, 200000, '{}'::jsonb, 'approved', host, now()),
         (a_short, 'stay', v_short, b_short, guest, host, 200000, '{}'::jsonb, 'approved', host, now());

  -- 1. Rent: escrow by default, card when chosen, escrow again.
  r := private.rail_for_booking(b_rent);
  if r.rail is distinct from 'escrow' or private.rail_for_agreement(a_rent) is distinct from 'escrow' then
    raise exception 'PROBE_FAIL pov03-rail-resolution-honours-the-choice: rent without a choice is not escrow (%)', r.rail;
  end if;
  if private.rail_options_for_agreement(a_rent) <> array['escrow', 'card'] then
    raise exception 'PROBE_FAIL pov03-rail-resolution-honours-the-choice: rent does not offer escrow and card';
  end if;
  update public.deal_agreements set payer_rail_choice = 'card', payer_rail_chosen_at = now() where id = a_rent;
  r := private.rail_for_booking(b_rent);
  if r.rail is distinct from 'direct' or r.policy_id is null or private.rail_for_agreement(a_rent) is distinct from 'direct' then
    raise exception 'PROBE_FAIL pov03-rail-resolution-honours-the-choice: rent with card chosen is not direct (%)', r.rail;
  end if;
  update public.deal_agreements set payer_rail_choice = 'escrow', payer_rail_chosen_at = now() where id = a_rent;
  if (private.rail_for_booking(b_rent)).rail is distinct from 'escrow' then
    raise exception 'PROBE_FAIL pov03-rail-resolution-honours-the-choice: rent with escrow chosen is not escrow';
  end if;

  -- 2. Shortlet at a nightly rate (ruling 4): no longer the hotel row.
  r := private.rail_for_booking(b_short);
  if r.rail is distinct from 'escrow' then
    raise exception 'PROBE_FAIL pov03-rail-resolution-honours-the-choice: a nightly shortlet is not escrow by default (%)', r.rail;
  end if;
  rv := private.agreement_review_required(a_short);
  if (rv ->> 'required')::boolean or rv ->> 'rail' is distinct from 'escrow' then
    raise exception 'PROBE_FAIL pov03-rail-resolution-honours-the-choice: escrow asked for a review: %', rv;
  end if;
  update public.deal_agreements set payer_rail_choice = 'card', payer_rail_chosen_at = now() where id = a_short;
  if (private.rail_for_booking(b_short)).rail is distinct from 'direct' then
    raise exception 'PROBE_FAIL pov03-rail-resolution-honours-the-choice: a nightly shortlet with card chosen is not direct';
  end if;
  rv := private.agreement_review_required(a_short);
  if rv ->> 'rail' is distinct from 'direct' then
    raise exception 'PROBE_FAIL pov03-rail-resolution-honours-the-choice: the gate did not read the card choice: %', rv;
  end if;

  -- 3. Sale: escrow only, even with card stored.
  insert into public.inspection_requests (listing_id, requester_id, lister_id, requested_at)
  values (v_sale, guest, v_sale_owner, now()) returning id into insp;
  insert into public.deal_agreements (kind, listing_id, inspection_id, renter_id, owner_id, amount_minor, terms,
                                      payer_rail_choice, payer_rail_chosen_at)
  values ('rent', v_sale, insp, guest, v_sale_owner, 900000000, '{"total_minor": 900000000}', 'card', now())
  returning id into a_sale;
  if private.rail_for_agreement(a_sale) is distinct from 'escrow' then
    raise exception 'PROBE_FAIL pov03-rail-resolution-honours-the-choice: a sale with card stored is not escrow';
  end if;
  if private.rail_options_for_agreement(a_sale) <> array['escrow'] then
    raise exception 'PROBE_FAIL pov03-rail-resolution-honours-the-choice: a sale offers more than escrow';
  end if;

  -- 4. Hotel room: card only, whatever is stored.
  update public.feature_flags set enabled = true where key = 'room_bookings';
  update public.feature_flags set enabled = false where key = 'stays_instant_pay';
  insert into public.businesses (owner_id, kind, name, slug, status, source)
  values (host, 'hotel', 'Probe POV03 Hotel', 'probe-pov03-' || gen_random_uuid(), 'PUBLISHED', 'first_party') returning id into biz;
  insert into public.accommodations (business_id, name, slug, status)
  values (biz, 'Probe POV03 Hotel', 'probe-pov03-a-' || gen_random_uuid(), 'PUBLISHED') returning id into acc;
  insert into public.room_types (accommodation_id, name, category, sleeps, units_total, base_rate_minor, status)
  values (acc, 'Probe double', 'double', 2, 4, 5000000, 'PUBLISHED') returning id into rt;
  select id into pol from public.cancellation_policies limit 1;
  insert into public.rate_plans (room_type_id, name, cancellation_policy_id, rate_minor, currency, min_stay_nights, active)
  values (rt, 'Probe room only', pol, 5000000, 'NGN', 1, true) returning id into rp;
  for dd in select generate_series(start_day, start_day + 2, interval '1 day')::date loop
    insert into public.room_inventory (room_type_id, date, units_open) values (rt, dd, 4);
  end loop;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  insert into public.bookings (guest_id, accommodation_id, room_type_id, rate_plan_id, rooms, check_in, check_out, adults)
  values (guest, acc, rt, rp, 1, start_day, start_day + 1, 2) returning id into b_room;
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  insert into public.deal_agreements (id, kind, accommodation_id, booking_id, renter_id, owner_id, amount_minor, terms, status,
                                      decided_by, decided_at, payer_rail_choice, payer_rail_chosen_at)
  select a_room, 'stay', acc, b_room, guest, host, b.total_minor, '{}'::jsonb, 'approved', host, now(), 'escrow', now()
    from public.bookings b where b.id = b_room;
  if (private.rail_for_booking(b_room)).rail is distinct from 'direct' or private.rail_for_agreement(a_room) is distinct from 'direct' then
    raise exception 'PROBE_FAIL pov03-rail-resolution-honours-the-choice: a hotel room with escrow stored is not card';
  end if;
  if private.rail_options_for_agreement(a_room) <> array['card'] then
    raise exception 'PROBE_FAIL pov03-rail-resolution-honours-the-choice: a hotel room offers more than card';
  end if;

  -- 5. Restaurant: card only.
  if v_rest is not null then
    begin
      insert into public.inspection_requests (listing_id, requester_id, lister_id, requested_at)
      values (v_rest, guest, v_rest_owner, now()) returning id into insp;
      insert into public.deal_agreements (kind, listing_id, inspection_id, renter_id, owner_id, amount_minor, terms)
      values ('rent', v_rest, insp, guest, v_rest_owner, 500000, '{}') returning id into a_rest;
    exception when others then
      raise notice 'PROBE_SKIP pov03 5: the restaurant fixture was refused: %', sqlerrm;
    end;
  end if;
  if a_rest is not null then
    opts := private.rail_options_for_agreement(a_rest);
    if opts <> array['card'] then
      raise exception 'PROBE_FAIL pov03-rail-resolution-honours-the-choice: a restaurant offers %', opts;
    end if;
  else
    raise notice 'PROBE_SKIP pov03 5: no restaurant listing; resolve_payment_rail is checked in pov02';
  end if;

  -- 6. No member can call the helpers.
  if has_function_privilege('authenticated', 'private.rail_base_for_booking(uuid)', 'execute')
     or has_function_privilege('authenticated', 'private.rail_options_for_agreement(uuid)', 'execute')
     or has_function_privilege('anon', 'private.rail_for_agreement(uuid)', 'execute') then
    raise exception 'PROBE_FAIL pov03-rail-resolution-honours-the-choice: a member can call a rail helper';
  end if;

  raise exception 'PROBE_OK pov03-rail-resolution-honours-the-choice';
end
$$;
