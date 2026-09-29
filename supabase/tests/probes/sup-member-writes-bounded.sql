-- SUP-MEMBER-WRITES-BOUNDED: a member's support writes are stamped and
-- bounded by the database (migrations 20260929013912, 20260929014015). The server stamps a
-- member's ticket times and clears the fields the queue sorts or badges on,
-- rebuilds the linked-record label, caps bodies at 4,000 characters, refuses
-- a message on a resolved ticket, caps a ticket at 40 attachments, and holds
-- a member to 10 tickets and 20 messages an hour. Always rolls back.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  tid uuid;
  tid2 uuid;
  r jsonb;
  n int;
  i int;
  refused boolean;
  t record;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);

  -- CONTROL: the member files a ticket, sending times and labels of their own.
  insert into public.support_tickets (reference, user_id, name, email, body, status,
                                      created_at, updated_at, last_member_reply_at, member_read_at, related_label)
  values ('VAL-SUP-PRB90', member, 'Probe', 'probe@example.invalid', 'Probe ticket', 'open',
          now() + interval '5 years', now() + interval '5 years', now() + interval '5 years',
          now() + interval '5 years', 'Forged label')
  returning id into tid;
  select created_at, updated_at, last_member_reply_at, member_read_at, related_label into t
    from public.support_tickets where id = tid;
  if t.created_at <> now() or t.updated_at <> now() then
    raise exception 'PROBE_FAIL sup-member-writes-bounded: member-chosen times kept';
  end if;
  if t.last_member_reply_at is not null or t.member_read_at is not null or t.related_label is not null then
    raise exception 'PROBE_FAIL sup-member-writes-bounded: queue or badge fields kept';
  end if;

  -- REFUSAL: a body over 4,000 characters.
  begin
    insert into public.support_tickets (reference, user_id, name, email, body, status)
    values ('VAL-SUP-PRB91', member, 'Probe', 'probe@example.invalid', repeat('x', 4001), 'open');
    raise exception 'PROBE_FAIL sup-member-writes-bounded: long ticket body allowed';
  exception when check_violation then null;
  end;
  begin
    insert into public.support_ticket_messages (ticket_id, sender_role, sender_id, body)
    values (tid, 'user', member, repeat('x', 4001));
    raise exception 'PROBE_FAIL sup-member-writes-bounded: long message body allowed';
  exception when check_violation then null;
  end;

  -- The attachment cap: 40 go in, the 41st is refused.
  for i in 1..40 loop
    insert into public.support_ticket_attachments (ticket_id, uploader_id, storage_path, mime_type, size_bytes)
    values (tid, member, member::text || '/' || tid::text || '/p' || i || '.jpg', 'image/jpeg', 100);
  end loop;
  begin
    insert into public.support_ticket_attachments (ticket_id, uploader_id, storage_path, mime_type, size_bytes)
    values (tid, member, member::text || '/' || tid::text || '/p41.jpg', 'image/jpeg', 100);
    raise exception 'PROBE_FAIL sup-member-writes-bounded: 41st attachment allowed';
  exception when insufficient_privilege then null;
  end;

  -- REFUSAL: a message on a resolved ticket.
  insert into public.support_tickets (reference, user_id, name, email, body, status)
  values ('VAL-SUP-PRB92', member, 'Probe', 'probe@example.invalid', 'Probe two', 'open') returning id into tid2;
  r := public.support_ticket_member_resolve(tid2);
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL sup-member-writes-bounded: resolve %', r; end if;
  begin
    insert into public.support_ticket_messages (ticket_id, sender_role, sender_id, body)
    values (tid2, 'user', member, 'Anyone there?');
    raise exception 'PROBE_FAIL sup-member-writes-bounded: message on a resolved ticket allowed';
  exception when insufficient_privilege then null;
  end;

  -- The message rate: at most 20 in an hour, then refused.
  refused := false;
  n := 0;
  for i in 1..25 loop
    begin
      insert into public.support_ticket_messages (ticket_id, sender_role, sender_id, body)
      values (tid, 'user', member, 'Probe message ' || i);
      n := n + 1;
    exception when raise_exception then
      refused := true;
      exit;
    end;
  end loop;
  if not refused or n > 20 then
    raise exception 'PROBE_FAIL sup-member-writes-bounded: message rate let % through', n;
  end if;

  -- The ticket rate: at most 10 in an hour (two are already filed above).
  refused := false;
  n := 2;
  for i in 1..15 loop
    begin
      insert into public.support_tickets (reference, user_id, name, email, body, status)
      values ('VAL-SUP-PR' || lpad(i::text, 3, '0'), member, 'Probe', 'probe@example.invalid', 'Probe', 'open');
      n := n + 1;
    exception when raise_exception then
      refused := true;
      exit;
    end;
  end loop;
  if not refused or n > 10 then
    raise exception 'PROBE_FAIL sup-member-writes-bounded: ticket rate let % through', n;
  end if;

  raise exception 'PROBE_OK sup-member-writes-bounded';
end $$;
