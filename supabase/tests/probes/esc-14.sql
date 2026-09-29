-- ESC-14: a stay the host accepted but the guest never paid lapses 24 hours
-- after acceptance, or on check-in day once the acceptance is two hours old,
-- and its nights go back. Controls left alone: a paid CONFIRMED stay, an
-- accepted stay still inside its 24 hours with a future check-in, a stay
-- accepted within the last two hours on check-in day, a payment in flight
-- (on check-in day too, up to 26 hours after acceptance), and a rent charge.
-- Rolls back.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  s1 constant uuid := 'ed000000-0000-4000-8000-000000000003';
  s2 constant uuid := 'ed000000-0000-4000-8000-000000000037';
  s3 constant uuid := 'ed000000-0000-4000-8000-000000000039';
  s4 constant uuid := 'ed000000-0000-4000-8000-000000000018';
  lagos date := (now() at time zone 'Africa/Lagos')::date;
  stale uuid; today uuid; today_new uuid; today_paying uuid; fresh uuid; paid uuid; paying uuid; stalled uuid;
  r jsonb; st text; n int;
begin
  -- SCUML item 17 (live 29 Sep): an agent listing goes live only on an
  -- approved mandate. The fixture files one as the platform would.
  insert into public.listing_mandates (listing_id, kind, principal_name, review_status, reviewed_by, reviewed_at,
         principal_relationship, principal_verified_how, principal_verified_by, principal_verified_at)
  select id, 'letting', 'Probe Principal', 'approved', '03f3dd52-ea28-4852-9abe-e5b0a67c2a43', now(),
         'owner', 'call_back', '03f3dd52-ea28-4852-9abe-e5b0a67c2a43', now()
    from public.listings where id in (s1, s2, s3, s4) and listing_role <> 'owner'
     and not private.listing_has_live_mandate(id);
  update public.listings set is_demo = false, status = 'PUBLISHED' where id in (s1, s2, s3, s4);
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (s1, member, lagos + 10, lagos + 12, 2, 1, 2, 2, 'CONFIRMED') returning id into stale;
  insert into public.booking_state_events (booking_id, from_status, to_status, note, created_at)
  values (stale, 'PENDING', 'CONFIRMED', 'accepted', now() - interval '25 hours');
  insert into public.availability (listing_id, date, status) values (s1, lagos + 10, 'booked'), (s1, lagos + 11, 'booked')
  on conflict do nothing;
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (s2, member, lagos, lagos + 1, 1, 1, 1, 1, 'CONFIRMED') returning id into today;
  insert into public.booking_state_events (booking_id, from_status, to_status, note, created_at)
  values (today, 'PENDING', 'CONFIRMED', 'accepted', now() - interval '3 hours');
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (s3, member, lagos, lagos + 1, 1, 1, 1, 1, 'CONFIRMED') returning id into today_new;
  insert into public.booking_state_events (booking_id, from_status, to_status, note, created_at)
  values (today_new, 'PENDING', 'CONFIRMED', 'accepted', now() - interval '1 hour');
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (s4, member, lagos, lagos + 1, 1, 1, 1, 1, 'CONFIRMED') returning id into today_paying;
  insert into public.booking_state_events (booking_id, from_status, to_status, note, created_at)
  values (today_paying, 'PENDING', 'CONFIRMED', 'accepted', now() - interval '3 hours');
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, status, created_at)
  values (today_paying, 'paystack', 'probe-esc14-today-paying', 1, 'PENDING', now() - interval '10 minutes');
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (s3, member, lagos + 20, lagos + 21, 1, 1, 1, 1, 'CONFIRMED') returning id into fresh;
  insert into public.booking_state_events (booking_id, from_status, to_status, note, created_at)
  values (fresh, 'PENDING', 'CONFIRMED', 'accepted', now() - interval '2 hours');
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (s4, member, lagos + 30, lagos + 31, 1, 1, 1, 1, 'CONFIRMED') returning id into paid;
  insert into public.booking_state_events (booking_id, from_status, to_status, note, created_at)
  values (paid, 'PENDING', 'CONFIRMED', 'accepted', now() - interval '3 days');
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, status)
  values (paid, 'paystack', 'probe-esc14-paid', 1, 'SUCCESSFUL');
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (s1, member, lagos + 40, lagos + 41, 1, 1, 1, 1, 'CONFIRMED') returning id into paying;
  insert into public.booking_state_events (booking_id, from_status, to_status, note, created_at)
  values (paying, 'PENDING', 'CONFIRMED', 'accepted', now() - interval '25 hours');
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, status, created_at)
  values (paying, 'paystack', 'probe-esc14-paying', 1, 'PENDING', now() - interval '20 minutes');

  -- Past the 26-hour cap, a checkout opened a moment ago no longer holds the nights.
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (s2, member, lagos + 50, lagos + 51, 1, 1, 1, 1, 'CONFIRMED') returning id into stalled;
  insert into public.booking_state_events (booking_id, from_status, to_status, note, created_at)
  values (stalled, 'PENDING', 'CONFIRMED', 'accepted', now() - interval '30 hours');
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, status, created_at)
  values (stalled, 'paystack', 'probe-esc14-stalled', 1, 'PENDING', now() - interval '5 minutes');

  r := private.expire_booking_holds(interval '48 hours', 500);

  select status::text into st from public.bookings where id = stale;
  if st <> 'CANCELLED' then raise exception 'PROBE_FAIL esc-14: accepted 25h ago and unpaid is %', st; end if;
  select count(*) into n from public.availability where listing_id = s1 and date in (lagos + 10, lagos + 11) and status = 'booked';
  if n <> 0 then raise exception 'PROBE_FAIL esc-14: the nights were not given back'; end if;
  select status::text into st from public.bookings where id = today;
  if st <> 'CANCELLED' then raise exception 'PROBE_FAIL esc-14: unpaid on check-in day, accepted 3h ago, is %', st; end if;
  select status::text into st from public.bookings where id = today_new;
  if st <> 'CONFIRMED' then raise exception 'PROBE_FAIL esc-14: accepted 1h ago on check-in day was cancelled'; end if;
  select status::text into st from public.bookings where id = today_paying;
  if st <> 'CONFIRMED' then raise exception 'PROBE_FAIL esc-14: a payment in flight on check-in day was not waited for'; end if;
  select status::text into st from public.bookings where id = fresh;
  if st <> 'CONFIRMED' then raise exception 'PROBE_FAIL esc-14: accepted 2h ago was cancelled'; end if;
  select status::text into st from public.bookings where id = paid;
  if st <> 'CONFIRMED' then raise exception 'PROBE_FAIL esc-14: a paid stay was cancelled'; end if;
  select status::text into st from public.bookings where id = paying;
  if st <> 'CONFIRMED' then raise exception 'PROBE_FAIL esc-14: a payment in flight was not waited for'; end if;
  select status::text into st from public.bookings where id = stalled;
  if st <> 'CANCELLED' then raise exception 'PROBE_FAIL esc-14: checkouts kept an unpaid stay past the cap (%)', st; end if;
  if not (r -> 'accepted_unpaid') @> to_jsonb(array[stale, today, stalled]) then
    raise exception 'PROBE_FAIL esc-14: result %', r;
  end if;
  raise exception 'PROBE_OK esc-14';
end $$;
