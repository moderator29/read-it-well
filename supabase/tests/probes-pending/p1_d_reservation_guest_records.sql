-- P1_D_RESERVATION_GUEST_RECORDS (RESTAURANT-06): a venue sees how many
-- tables a diner kept and missed in the last 12 months, counts only.
-- Needs supabase/migrations/pending/p1_d_reservation_guest_records.sql applied.
--  1. anon cannot call it; authenticated can
--  2. a host reads kept and missed for their own request: past tables at ANY
--     venue count, a table older than 12 months does not, a cancelled one does
--     not, an open dispute does not, a resolved one does
--  3. another venue's request and the host's own table as a guest come back
--     as nothing at all
--  4. signed out is refused; more than 200 ids is refused
-- History rows are in the past, which reservations_validate refuses on insert,
-- so that one trigger is switched off while the fixtures go in and back on
-- before any assertion. Everything is rolled back by the final raise.
do $$
declare
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  host  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  mine uuid; theirs uuid; req uuid; other_req uuid; own_req uuid; open_dispute uuid; closed_dispute uuid;
  k0 int; m0 int; k1 int; m1 int; n int;
begin
  -- 1.
  if has_function_privilege('anon', 'public.reservation_guest_records(uuid[])', 'execute') then
    raise exception 'PROBE_FAIL p1_d 1: anon can call reservation_guest_records';
  end if;
  if not has_function_privilege('authenticated', 'public.reservation_guest_records(uuid[])', 'execute') then
    raise exception 'PROBE_FAIL p1_d 1: authenticated cannot call reservation_guest_records';
  end if;

  insert into public.businesses (owner_id, kind, name, slug, status, source)
  values (host, 'restaurant', 'Probe Record Kitchen', 'probe-record-' || gen_random_uuid(), 'PUBLISHED', 'first_party')
  returning id into mine;
  insert into public.businesses (owner_id, kind, name, slug, status, source)
  values (guest, 'restaurant', 'Probe Elsewhere', 'probe-elsewhere-' || gen_random_uuid(), 'PUBLISHED', 'first_party')
  returning id into theirs;

  alter table public.reservations disable trigger reservations_validate;
  insert into public.reservations (business_id, guest_id, party_size, reserved_for, status)
  values (mine, guest, 4, now() + interval '1 day', 'PENDING') returning id into req;
  insert into public.reservations (business_id, guest_id, party_size, reserved_for, status)
  values (theirs, guest, 2, now() + interval '2 days', 'PENDING') returning id into other_req;
  insert into public.reservations (business_id, guest_id, party_size, reserved_for, status)
  values (mine, host, 2, now() + interval '3 days', 'PENDING') returning id into own_req;

  -- The baseline, before this probe's history: the QA member may have real tables.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', host, 'role', 'authenticated')::text, true);
  select g.kept, g.missed into k0, m0 from public.reservation_guest_records(array[req]) g where g.reservation_id = req;
  reset role;
  if k0 is null then raise exception 'PROBE_FAIL p1_d 2: the host''s own request came back empty'; end if;

  insert into public.reservations (business_id, guest_id, party_size, reserved_for, status) values
    (theirs, guest, 2, now() - interval '10 days', 'COMPLETED'),
    (mine,   guest, 2, now() - interval '3 months', 'COMPLETED'),
    (theirs, guest, 2, now() - interval '20 days', 'NO_SHOW'),
    (theirs, guest, 2, now() - interval '13 months', 'NO_SHOW'),
    (theirs, guest, 2, now() - interval '13 months 1 day', 'COMPLETED'),
    (theirs, guest, 2, now() - interval '7 days', 'CANCELLED');
  insert into public.reservations (business_id, guest_id, party_size, reserved_for, status)
  values (theirs, guest, 2, now() - interval '5 days', 'NO_SHOW') returning id into open_dispute;
  insert into public.reservations (business_id, guest_id, party_size, reserved_for, status)
  values (theirs, guest, 2, now() - interval '6 days', 'NO_SHOW') returning id into closed_dispute;
  alter table public.reservations enable trigger reservations_validate;
  update public.reservation_seatings set disputed_at = now() - interval '4 days' where reservation_id = open_dispute;
  update public.reservation_seatings set disputed_at = now() - interval '5 days', dispute_resolved_at = now() - interval '1 day'
   where reservation_id = closed_dispute;

  -- 2. and 3.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', host, 'role', 'authenticated')::text, true);
  select g.kept, g.missed into k1, m1 from public.reservation_guest_records(array[req]) g where g.reservation_id = req;
  select count(*) into n from public.reservation_guest_records(array[other_req, own_req]);

  -- 4.
  begin
    perform * from public.reservation_guest_records(array(select gen_random_uuid() from generate_series(1, 201)));
    raise exception 'PROBE_FAIL p1_d 4: 201 ids were accepted';
  exception when invalid_parameter_value then null;
  end;
  perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);
  begin
    perform * from public.reservation_guest_records(array[req]);
    raise exception 'PROBE_FAIL p1_d 4: a caller with no user answered';
  exception when insufficient_privilege then null;
  end;
  reset role;

  if k1 - k0 <> 2 or m1 - m0 <> 2 then
    raise exception 'PROBE_FAIL p1_d 2: expected 2 more kept and 2 more missed, got % and %', k1 - k0, m1 - m0;
  end if;
  if n <> 0 then
    raise exception 'PROBE_FAIL p1_d 3: % rows for tables this host does not host as a venue', n;
  end if;

  raise exception 'PROBE_OK p1_d_reservation_guest_records';
end $$;
