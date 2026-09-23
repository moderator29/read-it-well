-- ESC-02 (with SUP-03, DB-P2-01, SEC-P2-01) and ESC-P2-01.
-- A guest's own insert is priced from the listing (a 3-kobo booking is stored
-- at the listing's nightly rate and cannot be paid for 3 kobo); past dates,
-- overlaps, host-blocked nights, rentals and unpublished listings are refused;
-- the deployed reserve() insert and the rent charge still work; neither the
-- guest nor an admin over the API can rewrite a booking, the owner role cannot
-- change its price, and a status change leaves an audit row. Always rolls back.
do $$
declare
  member uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin  uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  lister uuid := 'e0000000-0000-4000-8000-000000000001';
  stay   uuid := 'ed000000-0000-4000-8000-000000000003';
  rental uuid := 'ed000000-0000-4000-8000-000000000007';
  lagos  date := (now() at time zone 'Africa/Lagos')::date;
  claims text := json_build_object('sub', '957b3bd2-cce3-425d-bba9-5cd876ca3d62', 'role', 'authenticated')::text;
  bk uuid; bk2 uuid; insp uuid; r jsonb; mw uuid; n int; t bigint; rate bigint;
begin
  -- An example stay made real inside the transaction, and an example rental.
  update public.listings set is_demo = false, status = 'PUBLISHED' where id = stay;
  select rate_minor into rate from public.listings where id = stay;
  update public.listings set is_demo = false, status = 'PUBLISHED', listing_intent = 'rent',
         rent_amount_minor = 150000000, rent_period = 'year', rate_minor = 0, rate_period = null,
         total_move_in_cost_minor = null
   where id = rental;
  insert into public.wallets (user_id) values (member) on conflict do nothing;
  select id into mw from public.wallets where user_id = member;
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
  values (mw, 'deposit', 'credit', 1000, 'probe-esc02-dep-' || gen_random_uuid(), 'COMPLETED');

  -- ATTACK: three nights at 1 kobo, total 3. Stored price must be the listing's.
  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, adults, children,
    price_per_night_minor, cleaning_fee_minor, service_fee_minor, subtotal_minor, total_minor, status)
  values (stay, member, lagos + 10, lagos + 13, 3, 1, 0, 1, 0, 0, 3, 3, 'PENDING')
  returning id into bk2;
  select total_minor into t from public.bookings where id = bk2;
  if t <> rate * 3 then raise exception 'PROBE_FAIL esc-02: 3-kobo booking stored total %', t; end if;
  -- ...and paying it cannot succeed for 3 kobo.
  reset role;
  r := private.pay_booking_from_wallet(member, bk2, 'probe-esc02-pay-' || gen_random_uuid());
  if r->>'status' <> 'insufficient' then raise exception 'PROBE_FAIL esc-02: pay answered %', r; end if;
  delete from public.bookings where id = bk2;

  -- ATTACK: the same insert with the rent charge's mark set. The mark is
  -- honoured only for a non-API session role, so this is priced too.
  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  perform set_config('vallo.rent_charge', 'true', true);
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, adults, children,
    price_per_night_minor, cleaning_fee_minor, service_fee_minor, subtotal_minor, total_minor, status)
  values (stay, member, lagos + 70, lagos + 73, 3, 1, 0, 1, 0, 0, 3, 3, 'PENDING')
  returning id into bk2;
  perform set_config('vallo.rent_charge', '', true);
  select total_minor into t from public.bookings where id = bk2;
  if t <> rate * 3 then raise exception 'PROBE_FAIL esc-02: marked guest insert stored total %', t; end if;
  reset role;
  delete from public.bookings where id = bk2;

  -- CONTROL: the deployed reserve() insert, honestly priced, succeeds unchanged.
  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, adults, children,
    price_per_night_minor, cleaning_fee_minor, service_fee_minor, subtotal_minor, total_minor, status)
  values (stay, member, lagos + 30, lagos + 32, 2, 1, 0, rate, 0, 0, rate * 2, rate * 2, 'PENDING')
  returning id into bk;
  select total_minor into t from public.bookings where id = bk;
  if t <> rate * 2 then raise exception 'PROBE_FAIL esc-02: honest booking stored %', t; end if;

  -- REFUSAL: past check-in.
  begin
    insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, adults, children,
      price_per_night_minor, cleaning_fee_minor, service_fee_minor, subtotal_minor, total_minor, status)
    values (stay, member, lagos - 10, lagos - 8, 2, 1, 0, rate, 0, 0, rate * 2, rate * 2, 'PENDING');
    raise exception 'PROBE_FAIL esc-02: past booking accepted';
  exception when check_violation then null;
  end;

  -- REFUSAL: a stay booking on a rental (no nightly rate).
  begin
    insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, adults, children,
      price_per_night_minor, cleaning_fee_minor, service_fee_minor, subtotal_minor, total_minor, status)
    values (rental, member, lagos + 40, lagos + 41, 1, 1, 0, 1, 0, 0, 1, 1, 'PENDING');
    raise exception 'PROBE_FAIL esc-02: booking on a rental accepted';
  exception when check_violation then null;
  end;

  -- REFUSAL: overlapping dates (checked as another guest, so the per-guest
  -- hold limit is not what refuses it).
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  begin
    insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, adults, children,
      price_per_night_minor, cleaning_fee_minor, service_fee_minor, subtotal_minor, total_minor, status)
    values (stay, admin, lagos + 31, lagos + 33, 2, 1, 0, rate, 0, 0, rate * 2, rate * 2, 'PENDING');
    raise exception 'PROBE_FAIL esc-02: overlap accepted';
  exception when exclusion_violation then null;
  end;
  perform set_config('request.jwt.claims', claims, true);

  -- REFUSAL: host-blocked nights and an unpublished listing (the honest
  -- booking is set aside first so only the rule under test can refuse).
  reset role;
  delete from public.bookings where id = bk;
  insert into public.availability (listing_id, date, status) values (stay, lagos + 50, 'unavailable');
  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  begin
    insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, adults, children,
      price_per_night_minor, cleaning_fee_minor, service_fee_minor, subtotal_minor, total_minor, status)
    values (stay, member, lagos + 49, lagos + 51, 2, 1, 0, rate, 0, 0, rate * 2, rate * 2, 'PENDING');
    raise exception 'PROBE_FAIL esc-02: blocked night accepted';
  exception when exclusion_violation then null;
  end;
  reset role;
  update public.listings set status = 'DRAFT' where id = stay;
  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  begin
    insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, adults, children,
      price_per_night_minor, cleaning_fee_minor, service_fee_minor, subtotal_minor, total_minor, status)
    values (stay, member, lagos + 60, lagos + 61, 1, 1, 0, rate, 0, 0, rate, rate, 'PENDING');
    raise exception 'PROBE_FAIL esc-02: booking on a draft accepted';
  exception when check_violation then null;
  end;
  reset role;
  update public.listings set status = 'PUBLISHED' where id = stay;

  -- CONTROL: the rent charge still opens, priced from the move-in figures.
  insert into public.inspection_requests (listing_id, requester_id, lister_id, state, requested_at, slot_at)
  values (rental, member, lister, 'CONFIRMED', now(), now() + interval '1 day') returning id into insp;
  r := private.open_rent_charge(member, insp, lagos + 7);
  if r->>'status' <> 'ok' or (r->>'total_minor')::bigint <> 150000000 then
    raise exception 'PROBE_FAIL esc-02: rent charge %', r;
  end if;

  -- ESC-P2-01. The guest cannot touch their booking; an admin over the API
  -- can read it but not rewrite it; the owner role cannot change its price;
  -- a status change leaves an audit row.
  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, adults, children,
    price_per_night_minor, cleaning_fee_minor, service_fee_minor, subtotal_minor, total_minor, status)
  values (stay, member, lagos + 30, lagos + 32, 2, 1, 0, rate, 0, 0, rate * 2, rate * 2, 'PENDING')
  returning id into bk;
  update public.bookings set total_minor = 1, status = 'CONFIRMED' where id = bk;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'PROBE_FAIL esc-p2-01: guest updated % rows', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  select count(*) into n from public.bookings where id = bk;
  if n <> 1 then raise exception 'PROBE_FAIL esc-p2-01: admin cannot read the booking'; end if;
  update public.bookings set status = 'CONFIRMED', total_minor = 0, subtotal_minor = 0, price_per_night_minor = 0 where id = bk;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'PROBE_FAIL esc-p2-01: admin rewrote % rows over the API', n; end if;
  update public.bookings set status = 'CONFIRMED' where id = bk;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'PROBE_FAIL esc-p2-01: admin confirmed % rows over the API', n; end if;
  reset role;
  begin
    update public.bookings set total_minor = 0, subtotal_minor = 0, price_per_night_minor = 0 where id = bk;
    raise exception 'PROBE_FAIL esc-p2-01: price rewritten by the owner role';
  exception when insufficient_privilege then null;
  end;
  update public.bookings set status = 'CANCELLED' where id = bk;
  select count(*) into n from public.audit_log
   where entity_type = 'booking' and entity_id = bk::text and action = 'booking.status_changed';
  if n <> 1 then raise exception 'PROBE_FAIL esc-p2-01: % audit rows for a status change', n; end if;

  raise exception 'PROBE_OK esc-02';
end $$;
