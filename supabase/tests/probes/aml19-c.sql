-- AML-19 (c): custody_structure and opening held payments each need two super
-- admins and leave audit rows; one super admin, alone, only proposes. Rolls back.
do $$
declare
  s1 constant uuid := '2255d905-0f31-437e-b719-aa2e4a18e03d';
  s2 constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  r jsonb; since timestamptz := now();
begin
  insert into public.user_roles (user_id, role) values (s2, 'super_admin') on conflict do nothing;

  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.control_request('custody_structure', 'custody_structure', 'trustee', 'probe');
  reset role;
  if r ->> 'status' <> 'awaiting_second_approval' or private.custody_structure() <> 'undecided' then
    raise exception 'PROBE_FAIL aml19-c: one super admin changed custody: % / %', r, private.custody_structure();
  end if;

  -- One super admin cannot switch held payments on directly, custody decided
  -- or not (custody is made decided below, by two people).
  perform set_config('request.jwt.claims', json_build_object('sub', s2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.control_request('custody_structure', 'custody_structure', 'trustee', null);
  reset role;
  if r ->> 'status' <> 'ok' or private.custody_structure() <> 'trustee' then
    raise exception 'PROBE_FAIL aml19-c: two super admins did not set custody: % / %', r, private.custody_structure();
  end if;
  if not exists (select 1 from public.audit_log a where a.action = 'platform_setting.update'
                  and a.entity_id = 'custody_structure' and a.created_at >= since
                  and a.metadata ->> 'after' = 'trustee') then
    raise exception 'PROBE_FAIL aml19-c: the custody change left no audit row';
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.feature_flags (key, enabled) values ('held_payments', true)
    on conflict (key) do update set enabled = true;
    raise exception 'PROBE_FAIL aml19-c: one super admin opened held payments directly';
  exception when insufficient_privilege then null;
  end;
  r := public.control_request('held_payments_open', 'held_payments', 'on', 'probe');
  reset role;
  if r ->> 'status' <> 'awaiting_second_approval' or private.held_payments_open() then
    raise exception 'PROBE_FAIL aml19-c: one super admin opened held payments: %', r;
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', s2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.control_request('held_payments_open', 'held_payments', 'on', null);
  reset role;
  perform set_config('request.jwt.claims', '', true);
  if r ->> 'status' <> 'ok' or not private.held_payments_open() then
    raise exception 'PROBE_FAIL aml19-c: two super admins did not open held payments: %', r;
  end if;
  if not exists (select 1 from public.audit_log a where a.action in ('feature_flag.insert', 'feature_flag.update')
                  and a.entity_id = 'held_payments' and a.created_at >= since) then
    raise exception 'PROBE_FAIL aml19-c: opening held payments left no audit row';
  end if;

  -- Only the approval that applied it counts: a caller-chosen setting forges nothing.
  update public.feature_flags set enabled = false where key = 'held_payments';
  perform set_config('vallo.control_request', gen_random_uuid()::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.feature_flags set enabled = true where key = 'held_payments';
    raise exception 'PROBE_FAIL aml19-c: a forged control setting opened held payments';
  exception when insufficient_privilege then null;
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  raise exception 'PROBE_OK aml19-c';
end $$;
