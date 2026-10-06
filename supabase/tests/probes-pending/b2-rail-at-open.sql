-- B2 RAIL AT OPEN (pending migration b2_rail_at_open): a hotel booking
-- resolves to the direct rail and its policy row; a rental booking resolves to
-- escrow, which a Paystack attempt cannot carry; an unknown booking resolves to
-- nothing; a charge Paystack already took for an unknown reference is still
-- recorded (the settlement exemption); the trigger is present and enabled and
-- the helper is not callable by an app role.
--
-- A full refused INSERT is not exercised here: transactions_00_payment_gate
-- fires first and needs an approved agreement, which is the existing gate's
-- own probe. The resolution the trigger compares against is what is proved.
do $$
declare
  v_guest uuid;
  v_hotel uuid;
  v_rental uuid;
  b_hotel uuid := gen_random_uuid();
  b_rental uuid := gen_random_uuid();
  r record;
  hotel_policy uuid;
begin
  select id into v_guest from auth.users order by created_at limit 1;
  select l.id into v_hotel from public.listings l where l.property_type = 'hotel' and l.listing_intent = 'rent' limit 1;
  select l.id into v_rental from public.listings l where l.property_type = 'rental' and l.listing_intent = 'rent' limit 1;
  if v_guest is null or v_hotel is null or v_rental is null then
    raise exception 'PROBE_FAIL b2-rail-at-open: fixtures missing (a user, a hotel listing, a rental listing)';
  end if;

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

  r := private.rail_for_booking(gen_random_uuid());
  if r.rail is not null then
    raise exception 'PROBE_FAIL b2-rail-at-open: an unknown booking resolved a rail';
  end if;

  -- Money already taken is recorded, rail or not.
  perform set_config('vallo.recording_unknown_charge', 'on', true);
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status)
  values (b_rental, 'paystack', 'probe-b2-rail-' || b_rental::text, 10000, 'NGN', 'PENDING');
  perform set_config('vallo.recording_unknown_charge', '', true);

  if not exists (select 1 from pg_trigger where tgname = 'transactions_01_rail_at_open' and tgenabled = 'O' and not tgisinternal) then
    raise exception 'PROBE_FAIL b2-rail-at-open: trigger missing or disabled';
  end if;
  if has_function_privilege('authenticated', 'private.rail_for_booking(uuid)', 'execute') then
    raise exception 'PROBE_FAIL b2-rail-at-open: a member can call the helper';
  end if;

  raise exception 'PROBE_OK b2-rail-at-open';
end
$$;
