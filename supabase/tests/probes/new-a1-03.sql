-- NEW-A1-03: a stay the nightly job has recorded as COMPLETED is still a stay
-- that happened. Its guest can review it, it counts as one of the agent's
-- completed deals, and it earns the stay badges. A tenancy (a booking with a
-- rent_payments row) is not a stay: it is never reviewed as one and never
-- earns a stay badge. Controls: a CONFIRMED stay with a past check-out is
-- still reviewable and counted; a stay not finished, a cancelled one and a
-- no-show are refused. Both hold without the reviewer's own read of
-- rent_payments. Rolls back.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';   -- guest
  admin  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';   -- a tenant, here
  lister constant uuid := 'e0000000-0000-4000-8000-000000000001';
  stay   constant uuid := 'ed000000-0000-4000-8000-000000000003';
  stay2  constant uuid := 'ed000000-0000-4000-8000-000000000018';
  home   constant uuid := 'ed000000-0000-4000-8000-000000000004';
  lagos date := (now() at time zone 'Africa/Lagos')::date;
  done_bk uuid; open_bk uuid; ahead_bk uuid; gone_bk uuid; noshow_bk uuid; rent_bk uuid; insp uuid;
  deals_before int; deals_after int; n int; i int; refused text;
begin
  -- SCUML item 17 (live 29 Sep): an agent listing goes live only on an
  -- approved mandate. The fixture files one as the platform would.
  insert into public.listing_mandates (listing_id, kind, principal_name, review_status, reviewed_by, reviewed_at,
         principal_relationship, principal_verified_how, principal_verified_by, principal_verified_at)
  select id, 'letting', 'Probe Principal', 'approved', '03f3dd52-ea28-4852-9abe-e5b0a67c2a43', now(),
         'owner', 'call_back', '03f3dd52-ea28-4852-9abe-e5b0a67c2a43', now()
    from public.listings where id in (stay, stay2, home) and listing_role <> 'owner'
     and not private.listing_has_live_mandate(id);
  update public.listings set is_demo = false, status = 'PUBLISHED' where id in (stay, stay2, home);
  update public.agents set is_demo = false where user_id = lister;
  delete from public.user_badges where user_id in (member, admin, lister) and badge_code in ('first_stay', 'ten_stays');
  select completed_deals into deals_before from public.agent_trust(lister);

  -- Past stays are written with the pricing trigger set aside, as the sweep
  -- would find them.
  alter table public.bookings disable trigger bookings_priced_by_the_listing;
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (stay, member, lagos - 40, lagos - 38, 2, 1, 2, 2, 'CONFIRMED') returning id into done_bk;
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (stay, member, lagos - 36, lagos - 34, 2, 1, 2, 2, 'CONFIRMED') returning id into open_bk;
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (stay2, member, lagos, lagos + 2, 2, 1, 2, 2, 'CONFIRMED') returning id into ahead_bk;
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (stay, member, lagos - 32, lagos - 30, 2, 1, 2, 2, 'CANCELLED') returning id into gone_bk;
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (stay, member, lagos - 28, lagos - 26, 2, 1, 2, 2, 'NO_SHOW') returning id into noshow_bk;
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (home, admin, lagos - 24, lagos - 23, 1, 1, 1, 1, 'CONFIRMED') returning id into rent_bk;
  -- Nine more finished stays at the lister's listing, for ten_stays.
  for i in 1..9 loop
    insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
    values (stay2, member, lagos - 100 + i * 3, lagos - 99 + i * 3, 1, 1, 1, 1, 'CONFIRMED');
  end loop;
  alter table public.bookings enable trigger bookings_priced_by_the_listing;
  insert into public.inspection_requests (listing_id, requester_id, lister_id, requested_at)
  values (home, admin, lister, now()) returning id into insp;
  insert into public.rent_payments (inspection_id, listing_id, tenant_id, lister_id, booking_id, move_in, total_minor)
  values (insp, home, admin, lister, rent_bk, lagos - 24, 1);

  -- What the nightly job does the morning after check-out.
  update public.bookings set status = 'COMPLETED'
   where guest_id = member and status = 'CONFIRMED' and check_out < lagos and id <> open_bk;

  -- Trust: every finished stay is a completed deal, COMPLETED or not.
  select completed_deals into deals_after from public.agent_trust(lister);
  if deals_after - deals_before < 11 then
    raise exception 'PROBE_FAIL new-a1-03: agent_trust counted % of 11 finished stays', deals_after - deals_before;
  end if;

  -- Badges: first_stay for the guest and ten_stays for the lister, from
  -- COMPLETED stays; nothing from a tenancy.
  perform private.sweep_badges();
  if not exists (select 1 from public.user_badges where user_id = member and badge_code = 'first_stay') then
    raise exception 'PROBE_FAIL new-a1-03: a completed stay earned no first_stay badge';
  end if;
  if not exists (select 1 from public.user_badges where user_id = lister and badge_code = 'ten_stays') then
    raise exception 'PROBE_FAIL new-a1-03: ten completed stays earned no ten_stays badge';
  end if;
  if exists (select 1 from public.user_badges where user_id = admin and badge_code = 'first_stay') then
    raise exception 'PROBE_FAIL new-a1-03: a tenancy earned a first_stay badge';
  end if;

  -- The review rule does not rest on the reviewer's own read of
  -- rent_payments: with that read taken away (no grant, no tenant policy), a
  -- stay is still reviewable and a tenancy still is not.
  if to_regprocedure('private.booking_is_tenancy(uuid)') is null
     or not has_function_privilege('authenticated', 'private.booking_is_tenancy(uuid)', 'EXECUTE') then
    raise exception 'PROBE_FAIL new-a1-03: reviews_insert_own cannot ask whether a booking is a tenancy';
  end if;
  revoke select on public.rent_payments from authenticated;
  drop policy rent_payments_select_tenant on public.rent_payments;

  -- Reviews, as the guest through the API role.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  insert into public.reviews (listing_id, booking_id, author_id, rating, body)
  values (stay, done_bk, member, 5, null);
  insert into public.reviews (listing_id, booking_id, author_id, rating, body)
  values (stay, open_bk, member, 4, null);
  refused := null;
  begin
    insert into public.reviews (listing_id, booking_id, author_id, rating, body) values (stay2, ahead_bk, member, 5, null);
  exception when insufficient_privilege then refused := 'ahead'; end;
  if refused is null then raise exception 'PROBE_FAIL new-a1-03: a stay not yet finished was reviewed'; end if;
  refused := null;
  begin
    insert into public.reviews (listing_id, booking_id, author_id, rating, body) values (stay, gone_bk, member, 5, null);
  exception when insufficient_privilege then refused := 'cancelled'; end;
  if refused is null then raise exception 'PROBE_FAIL new-a1-03: a cancelled stay was reviewed'; end if;
  refused := null;
  begin
    insert into public.reviews (listing_id, booking_id, author_id, rating, body) values (stay, noshow_bk, member, 5, null);
  exception when insufficient_privilege then refused := 'no_show'; end;
  if refused is null then raise exception 'PROBE_FAIL new-a1-03: a no-show was reviewed'; end if;
  reset role;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  refused := null;
  begin
    insert into public.reviews (listing_id, booking_id, author_id, rating, body) values (home, rent_bk, admin, 5, null);
  exception when insufficient_privilege then refused := 'tenancy'; end;
  if refused is null then raise exception 'PROBE_FAIL new-a1-03: a tenancy was reviewed as a stay'; end if;
  reset role;

  select count(*) into n from public.reviews where booking_id in (done_bk, open_bk);
  if n <> 2 then raise exception 'PROBE_FAIL new-a1-03: % of 2 reviews stored', n; end if;

  raise exception 'PROBE_OK new-a1-03';
end
$$;
