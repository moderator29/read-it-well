-- ESC-04: a host records a no show only from 12:00 WAT the day after check-in,
-- never on a booking that carries a rent charge, and a no show's nights stay
-- booked and cannot be sold again until its check-out. Controls: a no show
-- after the grace is recorded; a confirmed stay on another listing is
-- unaffected. Rolls back.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';   -- guest
  lister constant uuid := 'e0000000-0000-4000-8000-000000000001';   -- host
  stay constant uuid := 'ed000000-0000-4000-8000-000000000003';
  stay2 constant uuid := 'ed000000-0000-4000-8000-000000000018';
  home constant uuid := 'ed000000-0000-4000-8000-000000000004';
  lagos date := (now() at time zone 'Africa/Lagos')::date;
  today_bk uuid; past_bk uuid; rent_bk uuid; insp uuid;
  r jsonb; n int;
begin
  update public.listings set is_demo = false, status = 'PUBLISHED' where id in (stay, stay2, home);

  -- Check-in today: too early, even at the door.
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (stay2, member, lagos, lagos + 2, 2, 1, 2, 2, 'CONFIRMED') returning id into today_bk;
  r := private.record_booking_no_show(today_bk, lister, 'probe');
  if r ->> 'outcome' <> 'too_early' then raise exception 'PROBE_FAIL esc-04: a no show on check-in day was %', r; end if;

  -- Check-in two days ago: recorded, and the nights stay held.
  -- Bookings cannot be made in the past, so these are moved back with the
  -- pricing trigger set aside.
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (stay, member, lagos + 200, lagos + 205, 5, 1, 5, 5, 'CONFIRMED') returning id into past_bk;
  alter table public.bookings disable trigger bookings_priced_by_the_listing;
  update public.bookings set check_in = lagos - 2, check_out = lagos + 3 where id = past_bk;
  alter table public.bookings enable trigger bookings_priced_by_the_listing;
  insert into public.availability (listing_id, date, status)
  select stay, d::date, 'booked' from generate_series(lagos - 2, lagos + 2, interval '1 day') d
  on conflict do nothing;
  r := private.record_booking_no_show(past_bk, lister, 'probe');
  if r ->> 'outcome' <> 'recorded' then raise exception 'PROBE_FAIL esc-04: a no show after the grace was %', r; end if;
  select count(*) into n from public.availability where listing_id = stay and status = 'booked' and date between lagos and lagos + 2;
  if n <> 3 then raise exception 'PROBE_FAIL esc-04: the no show gave back % of 3 nights ahead', 3 - n; end if;
  begin
    insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
    values (stay, member, lagos + 1, lagos + 2, 1, 1, 1, 1, 'PENDING');
    raise exception 'PROBE_FAIL esc-04: a no show''s night was sold again';
  exception when exclusion_violation then null; end;

  -- A rent charge is never a host's no show.
  insert into public.inspection_requests (listing_id, requester_id, lister_id, requested_at)
  values (home, member, lister, now()) returning id into insp;
  -- A move-in charge is written by open_rent_charge, not priced as a stay.
  alter table public.bookings disable trigger bookings_priced_by_the_listing;
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (home, member, lagos - 3, lagos - 2, 1, 1, 1, 1, 'CONFIRMED') returning id into rent_bk;
  alter table public.bookings enable trigger bookings_priced_by_the_listing;
  insert into public.rent_payments (inspection_id, listing_id, tenant_id, lister_id, booking_id, move_in, total_minor)
  values (insp, home, member, lister, rent_bk, lagos - 3, 1);
  r := private.record_booking_no_show(rent_bk, lister, 'probe');
  if r ->> 'outcome' <> 'rent_charge' then raise exception 'PROBE_FAIL esc-04: a move-in charge was %', r; end if;

  raise exception 'PROBE_OK esc-04';
end $$;
