-- DB-16: deleting a person does not take the other party's history with it.
-- A user who is in a conversation, has sent a message, filed a report or holds
-- an agents row cannot be deleted (23503); a user with none of that can
-- (control). A deleted booking or reservation leaves its thread in place.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  lone uuid := gen_random_uuid();
  talker uuid := gen_random_uuid();
  lister uuid := gen_random_uuid();
  convo uuid;
  n int;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (lone, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-db16-lone@example.invalid', '{}', '{}', now(), now()),
         (talker, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-db16-talker@example.invalid', '{}', '{}', now(), now()),
         (lister, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-db16-lister@example.invalid', '{}', '{}', now(), now());

  insert into public.conversations (guest_id, agent_id) values (talker, member) returning id into convo;
  insert into public.messages (conversation_id, sender_id, body) values (convo, member, 'Probe DB-16: the other party wrote this.');
  insert into public.agents (user_id, display_name) values (lister, 'Probe DB-16 lister');

  -- Control: a person with no history is deleted.
  delete from auth.users where id = lone;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-16: control delete rows=%', n; end if;

  begin
    delete from auth.users where id = talker;
    raise exception 'PROBE_FAIL db-16: a user in a conversation was deleted with its thread';
  exception when foreign_key_violation then null; end;
  begin
    delete from auth.users where id = lister;
    raise exception 'PROBE_FAIL db-16: a lister was deleted with their agents row';
  exception when foreign_key_violation then null; end;
  select count(*) into n from public.messages where conversation_id = convo;
  if n <> 1 then raise exception 'PROBE_FAIL db-16: the other party lost % messages', 1 - n; end if;

  select count(*) into n from pg_constraint
   where conname in ('conversations_booking_id_fkey', 'conversations_reservation_id_fkey') and confdeltype = 'n';
  if n <> 2 then raise exception 'PROBE_FAIL db-16: a deleted booking or reservation still takes its thread'; end if;
  select count(*) into n from pg_constraint
   where conname in ('conversations_guest_id_fkey', 'conversations_agent_id_fkey', 'messages_sender_id_fkey',
                     'reports_reporter_id_fkey', 'agents_user_id_fkey') and confdeltype = 'r';
  if n <> 5 then raise exception 'PROBE_FAIL db-16: only % of 5 person keys refuse the delete', n; end if;

  raise exception 'PROBE_OK db-16';
end
$$;
