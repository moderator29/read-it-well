-- SEC-15: staff-assisted email recovery. A member and an admin cannot open
-- one; a super admin can, only with the NIN on an approved identity on file,
-- never for their own account, and cannot complete it inside the 72 hour
-- cooling-off; every step writes audit_log; members read nothing. The auth
-- row change itself is the server's (service role) and is not exercised here.
-- Rolls back always.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  superu uuid;
  req    uuid;
  req2   uuid;
  n      int;
  st     text;
  refused boolean;
begin
  select r.user_id into superu from public.user_roles r where r.role = 'super_admin' limit 1;
  if superu is null then raise exception 'PROBE_FAIL sec-15: no super admin to run the control as'; end if;

  -- An approved identity on file for the member, inside this transaction only.
  insert into public.agent_applications (user_id, reference, type, status, full_name, phone, email, id_type, id_number, agree_terms, reviewed_at)
  values (member, 'PROBE-SEC15', 'individual', 'APPROVED', 'Probe Member', '08000000000', 'probe@example.invalid', 'nin', '123 4567 8901', true, now());

  set local role authenticated;

  -- A member cannot open one, not even for themselves.
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  refused := false;
  begin
    perform public.admin_open_email_recovery(member, 'new.probe@example.invalid', '12345678901', 'ticket PROBE-1');
  exception when sqlstate '42501' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: a member opened a recovery'; end if;

  -- Nor can a member write the table directly, or read it.
  refused := false;
  begin
    insert into public.email_recovery_requests (user_id, old_email, new_email, identity_source, evidence_ref, opened_by, eligible_at)
    values (member, 'a@example.invalid', 'b@example.invalid', 'x', 'ticket PROBE-1', member, now());
  exception when sqlstate '42501' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: a member wrote a recovery row'; end if;

  -- An admin (not super) cannot open one.
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  refused := false;
  begin
    perform public.admin_open_email_recovery(member, 'new.probe@example.invalid', '12345678901', 'ticket PROBE-1');
  exception when sqlstate '42501' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: an admin opened a recovery'; end if;

  -- A super admin: a wrong NIN is refused.
  perform set_config('request.jwt.claims', json_build_object('sub', superu, 'role', 'authenticated')::text, true);
  refused := false;
  begin
    perform public.admin_open_email_recovery(member, 'new.probe@example.invalid', '98765432109', 'ticket PROBE-1');
  exception when sqlstate 'RM040' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: a wrong NIN was accepted'; end if;

  -- Their own account is refused.
  refused := false;
  begin
    perform public.admin_open_email_recovery(superu, 'new.super@example.invalid', '12345678901', 'ticket PROBE-1');
  exception when sqlstate '42501' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: a super admin opened a recovery for themselves'; end if;

  -- CONTROL: the right NIN opens it, in cooling-off, with an audit row.
  req := public.admin_open_email_recovery(member, 'New.Probe@Example.invalid', '12345678901', 'ticket PROBE-1');
  if req is null then raise exception 'PROBE_FAIL sec-15: the control did not open a request'; end if;

  -- Completing inside the 72 hours is refused.
  refused := false;
  begin
    perform public.admin_begin_email_recovery(req);
  exception when sqlstate 'RM041' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: completed inside the cooling-off'; end if;

  -- A member reads no request.
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  select count(*) into n from public.email_recovery_requests;
  if n <> 0 then raise exception 'PROBE_FAIL sec-15: a member read % recovery rows', n; end if;

  -- The cooling-off passes (moved back as the owner), then it completes.
  reset role;
  update public.email_recovery_requests set eligible_at = now() - interval '1 minute' where id = req;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', superu, 'role', 'authenticated')::text, true);
  perform public.admin_begin_email_recovery(req);
  perform public.admin_finish_email_recovery(req, true, null);
  reset role;
  select status into st from public.email_recovery_requests where id = req;
  if st <> 'completed' then raise exception 'PROBE_FAIL sec-15: request ended as %', st; end if;
  select count(*) into n from public.audit_log
   where entity_id = member::text and action like 'account.email_recovery.%' and metadata ->> 'request_id' = req::text;
  if n <> 3 then raise exception 'PROBE_FAIL sec-15: % audit rows for the request, expected 3', n; end if;

  -- An admin can cancel a request in its cooling-off.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', superu, 'role', 'authenticated')::text, true);
  req2 := public.admin_open_email_recovery(member, 'second.probe@example.invalid', '12345678901', 'ticket PROBE-2');
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  perform public.admin_cancel_email_recovery(req2, 'owner still has the mailbox');
  reset role;
  select status into st from public.email_recovery_requests where id = req2;
  if st <> 'cancelled' then raise exception 'PROBE_FAIL sec-15: cancel left it %', st; end if;

  raise exception 'PROBE_OK sec-15';
end $$;
