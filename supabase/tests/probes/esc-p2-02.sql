-- ESC-P2-02: a paid move-in charge (a one-night booking with a rent_payments
-- row) is not completed by the completion sweep and is not announced as a
-- finished stay. Control: a paid one-night stay in the same state is
-- completed. Rolls back.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  lister constant uuid := 'e0000000-0000-4000-8000-000000000001';
  stay constant uuid := 'ed000000-0000-4000-8000-000000000003';
  home constant uuid := 'ed000000-0000-4000-8000-000000000004';
  lagos date := (now() at time zone 'Africa/Lagos')::date;
  tenancy uuid; night uuid; insp uuid; r jsonb; st text; n int;
begin
  update public.listings set is_demo = false, status = 'PUBLISHED' where id in (stay, home);
  -- Both booked in the past, set aside from the stay pricing trigger.
  alter table public.bookings disable trigger bookings_priced_by_the_listing;
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (home, member, lagos - 3, lagos - 2, 1, 1, 1, 1, 'CONFIRMED') returning id into tenancy;
  insert into public.bookings (listing_id, guest_id, check_in, check_out, nights, price_per_night_minor, subtotal_minor, total_minor, status)
  values (stay, member, lagos - 3, lagos - 2, 1, 1, 1, 1, 'CONFIRMED') returning id into night;
  alter table public.bookings enable trigger bookings_priced_by_the_listing;
  insert into public.inspection_requests (listing_id, requester_id, lister_id, requested_at)
  values (home, member, lister, now()) returning id into insp;
  insert into public.rent_payments (inspection_id, listing_id, tenant_id, lister_id, booking_id, move_in, total_minor)
  values (insp, home, member, lister, tenancy, lagos - 3, 1);
  insert into public.transactions (booking_id, provider, provider_ref, amount_minor, status)
  values (tenancy, 'paystack', 'probe-escp202-tenancy', 1, 'SUCCESSFUL'),
         (night, 'paystack', 'probe-escp202-night', 1, 'SUCCESSFUL');

  -- The announcement first, while the tenancy is the only CONFIRMED booking
  -- that has ended: it must yield no post.
  delete from public.posts where author_kind = 'SYSTEM' and payload ->> 'reason' = 'stay_completed'
     and created_at > now() - interval '7 days';
  update public.bookings set status = 'CANCELLED' where id = night;
  n := private.announce_completed_stays();
  if n <> 0 then raise exception 'PROBE_FAIL esc-p2-02: a move-in was announced as a finished stay (% posts)', n; end if;
  -- Control: the same stay, confirmed, is announced.
  update public.bookings set status = 'CONFIRMED' where id = night;
  n := private.announce_completed_stays();
  if n <> 1 then raise exception 'PROBE_FAIL esc-p2-02: control stay was not announced (% posts)', n; end if;

  r := private.complete_ended_stays(500);
  select status::text into st from public.bookings where id = tenancy;
  if st <> 'CONFIRMED' then raise exception 'PROBE_FAIL esc-p2-02: a tenancy was completed the day after move-in (%)', st; end if;
  select status::text into st from public.bookings where id = night;
  if st <> 'COMPLETED' then raise exception 'PROBE_FAIL esc-p2-02: control stay is %', st; end if;

  raise exception 'PROBE_OK esc-p2-02';
end $$;
