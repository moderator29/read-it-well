-- AML-19 (d): admin and super_admin are granted only by two super admins,
-- never to yourself, never by the service role alone, and every role change
-- is an audit row. Rolls back.
do $$
declare
  s1 constant uuid := '2255d905-0f31-437e-b719-aa2e4a18e03d';
  s2 constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  target constant uuid := '32f20950-04f1-4316-bf36-3e4f76c2f193';
  target_email text := (select email from auth.users where id = '32f20950-04f1-4316-bf36-3e4f76c2f193');
  r jsonb; since timestamptz := now();
begin
  insert into public.user_roles (user_id, role) values (s2, 'super_admin') on conflict do nothing;
  delete from public.user_roles where user_id = target and role in ('admin', 'super_admin');

  -- One super admin, directly: refused.
  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.user_roles (user_id, role) values (target, 'admin');
    raise exception 'PROBE_FAIL aml19-d: one super admin granted admin directly';
  exception when insufficient_privilege then null;
  end;
  r := public.control_request('staff_role_grant', s1::text, 'super_admin', null);
  if r ->> 'status' <> 'not_for_yourself' then
    raise exception 'PROBE_FAIL aml19-d: a super admin proposed their own promotion: %', r;
  end if;
  r := public.control_request('staff_role_grant', target::text, 'admin', 'probe');
  reset role;
  if r ->> 'status' <> 'awaiting_second_approval'
     or exists (select 1 from public.user_roles where user_id = target and role = 'admin') then
    raise exception 'PROBE_FAIL aml19-d: one super admin granted admin: %', r;
  end if;

  -- The service role, alone: refused, directly and through grant_staff_role.
  perform set_config('request.jwt.claims', '', true);
  set local role service_role;
  begin
    insert into public.user_roles (user_id, role) values (target, 'super_admin');
    raise exception 'PROBE_FAIL aml19-d: the service role granted super_admin directly';
  exception when insufficient_privilege then null;
  end;
  r := public.grant_staff_role(s1, target_email, 'admin');
  reset role;
  if r ->> 'status' <> 'forbidden' then
    raise exception 'PROBE_FAIL aml19-d: grant_staff_role acted for a named admin on the service key: %', r;
  end if;

  -- A second super admin: granted, with the audit row.
  perform set_config('request.jwt.claims', json_build_object('sub', s2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.control_request('staff_role_grant', target::text, 'admin', null);
  reset role;
  perform set_config('request.jwt.claims', '', true);
  if r ->> 'status' <> 'ok'
     or not exists (select 1 from public.user_roles where user_id = target and role = 'admin') then
    raise exception 'PROBE_FAIL aml19-d: two super admins did not grant admin: %', r;
  end if;
  if not exists (select 1 from public.audit_log a where a.action = 'user_role.insert'
                  and a.entity_id = target::text and a.metadata ->> 'after_role' = 'admin'
                  and a.created_at >= since) then
    raise exception 'PROBE_FAIL aml19-d: the grant left no audit row';
  end if;
  if not exists (select 1 from public.audit_log a where a.action = 'control_request.applied'
                  and a.metadata ->> 'target' = target::text and a.created_at >= since) then
    raise exception 'PROBE_FAIL aml19-d: the approval left no audit row';
  end if;

  raise exception 'PROBE_OK aml19-d';
end $$;
