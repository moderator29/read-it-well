-- POV04 (pending migrations pov01 to pov04): the choice RPC's rules.
--   only the payer; only a known word; a sale refuses card; a hotel room
--   refuses escrow; not once a payment is moving or the agreement is closed;
--   card on a system-approved agreement waits while a signal (here the
--   incident switch) fires; the options read says what may be picked; the
--   router's read answers the same rail as the gate; grants are explicit.
-- Everything is rolled back by the final raise.
do $$
declare
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  host  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  v_rental uuid; v_sale uuid; v_sale_owner uuid;
  b_rent uuid := gen_random_uuid();
  a_rent uuid := gen_random_uuid();
  a_sys uuid := gen_random_uuid();
  b_sys uuid := gen_random_uuid();
  a_sale uuid; insp uuid;
  start_day date := (now() at time zone 'Africa/Lagos')::date + 40;
  r jsonb;
begin
  select l.id into v_rental from public.listings l where l.property_type = 'rental' and l.listing_intent = 'rent' limit 1;
  select l.id, a.user_id into v_sale, v_sale_owner from public.listings l join public.agents a on a.id = l.agent_id
   where l.listing_intent = 'sale' and a.user_id is not null and a.user_id <> guest limit 1;
  if v_rental is null or v_sale is null then
    raise exception 'PROBE_FAIL pov04-payer-rail-choice-rpcs: fixtures missing (a rental, a sale)';
  end if;
  insert into public.listing_mandates (listing_id, kind, principal_name, review_status, reviewed_by, reviewed_at,
         principal_relationship, principal_verified_how, principal_verified_by, principal_verified_at)
  select id, 'letting', 'Probe Principal', 'approved', host, now(), 'owner', 'call_back', host, now()
    from public.listings where id = v_rental and listing_role <> 'owner' and not private.listing_has_live_mandate(id);
  update public.listings set is_demo = false where id = v_rental;
  update public.feature_flags set enabled = false where key = 'agreement_review_all';

  perform set_config('vallo.rent_charge', 'true', true);
  insert into public.bookings (id, listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor)
  values (b_rent, v_rental, guest, start_day, start_day + 1, 1, 200000, 200000, 200000),
         (b_sys, v_rental, guest, start_day + 5, start_day + 6, 1, 200000, 200000, 200000);
  perform set_config('vallo.rent_charge', '', true);
  insert into public.deal_agreements (id, kind, listing_id, booking_id, renter_id, owner_id, amount_minor, terms, status, decided_by, decided_at)
  values (a_rent, 'stay', v_rental, b_rent, guest, host, 200000, '{}'::jsonb, 'approved', host, now()),
         (a_sys, 'stay', v_rental, b_sys, guest, host, 200000, '{}'::jsonb, 'approved', null, now());
  insert into public.inspection_requests (listing_id, requester_id, lister_id, requested_at)
  values (v_sale, guest, v_sale_owner, now()) returning id into insp;
  insert into public.deal_agreements (kind, listing_id, inspection_id, renter_id, owner_id, amount_minor, terms)
  values ('rent', v_sale, insp, guest, v_sale_owner, 900000000, '{"total_minor": 900000000}') returning id into a_sale;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);

  -- 1. The options read.
  r := public.payment_rail_options(a_rent);
  if r ->> 'status' <> 'ok' or r -> 'options' <> '["escrow", "card"]'::jsonb or r ->> 'default' <> 'escrow'
     or r ->> 'rail' <> 'escrow' or (r ->> 'payer')::boolean is not true or r ->> 'locked' is not null then
    raise exception 'PROBE_FAIL pov04-payer-rail-choice-rpcs: the options read is wrong: %', r;
  end if;
  -- 2. Unknown words are refused.
  if public.payment_rail_choose(a_rent, 'wallet') ->> 'status' <> 'bad_choice' then
    raise exception 'PROBE_FAIL pov04-payer-rail-choice-rpcs: an unknown word was accepted';
  end if;
  -- 3. The payer picks card, and the live rail follows.
  r := public.payment_rail_choose(a_rent, 'card');
  if r ->> 'status' <> 'ok' or public.payment_rail_options(a_rent) ->> 'rail' <> 'card' then
    raise exception 'PROBE_FAIL pov04-payer-rail-choice-rpcs: the payer could not pick card: %', r;
  end if;
  -- 4. A sale refuses card.
  if public.payment_rail_choose(a_sale, 'card') ->> 'status' <> 'sale_escrow_only' then
    raise exception 'PROBE_FAIL pov04-payer-rail-choice-rpcs: a sale accepted card';
  end if;
  if public.payment_rail_choose(a_sale, 'escrow') ->> 'status' <> 'ok' then
    raise exception 'PROBE_FAIL pov04-payer-rail-choice-rpcs: a sale refused escrow';
  end if;

  -- 5. Only the payer.
  perform set_config('request.jwt.claims', json_build_object('sub', host, 'role', 'authenticated')::text, true);
  if public.payment_rail_choose(a_rent, 'escrow') ->> 'status' <> 'not_payer' then
    raise exception 'PROBE_FAIL pov04-payer-rail-choice-rpcs: the lister set the payer''s rail';
  end if;
  if (public.payment_rail_options(a_rent) ->> 'payer')::boolean then
    raise exception 'PROBE_FAIL pov04-payer-rail-choice-rpcs: the lister was read as the payer';
  end if;
  reset role;

  -- 6. Card on a system-approved agreement waits while a signal fires.
  update public.feature_flags set enabled = true where key = 'agreement_review_all';
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  if public.payment_rail_choose(a_sys, 'card') ->> 'status' <> 'card_needs_review' then
    raise exception 'PROBE_FAIL pov04-payer-rail-choice-rpcs: card was set where nobody could approve it';
  end if;
  reset role;
  update public.feature_flags set enabled = false where key = 'agreement_review_all';

  -- 7. Not once a payment is moving.
  insert into public.provider_arrangements (agreement_id, kind, reference, amount_minor, buyer_user_id, seller_user_id,
                                            buyer_customer_id, seller_customer_id)
  values (a_rent, 'standard', 'vallo-arr-probe-' || replace(gen_random_uuid()::text, '-', ''), 200000, guest, host, 'probe-b', 'probe-s');
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  if public.payment_rail_choose(a_rent, 'escrow') ->> 'status' <> 'payment_started' then
    raise exception 'PROBE_FAIL pov04-payer-rail-choice-rpcs: the rail moved under a payment';
  end if;
  reset role;

  -- 8. Not on a closed agreement.
  update public.deal_agreements set status = 'cancelled' where id = a_sys;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  if public.payment_rail_choose(a_sys, 'escrow') ->> 'status' <> 'closed' then
    raise exception 'PROBE_FAIL pov04-payer-rail-choice-rpcs: a cancelled agreement took a choice';
  end if;
  reset role;

  -- 9. The router's read answers the gate's rail.
  r := public.payment_rail_for_booking(b_rent);
  if r ->> 'rail' <> 'direct' or (r ->> 'payer_may_choose')::boolean is not true
     or (r ->> 'policy_id')::uuid is distinct from (private.rail_for_booking(b_rent)).policy_id then
    raise exception 'PROBE_FAIL pov04-payer-rail-choice-rpcs: the router read disagrees with the gate: %', r;
  end if;

  -- 10. Grants.
  if not has_function_privilege('authenticated', 'public.payment_rail_choose(uuid, text)', 'execute')
     or has_function_privilege('anon', 'public.payment_rail_choose(uuid, text)', 'execute')
     or has_function_privilege('anon', 'public.payment_rail_options(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.payment_rail_for_booking(uuid)', 'execute')
     or not has_function_privilege('service_role', 'public.payment_rail_for_booking(uuid)', 'execute') then
    raise exception 'PROBE_FAIL pov04-payer-rail-choice-rpcs: grants are not as written';
  end if;
  if not exists (select 1 from public.audit_log where action = 'agreement.rail_chosen' and entity_id = a_rent::text) then
    raise exception 'PROBE_FAIL pov04-payer-rail-choice-rpcs: the choice was not audited';
  end if;

  raise exception 'PROBE_OK pov04-payer-rail-choice-rpcs';
end
$$;
