-- B2 RAIL AT OPEN (pending migration b2_rail_at_open): a hotel booking
-- resolves to the direct rail and its policy row; a rental booking resolves to
-- escrow, which a Paystack attempt cannot carry; an unknown booking resolves to
-- nothing; a charge Paystack already took for an unknown reference is still
-- recorded (the settlement exemption); the trigger is present and enabled and
-- the helper is not callable by an app role.
--
-- The trigger itself is exercised: transactions_00_payment_gate fires first
-- and needs an approved agreement, so the probe builds one per booking. Then:
-- an escrow booking with rail 'direct' is refused (42501 rail_at_open), a
-- hotel booking with the wrong policy is refused, and a hotel booking with a
-- null rail is stamped direct with the resolving policy.
--
-- Live fixtures: every hotel/rental listing is is_demo, and bookings refuse a
-- demo listing, so the probe clears is_demo on its two listings first. The
-- block always ends in a raise, so everything rolls back.
do $$
declare
  v_guest uuid;
  v_hotel uuid;
  v_rental uuid;
  b_hotel uuid := gen_random_uuid();
  b_rental uuid := gen_random_uuid();
  r record;
  hotel_policy uuid;
  rental_policy uuid;
  v_owner uuid;
  a_hotel uuid := gen_random_uuid();
  a_rental uuid := gen_random_uuid();
  t_row record;
  refused boolean;
begin
  select id into v_guest from auth.users order by created_at limit 1;
  select l.id into v_hotel from public.listings l where l.property_type = 'hotel' and l.listing_intent = 'rent' limit 1;
  select l.id into v_rental from public.listings l where l.property_type = 'rental' and l.listing_intent = 'rent' limit 1;
  if v_guest is null or v_hotel is null or v_rental is null then
    raise exception 'PROBE_FAIL b2-rail-at-open: fixtures missing (a user, a hotel listing, a rental listing)';
  end if;
  select id into v_owner from auth.users where id <> v_guest order by created_at limit 1;
  if v_owner is null then
    raise exception 'PROBE_FAIL b2-rail-at-open: fixtures missing (a second user for the agreement owner)';
  end if;

  -- Rolled back with the block: bookings refuse a demo listing.
  update public.listings set is_demo = false where id in (v_hotel, v_rental);

  insert into public.bookings (id, listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor)
  values (b_hotel, v_hotel, v_guest, current_date + 400, current_date + 401, 1, 10000, 10000, 10000),
         (b_rental, v_rental, v_guest, current_date + 410, current_date + 411, 1, 10000, 10000, 10000);

  r := private.rail_for_booking(b_hotel);
  if r.rail is distinct from 'direct' or r.policy_id is null then
    raise exception 'PROBE_FAIL b2-rail-at-open: a hotel booking should resolve direct, got %', r.rail;
  end if;
  hotel_policy := r.policy_id;
  if not exists (select 1 from public.payment_rail_policy p where p.id = hotel_policy and p.rail = 'direct') then
    raise exception 'PROBE_FAIL b2-rail-at-open: the resolved policy row is not a direct row';
  end if;

  r := private.rail_for_booking(b_rental);
  if r.rail is distinct from 'escrow' then
    raise exception 'PROBE_FAIL b2-rail-at-open: a rental booking should resolve escrow, got %', r.rail;
  end if;

  rental_policy := r.policy_id;

  r := private.rail_for_booking(gen_random_uuid());
  if r.rail is not null then
    raise exception 'PROBE_FAIL b2-rail-at-open: an unknown booking resolved a rail';
  end if;

  -- Approved agreements, so transactions_00_payment_gate lets the insert
  -- reach transactions_01_rail_at_open.
  insert into public.deal_agreements (id, kind, listing_id, booking_id, renter_id, owner_id, amount_minor, terms, status)
  values (a_hotel, 'stay', v_hotel, b_hotel, v_guest, v_owner, 10000, '{}'::jsonb, 'approved'),
         (a_rental, 'stay', v_rental, b_rental, v_guest, v_owner, 10000, '{}'::jsonb, 'approved');

  -- 1. An escrow booking claiming the direct rail is refused.
  refused := false;
  begin
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id,
      payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor, rail, rail_policy_id)
    values (b_rental, 'paystack', 'probe-b2-rail-esc-' || b_rental::text, 10000, 'NGN', 'PENDING', a_rental,
      'ACCT_probe', 'ACCT_probe', 9800, 0, 200, 'direct', rental_policy);
  exception when insufficient_privilege then
    if sqlerrm not like 'rail_at_open%' then
      raise exception 'PROBE_FAIL b2-rail-at-open: escrow refused by the wrong check: %', sqlerrm;
    end if;
    refused := true;
  end;
  if not refused then
    raise exception 'PROBE_FAIL b2-rail-at-open: an escrow booking opened a Paystack attempt';
  end if;

  -- 2. A hotel booking with the wrong policy is refused.
  refused := false;
  begin
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id,
      payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor, rail, rail_policy_id)
    values (b_hotel, 'paystack', 'probe-b2-rail-pol-' || b_hotel::text, 10000, 'NGN', 'PENDING', a_hotel,
      'ACCT_probe', 'ACCT_probe', 9800, 0, 200, 'direct', rental_policy);
  exception when insufficient_privilege then
    if sqlerrm not like 'rail_at_open%' then
      raise exception 'PROBE_FAIL b2-rail-at-open: wrong policy refused by the wrong check: %', sqlerrm;
    end if;
    refused := true;
  end;
  if not refused then
    raise exception 'PROBE_FAIL b2-rail-at-open: a wrong rail_policy_id was accepted';
  end if;

  -- 3. A hotel booking with no rail is stamped direct with its policy.
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status, agreement_id,
    payee_subaccount_code, reserve_subaccount_code, lister_share_minor, guarantee_minor, commission_minor)
  values (b_hotel, 'paystack', 'probe-b2-rail-null-' || b_hotel::text, 10000, 'NGN', 'PENDING', a_hotel,
    'ACCT_probe', 'ACCT_probe', 9800, 0, 200)
  returning rail, rail_policy_id into t_row;
  if t_row.rail is distinct from 'direct' or t_row.rail_policy_id is distinct from hotel_policy then
    raise exception 'PROBE_FAIL b2-rail-at-open: a null-rail direct attempt was not stamped (%, %)', t_row.rail, t_row.rail_policy_id;
  end if;

  -- Money already taken is recorded, rail or not.
  perform set_config('vallo.recording_unknown_charge', 'on', true);
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status)
  values (b_rental, 'paystack', 'probe-b2-rail-' || b_rental::text, 10000, 'NGN', 'PENDING');
  perform set_config('vallo.recording_unknown_charge', '', true);

  if not exists (select 1 from pg_trigger where tgname = 'transactions_01_rail_at_open' and tgenabled = 'O' and not tgisinternal) then
    raise exception 'PROBE_FAIL b2-rail-at-open: trigger missing or disabled';
  end if;
  if has_function_privilege('authenticated', 'private.rail_for_booking(uuid)', 'execute')
     or has_function_privilege('anon', 'private.rail_for_booking(uuid)', 'execute')
     or has_function_privilege('anon', 'private.transactions_rail_at_open()', 'execute')
     or has_function_privilege('authenticated', 'private.transactions_rail_at_open()', 'execute') then
    raise exception 'PROBE_FAIL b2-rail-at-open: a member can call the helper';
  end if;

  raise exception 'PROBE_OK b2-rail-at-open';
end
$$;
