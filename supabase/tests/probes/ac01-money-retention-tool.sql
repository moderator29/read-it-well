-- AC01 (pending migration ac01_money_retention_tool.sql): the console's
-- money-record retention tool. Dry run first, destruction only for a super
-- admin who types DESTROY with the exact count, and an audit row that names
-- the person. Everything is built inside this transaction and rolled back by
-- the final raise; no live row survives.
do $$
declare
  super_id constant uuid := '2255d905-0f31-437e-b719-aa2e4a18e03d'; -- a super admin exempt from the console step-up
  admin_id constant uuid := '03f3dd52-ea28-4852-9abe-e5b0a67c2a43';
  subject  uuid;
  req      uuid;
  pv       jsonb;
  r        jsonb;
  due_n    integer;
  n        integer;
begin
  -- A member with no deletion request of their own stands in for a purged
  -- account; their rows are added here and rolled back below.
  select u.id into subject
    from auth.users u
   where not exists (select 1 from public.user_roles x where x.user_id = u.id and x.role in ('admin', 'super_admin'))
     and not exists (select 1 from public.account_deletion_requests d where d.user_id = u.id)
     and not exists (select 1 from public.bank_accounts b where b.user_id = u.id)
   limit 1;
  if subject is null then
    raise exception 'PROBE_FAIL ac01-money-retention-tool 0: no member to stand in for a purged account';
  end if;

  insert into public.account_deletion_requests (user_id, status, requested_at, purge_after, money_retain_until)
  values (subject, 'PURGED', now() - interval '2000 days', now() - interval '1900 days', now() - interval '1 day')
  returning id into req;
  insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at)
  values (subject, '058', 'Probe Bank', '0123456789', 'Probe', now());

  -- 1. A member is refused the preview, and the destroy answers forbidden.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', subject, 'role', 'authenticated')::text, true);
  begin
    perform public.staff_money_retention_preview();
    raise exception 'PROBE_FAIL ac01-money-retention-tool 1: a member read the preview';
  exception when insufficient_privilege then
    null;
  end;
  r := public.staff_destroy_expired_money_records(50, 'DESTROY', 1);
  if r ->> 'status' <> 'forbidden' then
    raise exception 'PROBE_FAIL ac01-money-retention-tool 1: a member got %', r;
  end if;

  -- 2. An admin who is not a super admin, with no security-key proof this
  -- session, is refused the preview (the finance scope includes the step-up),
  -- and the destroy answers forbidden either way.
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  begin
    perform public.staff_money_retention_preview();
    raise exception 'PROBE_FAIL ac01-money-retention-tool 2: an admin with no step-up read the preview';
  exception when insufficient_privilege then
    null;
  end;
  r := public.staff_destroy_expired_money_records(50, 'DESTROY', 1);
  if r ->> 'status' <> 'forbidden' then
    raise exception 'PROBE_FAIL ac01-money-retention-tool 2: an admin who is not a super admin got %', r;
  end if;

  -- 3. A super admin: the preview names what would go, and nothing is gone yet.
  perform set_config('request.jwt.claims', json_build_object('sub', super_id, 'role', 'authenticated')::text, true);
  pv := public.staff_money_retention_preview();
  due_n := (pv ->> 'due')::integer;
  if due_n < 1 or (pv ->> 'bank_accounts')::integer < 1 then
    raise exception 'PROBE_FAIL ac01-money-retention-tool 3: preview did not count the bank account: %', pv;
  end if;
  if pv::text like '%0123456789%' or pv::text like '%' || subject::text || '%' then
    raise exception 'PROBE_FAIL ac01-money-retention-tool 3: the preview leaked an account number or a user id';
  end if;
  reset role;
  select count(*) into n from public.bank_accounts where user_id = subject;
  if n <> 1 then
    raise exception 'PROBE_FAIL ac01-money-retention-tool 3: the dry run changed the data';
  end if;

  -- 4. Wrong confirmation, wrong count: nothing is destroyed.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', super_id, 'role', 'authenticated')::text, true);
  r := public.staff_destroy_expired_money_records(500, 'destroy', due_n);
  if r ->> 'status' <> 'confirm' then
    raise exception 'PROBE_FAIL ac01-money-retention-tool 4: lower-case confirmation got %', r;
  end if;
  r := public.staff_destroy_expired_money_records(500, 'DESTROY', due_n + 1);
  if r ->> 'status' <> 'changed' then
    raise exception 'PROBE_FAIL ac01-money-retention-tool 4: a stale count got %', r;
  end if;
  reset role;
  select count(*) into n from public.bank_accounts where user_id = subject;
  if n <> 1 then
    raise exception 'PROBE_FAIL ac01-money-retention-tool 4: a refused call destroyed a record';
  end if;

  -- 5. The right words and the right count: destroyed, audited with the caller.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', super_id, 'role', 'authenticated')::text, true);
  r := public.staff_destroy_expired_money_records(500, 'DESTROY', due_n);
  if r ->> 'status' <> 'ok' or (r ->> 'redacted')::integer <> due_n then
    raise exception 'PROBE_FAIL ac01-money-retention-tool 5: expected ok for %, got %', due_n, r;
  end if;
  reset role;
  select count(*) into n from public.bank_accounts where user_id = subject;
  if n <> 0 then
    raise exception 'PROBE_FAIL ac01-money-retention-tool 5: the bank account survived';
  end if;
  select count(*) into n from public.audit_log
   where action = 'retention.money_records.destroyed_by_staff' and actor_id = super_id;
  if n <> 1 then
    raise exception 'PROBE_FAIL ac01-money-retention-tool 5: no audit row naming the caller';
  end if;
  select count(*) into n from public.audit_log
   where action = 'account.money_records.redacted' and entity_id = subject::text;
  if n <> 1 then
    raise exception 'PROBE_FAIL ac01-money-retention-tool 5: no per-account audit row';
  end if;

  -- 6. Run again: nothing is due.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', super_id, 'role', 'authenticated')::text, true);
  r := public.staff_destroy_expired_money_records(500, 'DESTROY', 1);
  if r ->> 'status' <> 'nothing_due' then
    raise exception 'PROBE_FAIL ac01-money-retention-tool 6: second run got %', r;
  end if;
  reset role;

  raise exception 'TEST_RESULT ac01-money-retention-tool all checks passed (rolled back); request=%', req;
end;
$$;
