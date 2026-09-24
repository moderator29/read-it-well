-- DB-16: deleting a person, or a table reservation or venue that has a
-- conversation, does not take the other party's history with it; the delete
-- is refused (23503). A person with no history, and a reservation with no
-- thread, are still deleted (controls).
do $$
declare
  guest constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  lone uuid := gen_random_uuid();
  host uuid := gen_random_uuid();
  lister uuid := gen_random_uuid();
  biz uuid;
  at timestamptz := date_trunc('day', now() at time zone 'Africa/Lagos') + interval '2 days 19 hours';
  threaded uuid;
  bare uuid;
  convo uuid;
  n int;
  con text;
begin
  at := (at::timestamp) at time zone 'Africa/Lagos';
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (lone, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-db16-lone@example.invalid', '{}', '{}', now(), now()),
         (host, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-db16-host@example.invalid', '{}', '{}', now(), now()),
         (lister, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-db16-lister@example.invalid', '{}', '{}', now(), now());
  insert into public.businesses (owner_id, kind, name, slug, status, source)
  values (host, 'restaurant', 'Probe DB-16 kitchen', 'probe-db16-' || gen_random_uuid(), 'PUBLISHED', 'first_party')
  returning id into biz;
  insert into public.service_windows (business_id, weekday, opens, last_seating, closes, covers)
  values (biz, extract(dow from at at time zone 'Africa/Lagos')::smallint, '12:00', '21:00', '22:00', 40);
  insert into public.reservations (business_id, guest_id, party_size, reserved_for)
  values (biz, guest, 2, at) returning id into threaded;
  insert into public.reservations (business_id, guest_id, party_size, reserved_for)
  values (biz, guest, 2, at + interval '30 minutes') returning id into bare;
  insert into public.conversations (guest_id, agent_id, context_kind, reservation_id)
  values (guest, host, 'reservation', threaded) returning id into convo;
  insert into public.messages (conversation_id, sender_id, body) values (convo, guest, 'Probe DB-16: the guest wrote this.');
  insert into public.agents (user_id, display_name) values (lister, 'Probe DB-16 lister');

  -- Controls: nothing on record, so the deletes go through.
  delete from auth.users where id = lone;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-16: control person delete rows=%', n; end if;
  delete from public.reservations where id = bare;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-16: control reservation delete rows=%', n; end if;

  -- A reservation with a thread is kept, and so is its venue.
  begin
    delete from public.reservations where id = threaded;
    raise exception 'PROBE_FAIL db-16: a reservation was deleted out from under its thread';
  exception when foreign_key_violation then
    get stacked diagnostics con = constraint_name;
    if con <> 'conversations_reservation_id_fkey' then raise exception 'PROBE_FAIL db-16: refused by % instead', con; end if;
  end;
  begin
    delete from public.businesses where id = biz;
    raise exception 'PROBE_FAIL db-16: a venue was deleted with its guests'' threads';
  exception when foreign_key_violation then null; end;

  -- A person with a thread, a message or an agents row is kept.
  begin
    delete from auth.users where id = host;
    raise exception 'PROBE_FAIL db-16: the venue owner was deleted with the guest''s thread';
  exception when foreign_key_violation then null; end;
  begin
    delete from auth.users where id = lister;
    raise exception 'PROBE_FAIL db-16: a lister was deleted with their agents row';
  exception when foreign_key_violation then null; end;

  select count(*) into n from public.messages where conversation_id = convo;
  if n <> 1 then raise exception 'PROBE_FAIL db-16: the guest lost their message'; end if;

  raise exception 'PROBE_OK db-16';
end
$$;
