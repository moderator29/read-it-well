-- SUP-TICKETS-MEMBER: a member resolves, reopens, rates and reads only their
-- own support ticket, through the narrow functions and never a direct UPDATE;
-- cannot file a ticket pre-rated or linked to a record that is not theirs;
-- cannot forge a staff name; and attaches only under their own folder on their
-- own open ticket. Staff replies carry the staff first name, staff can read
-- the attachment rows, and another member sees and changes nothing.
-- Migrations 20260929000412 and 20260929000849. Always rolls back.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  other  constant uuid := 'e0000000-0000-4000-8000-000000000001';
  tid uuid;
  r jsonb;
  n int;
  s text;
begin
  -- 29 September: the console's second factor. An admin or a staff member
  -- holds their role only on a session that proved a security key, so this
  -- probe's session carries one for every admin and for the QA member (who
  -- some probes make staff), rolled back with everything else.
  insert into public.console_step_ups (user_id, session_id, expires_at)
  select u, '00000000-0000-4000-8000-00000000c0de', now() + interval '1 hour'
    from (select user_id from public.user_roles where role in ('admin', 'super_admin')
          union select '03f3dd52-ea28-4852-9abe-e5b0a67c2a43'::uuid
          union select '957b3bd2-cce3-425d-bba9-5cd876ca3d62'::uuid) s(u)
  on conflict (user_id, session_id) do update set expires_at = excluded.expires_at;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);

  -- CONTROL: the member files their own plain ticket.
  insert into public.support_tickets (reference, user_id, name, email, topic, body, status, kind)
  values ('VAL-SUP-PRB01', member, 'Probe', 'probe@example.invalid', 'account', 'Probe ticket', 'open', 'problem')
  returning id into tid;

  -- The filed notification reached the member.
  select count(*) into n from public.notifications where user_id = member and href = '/support/messages/' || tid::text;
  if n <> 1 then raise exception 'PROBE_FAIL sup-tickets-member: filed notification count %', n; end if;

  -- REFUSAL: a ticket filed already rated.
  begin
    insert into public.support_tickets (reference, user_id, name, email, body, status, rating)
    values ('VAL-SUP-PRB02', member, 'Probe', 'probe@example.invalid', 'Probe', 'open', 5);
    raise exception 'PROBE_FAIL sup-tickets-member: pre-rated insert allowed';
  exception when insufficient_privilege then null;
  end;

  -- REFUSAL: a ticket linked to a booking that is not the member's.
  begin
    insert into public.support_tickets (reference, user_id, name, email, body, status, related_kind, related_id)
    values ('VAL-SUP-PRB03', member, 'Probe', 'probe@example.invalid', 'Probe', 'open', 'booking', gen_random_uuid());
    raise exception 'PROBE_FAIL sup-tickets-member: foreign link allowed';
  exception when insufficient_privilege then null;
  end;

  -- REFUSAL: a direct UPDATE touches no row.
  update public.support_tickets set rating = 5, status = 'resolved' where id = tid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'PROBE_FAIL sup-tickets-member: direct update changed % rows', n; end if;

  -- Rating an open ticket is refused; resolving works and stamps resolved_at.
  r := public.support_ticket_member_rate(tid, 5, null);
  if r->>'status' <> 'not_resolved' then raise exception 'PROBE_FAIL sup-tickets-member: rate open %', r; end if;
  r := public.support_ticket_member_resolve(tid);
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL sup-tickets-member: resolve %', r; end if;
  select count(*) into n from public.support_tickets where id = tid and status = 'resolved' and resolved_at is not null;
  if n <> 1 then raise exception 'PROBE_FAIL sup-tickets-member: resolved_at not stamped'; end if;

  r := public.support_ticket_member_rate(tid, 9, null);
  if r->>'status' <> 'bad_rating' then raise exception 'PROBE_FAIL sup-tickets-member: rating 9 %', r; end if;
  r := public.support_ticket_member_rate(tid, 4, 'Quick and clear');
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL sup-tickets-member: rate %', r; end if;

  -- Reopen within the window clears the rating and resolved_at.
  r := public.support_ticket_member_reopen(tid);
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL sup-tickets-member: reopen %', r; end if;
  select status::text || '/' || coalesce(rating::text, '-') || '/' || coalesce(resolved_at::text, '-') into s
    from public.support_tickets where id = tid;
  if s <> 'open/-/-' then raise exception 'PROBE_FAIL sup-tickets-member: after reopen %', s; end if;

  r := public.support_ticket_member_mark_read(tid);
  if r->>'status' <> 'ok' then raise exception 'PROBE_FAIL sup-tickets-member: mark read %', r; end if;

  -- A member cannot forge a staff name on their own message.
  insert into public.support_ticket_messages (ticket_id, sender_role, sender_id, body, staff_name)
  values (tid, 'user', member, 'Probe reply', 'Forged');
  select count(*) into n from public.support_ticket_messages where ticket_id = tid and staff_name is not null;
  if n <> 0 then raise exception 'PROBE_FAIL sup-tickets-member: staff_name forged'; end if;

  -- CONTROL: an attachment row under the member's own folder for this ticket.
  insert into public.support_ticket_attachments (ticket_id, uploader_id, storage_path, mime_type, size_bytes)
  values (tid, member, member::text || '/' || tid::text || '/probe.jpg', 'image/jpeg', 100);

  -- CONTROL: the object itself under <member>/<ticket>/, then the refusals:
  -- a folder with no ticket of theirs, and somebody else's folder.
  insert into storage.objects (bucket_id, name, owner_id)
  values ('support-attachments', member::text || '/' || tid::text || '/probe.jpg', member::text);
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values ('support-attachments', member::text || '/' || gen_random_uuid()::text || '/probe.jpg', member::text);
    raise exception 'PROBE_FAIL sup-tickets-member: upload to a folder with no ticket allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values ('support-attachments', other::text || '/' || tid::text || '/probe.jpg', member::text);
    raise exception 'PROBE_FAIL sup-tickets-member: upload to another folder allowed';
  exception when insufficient_privilege then null;
  end;

  -- REFUSAL: an attachment path in somebody else's folder.
  begin
    insert into public.support_ticket_attachments (ticket_id, uploader_id, storage_path, mime_type, size_bytes)
    values (tid, member, other::text || '/' || tid::text || '/probe2.jpg', 'image/jpeg', 100);
    raise exception 'PROBE_FAIL sup-tickets-member: foreign attachment path allowed';
  exception when insufficient_privilege then null;
  end;

  -- Another member sees nothing and changes nothing.
  perform set_config('request.jwt.claims', json_build_object('sub', other, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  select count(*) into n from public.support_tickets where id = tid;
  if n <> 0 then raise exception 'PROBE_FAIL sup-tickets-member: other member reads the ticket'; end if;
  select count(*) into n from public.support_ticket_attachments where ticket_id = tid;
  if n <> 0 then raise exception 'PROBE_FAIL sup-tickets-member: other member reads the attachments'; end if;
  select count(*) into n from storage.objects where bucket_id = 'support-attachments' and name like member::text || '/%';
  if n <> 0 then raise exception 'PROBE_FAIL sup-tickets-member: other member reads the objects'; end if;
  r := public.support_ticket_member_resolve(tid);
  if r->>'status' <> 'not_found' then raise exception 'PROBE_FAIL sup-tickets-member: other resolves %', r; end if;
  r := public.support_ticket_member_mark_read(tid);
  if r->>'status' <> 'not_found' then raise exception 'PROBE_FAIL sup-tickets-member: other marks read %', r; end if;
  begin
    insert into public.support_ticket_attachments (ticket_id, uploader_id, storage_path, mime_type, size_bytes)
    values (tid, other, other::text || '/' || tid::text || '/probe3.jpg', 'image/jpeg', 100);
    raise exception 'PROBE_FAIL sup-tickets-member: other member attaches';
  exception when insufficient_privilege then null;
  end;

  -- Staff: a reply carries a staff name when the profile has one, and the
  -- attachment rows are readable.
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  insert into public.support_ticket_messages (ticket_id, sender_role, sender_id, body)
  values (tid, 'admin', admin, 'Probe staff reply');
  select count(*) into n from public.support_ticket_attachments where ticket_id = tid;
  if n <> 1 then raise exception 'PROBE_FAIL sup-tickets-member: staff reads % attachments', n; end if;
  select count(*) into n from storage.objects where bucket_id = 'support-attachments' and name = member::text || '/' || tid::text || '/probe.jpg';
  if n <> 1 then raise exception 'PROBE_FAIL sup-tickets-member: staff cannot read the object'; end if;

  -- anon holds nothing on the attachments or the member functions.
  if has_table_privilege('anon', 'public.support_ticket_attachments', 'select')
     or has_function_privilege('anon', 'public.support_ticket_member_resolve(uuid)', 'execute') then
    raise exception 'PROBE_FAIL sup-tickets-member: anon holds a grant';
  end if;

  raise exception 'PROBE_OK sup-tickets-member';
end $$;
