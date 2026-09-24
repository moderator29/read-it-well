-- DB-07: a reservation is the venue's to answer, and the guest's to call off
-- while the table is still ahead.
--   Insert: PENDING, created now, no thread, whatever the guest sends.
--   Guest: cannot confirm, resize or stamp an answer; edits their note;
--     cancels a pending request at any time and a confirmed table only while
--     it is ahead; attaches only the reservation's own thread, once.
--   Venue: confirms and cancels; marks a table completed or not arrived only
--     once its time has passed (and the guest is told of a no-show); cannot
--     rewrite the guest's note.
--   A venue owner booking at their own venue is the guest for that table.
--   The service role passes.
do $$
declare
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  host uuid := gen_random_uuid();
  biz uuid;
  at timestamptz := date_trunc('day', now() at time zone 'Africa/Lagos') + interval '2 days 19 hours';
  r1 uuid; r2 uuid; r3 uuid; r4 uuid; r5 uuid;
  own_thread uuid; other_thread uuid;
  n int; st text; ts timestamptz;
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

  -- Insert.
  begin
    insert into public.reservations (business_id, guest_id, party_size, reserved_for, status)
    values (biz, guest, 2, at, 'CONFIRMED');
    raise exception 'PROBE_FAIL db-07: a guest created a confirmed reservation';
  exception when insufficient_privilege then null; end;
  insert into public.reservations (business_id, guest_id, party_size, reserved_for, note, created_at)
  values (biz, guest, 2, at, 'Window seat please', now() - interval '30 days') returning id, created_at into r1, ts;
  if ts < now() - interval '1 minute' then raise exception 'PROBE_FAIL db-07: a guest back-dated a request to %', ts; end if;
  insert into public.reservations (business_id, guest_id, party_size, reserved_for)
  values (biz, guest, 3, at + interval '30 minutes') returning id into r2;
  insert into public.reservations (business_id, guest_id, party_size, reserved_for)
  values (biz, guest, 2, at + interval '60 minutes') returning id into r3;
  insert into public.reservations (business_id, guest_id, party_size, reserved_for)
  values (biz, guest, 2, at + interval '90 minutes') returning id into r4;

  -- The guest cannot answer for the venue, resize, or stamp an answer.
  begin
    update public.reservations set status = 'CONFIRMED', responded_at = now() where id = r1;
    raise exception 'PROBE_FAIL db-07: a guest confirmed their own table';
  exception when insufficient_privilege then null; end;
  begin
    update public.reservations set party_size = 12 where id = r1;
    raise exception 'PROBE_FAIL db-07: a guest changed the party';
  exception when insufficient_privilege then null; end;
  begin
    update public.reservations set responded_at = now() where id = r1;
    raise exception 'PROBE_FAIL db-07: a guest stamped their request as answered';
  exception when insufficient_privilege then null; end;
  update public.reservations set note = 'Window seat, one high chair' where id = r1;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-07: guest note edit rows=%', n; end if;

  -- Threads: only the reservation's own, once.
  reset role;
  insert into public.conversations (guest_id, agent_id, context_kind, reservation_id)
  values (guest, host, 'reservation', r1) returning id into own_thread;
  insert into public.conversations (guest_id, agent_id, context_kind, reservation_id)
  values (guest, host, 'reservation', r2) returning id into other_thread;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  begin
    update public.reservations set conversation_id = other_thread where id = r1;
    raise exception 'PROBE_FAIL db-07: another table''s thread was attached';
  exception when insufficient_privilege then null; end;
  update public.reservations set conversation_id = own_thread where id = r1;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-07: own thread attach rows=%', n; end if;

  -- The venue answers.
  perform set_config('request.jwt.claims', json_build_object('sub', host, 'role', 'authenticated')::text, true);
  update public.reservations set status = 'CONFIRMED', responded_at = now() where id in (r1, r2, r3) and status = 'PENDING';
  get diagnostics n = row_count;
  if n <> 3 then raise exception 'PROBE_FAIL db-07: venue confirm rows=%', n; end if;
  begin
    update public.reservations set note = 'Rewritten by the venue' where id = r1;
    raise exception 'PROBE_FAIL db-07: the venue rewrote the guest note';
  exception when insufficient_privilege then null; end;
  begin
    update public.reservations set status = 'NO_SHOW' where id = r2;
    raise exception 'PROBE_FAIL db-07: the venue marked a future table as not arrived';
  exception when insufficient_privilege then null; end;

  -- Time passes for r2, r3 and r4.
  reset role;
  alter table public.reservations disable trigger reservations_validate;
  update public.reservations set reserved_for = now() - interval '3 hours' where id = r2;
  update public.reservations set reserved_for = now() - interval '4 hours' where id = r3;
  update public.reservations set reserved_for = now() - interval '5 hours' where id = r4;
  alter table public.reservations enable trigger reservations_validate;
  set local role authenticated;

  perform set_config('request.jwt.claims', json_build_object('sub', host, 'role', 'authenticated')::text, true);
  update public.reservations set status = 'NO_SHOW' where id = r2;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-07: venue no-show after the time rows=%', n; end if;
  reset role;
  select count(*) into n from public.notifications
   where user_id = guest and title = 'Marked as not arriving' and created_at >= now() - interval '1 minute';
  if n < 1 then raise exception 'PROBE_FAIL db-07: the guest was not told of the no-show'; end if;
  set local role authenticated;

  -- The guest calls off what is still ahead, never what has passed.
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  begin
    update public.reservations set status = 'CANCELLED', responded_at = now() where id = r3;
    raise exception 'PROBE_FAIL db-07: a guest cancelled a confirmed table after it happened';
  exception when insufficient_privilege then null; end;
  update public.reservations set status = 'CANCELLED', responded_at = now() where id = r4;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-07: guest cancel of a past unanswered request rows=%', n; end if;
  update public.reservations set status = 'CANCELLED', responded_at = now() where id = r1;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-07: guest cancel of a table ahead rows=%', n; end if;

  -- The venue owner booking their own venue is the guest for that table.
  perform set_config('request.jwt.claims', json_build_object('sub', host, 'role', 'authenticated')::text, true);
  insert into public.reservations (business_id, guest_id, party_size, reserved_for)
  values (biz, host, 2, at + interval '2 hours') returning id into r5;
  begin
    update public.reservations set status = 'CONFIRMED', responded_at = now() where id = r5;
    raise exception 'PROBE_FAIL db-07: the booker answered their own reservation';
  exception when insufficient_privilege then null; end;
  update public.reservations set note = 'My own note' where id = r5;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-07: owner-guest note edit rows=%', n; end if;

  -- The service role (the admin console's client) passes.
  reset role;
  set local role service_role;
  update public.reservations set status = 'CONFIRMED', responded_at = now() where id = r5;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-07: service role rows=%', n; end if;
  reset role;

  raise exception 'PROBE_OK db-07';
end
$$;
