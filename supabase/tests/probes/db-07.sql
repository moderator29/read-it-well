-- DB-07: a reservation is the venue's to answer. A guest's new reservation
-- starts PENDING; the guest cannot confirm it, change the party or the time,
-- or cancel one that is over; the guest can cancel a pending or confirmed
-- table and edit their note. The venue confirms, completes and cancels, and
-- cannot rewrite the guest's note or reopen a finished table. The service
-- role passes.
do $$
declare
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  host uuid := gen_random_uuid();
  biz uuid;
  at timestamptz := date_trunc('day', now() at time zone 'Africa/Lagos') + interval '2 days 19 hours';
  r1 uuid;
  r2 uuid;
  n int;
  st text;
begin
  at := (at::timestamp) at time zone 'Africa/Lagos';
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (host, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-db07-host@example.invalid', '{}', '{}', now(), now());
  insert into public.businesses (owner_id, kind, name, slug, status, source)
  values (host, 'restaurant', 'Probe DB-07 kitchen', 'probe-db07-' || gen_random_uuid(), 'PUBLISHED', 'first_party')
  returning id into biz;
  insert into public.service_windows (business_id, weekday, opens, last_seating, closes, covers)
  values (biz, extract(dow from at at time zone 'Africa/Lagos')::smallint, '12:00', '21:00', '22:00', 40);

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);

  -- A new reservation is PENDING; one born confirmed is refused.
  begin
    insert into public.reservations (business_id, guest_id, party_size, reserved_for, status)
    values (biz, guest, 2, at, 'CONFIRMED');
    raise exception 'PROBE_FAIL db-07: a guest created a confirmed reservation';
  exception when insufficient_privilege then null; end;
  insert into public.reservations (business_id, guest_id, party_size, reserved_for, note)
  values (biz, guest, 2, at, 'Window seat please') returning id into r1;
  insert into public.reservations (business_id, guest_id, party_size, reserved_for)
  values (biz, guest, 3, at + interval '30 minutes') returning id into r2;

  -- The guest cannot answer for the venue, or move the party or the time.
  begin
    update public.reservations set status = 'CONFIRMED', responded_at = now() where id = r1;
    raise exception 'PROBE_FAIL db-07: a guest confirmed their own table';
  exception when insufficient_privilege then null; end;
  begin
    update public.reservations set party_size = 12 where id = r1;
    raise exception 'PROBE_FAIL db-07: a guest changed the party';
  exception when insufficient_privilege then null; end;
  update public.reservations set note = 'Window seat, one high chair' where id = r1;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-07: guest note edit rows=%', n; end if;

  -- The venue answers.
  perform set_config('request.jwt.claims', json_build_object('sub', host, 'role', 'authenticated')::text, true);
  update public.reservations set status = 'CONFIRMED', responded_at = now() where id in (r1, r2) and status = 'PENDING';
  get diagnostics n = row_count;
  if n <> 2 then raise exception 'PROBE_FAIL db-07: venue confirm rows=%', n; end if;
  begin
    update public.reservations set note = 'Rewritten by the venue' where id = r1;
    raise exception 'PROBE_FAIL db-07: the venue rewrote the guest note';
  exception when insufficient_privilege then null; end;
  update public.reservations set status = 'COMPLETED' where id = r2;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-07: venue complete rows=%', n; end if;
  begin
    update public.reservations set status = 'PENDING' where id = r2;
    raise exception 'PROBE_FAIL db-07: the venue reopened a finished table';
  exception when insufficient_privilege then null; end;

  -- The guest cancels a confirmed table, never a finished one.
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  update public.reservations set status = 'CANCELLED', responded_at = now() where id = r1;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-07: guest cancel rows=%', n; end if;
  begin
    update public.reservations set status = 'CANCELLED', responded_at = now() where id = r2;
    raise exception 'PROBE_FAIL db-07: a guest cancelled a completed table';
  exception when insufficient_privilege then null; end;

  -- The service role (the admin console's client) passes.
  reset role;
  set local role service_role;
  update public.reservations set status = 'NO_SHOW' where id = r2;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-07: service role rows=%', n; end if;
  reset role;
  select status::text into st from public.reservations where id = r2;
  if st <> 'NO_SHOW' then raise exception 'PROBE_FAIL db-07: service role left %', st; end if;

  raise exception 'PROBE_OK db-07';
end
$$;
