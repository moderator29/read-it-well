-- POV05 (pending migrations pov01 to pov05): a shortlet stay can be held in
-- escrow, a card choice is never also held, a held stay counts as paid for
-- the trip details, and the hold sweep cannot cancel it.
-- Everything is rolled back by the final raise.
do $$
declare
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  host  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  v_short uuid;
  b_short uuid := gen_random_uuid();
  a_short uuid := gen_random_uuid();
  start_day date := (now() at time zone 'Africa/Lagos')::date + 50;
  r jsonb;
  st text;
  refused boolean;
begin
  select l.id into v_short from public.listings l
   where l.property_type = 'shortlet' and l.listing_intent = 'rent' and l.rate_period = 'night' limit 1;
  if v_short is null then
    raise exception 'PROBE_FAIL pov05-escrow-for-shortlet-stays: fixtures missing (a nightly shortlet)';
  end if;
  insert into public.listing_mandates (listing_id, kind, principal_name, review_status, reviewed_by, reviewed_at,
         principal_relationship, principal_verified_how, principal_verified_by, principal_verified_at)
  select id, 'letting', 'Probe Principal', 'approved', host, now(), 'owner', 'call_back', host, now()
    from public.listings where id = v_short and listing_role <> 'owner' and not private.listing_has_live_mandate(id);
  update public.listings set is_demo = false where id = v_short;
  update public.feature_flags set enabled = true where key = 'payments_payluk_on';
  update public.feature_flags set enabled = false where key = 'agreement_review_all';

  insert into public.bookings (id, listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (b_short, v_short, guest, start_day, start_day + 1, 1, 200000, 200000, 200000, 'CONFIRMED');
  insert into public.deal_agreements (id, kind, listing_id, booking_id, renter_id, owner_id, amount_minor, terms, status, decided_by, decided_at)
  values (a_short, 'stay', v_short, b_short, guest, host, 200000, '{"check_in": "2030-01-01"}'::jsonb, 'approved', host, now());

  -- 1. A stay at a listing is no longer refused for its kind.
  r := public.provider_arrangement_open(a_short, 'standard', null);
  if r ->> 'status' in ('not_payable', 'not_escrow') then
    raise exception 'PROBE_FAIL pov05-escrow-for-shortlet-stays: an escrow shortlet stay could not open: %', r;
  end if;

  -- 2. Card chosen: never also held.
  update public.provider_arrangements set status = 'cancelled' where agreement_id = a_short;
  update public.deal_agreements set payer_rail_choice = 'card', payer_rail_chosen_at = now() where id = a_short;
  r := public.provider_arrangement_open(a_short, 'standard', null);
  if r ->> 'status' <> 'not_escrow' then
    raise exception 'PROBE_FAIL pov05-escrow-for-shortlet-stays: a card choice opened escrow: %', r;
  end if;
  update public.deal_agreements set payer_rail_choice = 'escrow', payer_rail_chosen_at = now() where id = a_short;

  -- 3. Held money counts as paid for the stay.
  if private.booking_is_paid(b_short) then
    raise exception 'PROBE_FAIL pov05-escrow-for-shortlet-stays: an unpaid stay read as paid';
  end if;
  insert into public.provider_arrangements (agreement_id, kind, reference, amount_minor, buyer_user_id, seller_user_id,
                                            buyer_customer_id, seller_customer_id, status)
  values (a_short, 'standard', 'vallo-arr-probe-' || replace(gen_random_uuid()::text, '-', ''), 200000, guest, host,
          'probe-b', 'probe-s', 'protected');
  if not private.booking_is_paid(b_short) then
    raise exception 'PROBE_FAIL pov05-escrow-for-shortlet-stays: a held stay did not read as paid';
  end if;

  -- 4. The sweep leaves a held stay alone (its marker; the cron route's
  --    statement names the sweep's function, which counts the same).
  perform set_config('vallo.hold_sweep', 'on', true);
  update public.bookings set status = 'CANCELLED' where id = b_short;
  perform set_config('vallo.hold_sweep', '', true);
  select status::text into st from public.bookings where id = b_short;
  if st <> 'CONFIRMED' then
    raise exception 'PROBE_FAIL pov05-escrow-for-shortlet-stays: the sweep cancelled a held stay (%)', st;
  end if;

  -- 5. Anything else is told to unwind it through the held payment (the
  --    guest's cancel runs as the service role, so this is the same path).
  refused := false;
  begin
    update public.bookings set status = 'CANCELLED' where id = b_short;
  exception when insufficient_privilege then
    refused := sqlerrm like 'escrow_held%';
  end;
  if not refused then
    raise exception 'PROBE_FAIL pov05-escrow-for-shortlet-stays: a held stay was cancelled outside its held payment';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'bookings_00_escrow_keeps_the_stay' and tgenabled = 'O') then
    raise exception 'PROBE_FAIL pov05-escrow-for-shortlet-stays: the trigger is missing or disabled';
  end if;

  raise exception 'PROBE_OK pov05-escrow-for-shortlet-stays';
end
$$;
