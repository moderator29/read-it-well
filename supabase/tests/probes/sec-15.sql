-- SEC-15: staff-assisted email recovery. A member and an admin cannot open
-- one; a super admin can, only with the NIN on an approved identity on file,
-- never for their own account, and never for one being closed or banned.
-- TWO PEOPLE: the opener cannot begin, and only the one who began can
-- finish. The old address must have been told, and the 72 hours count from
-- that notice. On completion every session ends and no new or repointed
-- payout account can be filed for 7 days; removing an account still works. Every step writes audit_log; the owner can cancel. The auth row
-- change itself is the server's (service role) and is not exercised here.
-- A second super admin is granted inside the transaction only. Rolls back.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  admin  constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  superu uuid;
  req    uuid;
  req2   uuid;
  bank   uuid;
  n      int;
  st     text;
  refused boolean;
begin
  -- 29 September: the console's second factor. An admin or a staff member
  -- holds their role only on a session that proved a security key, so this
  -- probe's session carries one for every admin and for the QA member (who
  -- some probes make staff), rolled back with everything else.
  insert into public.console_step_ups (user_id, session_id, expires_at)
  select console_probe_uid, '00000000-0000-4000-8000-00000000c0de', now() + interval '1 hour'
    from (select user_id from public.user_roles where role in ('admin', 'super_admin')
          union select '03f3dd52-ea28-4852-9abe-e5b0a67c2a43'::uuid
          union select '957b3bd2-cce3-425d-bba9-5cd876ca3d62'::uuid) s(console_probe_uid)
  on conflict (user_id, session_id) do update set expires_at = excluded.expires_at;
  select r.user_id into superu from public.user_roles r
   where r.role = 'super_admin' and r.user_id <> admin limit 1;
  if superu is null then raise exception 'PROBE_FAIL sec-15: no super admin to run the control as'; end if;

  -- The QA admin becomes a second super admin, and the member gets an
  -- approved identity on file, both inside this transaction only.
  insert into public.user_roles (user_id, role) values (admin, 'super_admin') on conflict do nothing;
  insert into public.agent_applications (user_id, reference, type, status, full_name, phone, email, id_type, id_number, agree_terms, reviewed_at)
  values (member, 'PROBE-SEC15', 'individual', 'APPROVED', 'Probe Member', '08000000000', 'probe@example.invalid', 'nin', '123 4567 8901', true, now());

  -- An account the member already had before any move.
  insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at)
  values (member, '058', 'Probe Bank', '0987654321', 'PROBE MEMBER', now())
  returning id into bank;

  set local role authenticated;

  -- A member cannot open one, write the table, or (yet) read anything.
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  refused := false;
  begin
    perform public.admin_open_email_recovery(member, 'new.probe@example.invalid', '12345678901', 'ticket PROBE-1');
  exception when sqlstate '42501' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: a member opened a recovery'; end if;
  refused := false;
  begin
    insert into public.email_recovery_requests (user_id, old_email, new_email, identity_source, evidence_ref, opened_by, eligible_at)
    values (member, 'a@example.invalid', 'b@example.invalid', 'x', 'ticket PROBE-1', member, now());
  exception when sqlstate '42501' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: a member wrote a recovery row'; end if;

  -- The opening super admin: a wrong NIN and their own account are refused.
  perform set_config('request.jwt.claims', json_build_object('sub', superu, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  refused := false;
  begin
    perform public.admin_open_email_recovery(member, 'new.probe@example.invalid', '98765432109', 'ticket PROBE-1');
  exception when sqlstate 'RM040' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: a wrong NIN was accepted'; end if;
  refused := false;
  begin
    perform public.admin_open_email_recovery(superu, 'new.super@example.invalid', '12345678901', 'ticket PROBE-1');
  exception when sqlstate '42501' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: a super admin opened a recovery for themselves'; end if;

  -- An account being closed, or banned, is refused even with the right NIN.
  reset role;
  insert into public.account_deletion_requests (user_id, status, purge_after)
  values (member, 'SCHEDULED', now() + interval '30 days');
  set local role authenticated;
  refused := false;
  begin
    perform public.admin_open_email_recovery(member, 'new.probe@example.invalid', '12345678901', 'ticket PROBE-1');
  exception when sqlstate 'RM040' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: an account being closed was opened for a move'; end if;
  reset role;
  delete from public.account_deletion_requests where user_id = member and status = 'SCHEDULED';
  update auth.users set banned_until = now() + interval '1 day' where id = member;
  set local role authenticated;
  refused := false;
  begin
    perform public.admin_open_email_recovery(member, 'new.probe@example.invalid', '12345678901', 'ticket PROBE-1');
  exception when sqlstate 'RM040' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: a banned account was opened for a move'; end if;
  reset role;
  update auth.users set banned_until = null where id = member;
  set local role authenticated;

  -- CONTROL: the right NIN opens it.
  req := public.admin_open_email_recovery(member, 'New.Probe@Example.invalid', '12345678901', 'ticket PROBE-1');

  -- The owner can read their own request.
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  select count(*) into n from public.email_recovery_requests where id = req;
  if n <> 1 then raise exception 'PROBE_FAIL sec-15: the owner cannot see the request against them'; end if;

  -- 72 hours pass WITHOUT the notice having gone: still refused.
  reset role;
  update public.email_recovery_requests set eligible_at = now() - interval '1 minute' where id = req;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  refused := false;
  begin
    perform public.admin_begin_email_recovery(req);
  exception when sqlstate 'RM041' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: began with no notice sent'; end if;

  -- The notice went, but less than 72 hours ago: still refused.
  reset role;
  update public.email_recovery_requests set opened_notice_at = now() - interval '71 hours' where id = req;
  set local role authenticated;
  refused := false;
  begin
    perform public.admin_begin_email_recovery(req);
  exception when sqlstate 'RM041' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: began inside 72 hours of the notice'; end if;

  -- 72 hours after the notice: the OPENER cannot begin it.
  reset role;
  update public.email_recovery_requests set opened_notice_at = now() - interval '73 hours' where id = req;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', superu, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  refused := false;
  begin
    perform public.admin_begin_email_recovery(req);
  exception when sqlstate '42501' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: the opener began the move'; end if;

  -- The second super admin begins it; the opener cannot finish it.
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  perform public.admin_begin_email_recovery(req);
  perform set_config('request.jwt.claims', json_build_object('sub', superu, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  refused := false;
  begin
    perform public.admin_finish_email_recovery(req, true, null);
  exception when sqlstate '42501' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: someone other than the beginner finished it'; end if;

  -- A live session for the member, then the finish by the one who began it.
  reset role;
  insert into auth.sessions (id, user_id, created_at, updated_at) values (gen_random_uuid(), member, now(), now());
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  perform public.admin_finish_email_recovery(req, true, null);
  reset role;

  select status into st from public.email_recovery_requests where id = req;
  if st <> 'completed' then raise exception 'PROBE_FAIL sec-15: request ended as %', st; end if;
  select count(*) into n from auth.sessions where user_id = member;
  if n <> 0 then raise exception 'PROBE_FAIL sec-15: % sessions survived the move', n; end if;
  select count(*) into n from public.audit_log
   where entity_id = member::text and action like 'account.email_recovery.%' and metadata ->> 'request_id' = req::text;
  if n <> 3 then raise exception 'PROBE_FAIL sec-15: % audit rows for the request, expected 3', n; end if;

  -- The money hold. Vallo holds no money any more (Track A: no wallet, no
  -- send, no escrow), so the way money could leave a recovered account is a
  -- new payout destination. Adding one is refused for the hold, whoever files
  -- it: since DB-05 step 2 the server files bank accounts, so the add is made
  -- as the service role, and the hold trigger refuses it all the same.
  -- (29 September 2026: the wallet withdrawal, send, payment and escrow-hold
  -- entries this section tested went with custody.)
  set local role service_role;
  refused := false;
  begin
    insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at)
    values (member, '058', 'Probe Bank', '0123456789', 'PROBE MEMBER', now());
  exception when sqlstate 'RM050' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: a payout account was added during the hold'; end if;

  -- Pointing an existing account elsewhere is refused; removing one is not.
  reset role;
  refused := false;
  begin
    update public.bank_accounts set account_number = '0111111111' where id = bank;
  exception when sqlstate 'RM050' then refused := true;
  end;
  if not refused then raise exception 'PROBE_FAIL sec-15: a bank account was repointed during the hold'; end if;
  update public.bank_accounts set deleted_at = now() where id = bank;
  if not found then raise exception 'PROBE_FAIL sec-15: a bank account could not be removed during the hold'; end if;

  -- The owner can cancel a request against their own account.
  reset role;
  delete from public.account_money_holds where user_id = member;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', superu, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  req2 := public.admin_open_email_recovery(member, 'second.probe@example.invalid', '12345678901', 'ticket PROBE-2');
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated', 'session_id', '00000000-0000-4000-8000-00000000c0de')::text, true);
  perform public.admin_cancel_email_recovery(req2, null);
  reset role;
  select status into st from public.email_recovery_requests where id = req2;
  if st <> 'cancelled' then raise exception 'PROBE_FAIL sec-15: the owner could not cancel (%)', st; end if;

  raise exception 'PROBE_OK sec-15';
end $$;
