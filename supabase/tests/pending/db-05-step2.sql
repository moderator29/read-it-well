-- DB-05 STEP 2 probe. Moves to tests/probes/ when step 2
-- (migrations/pending/db05_step2...) is applied after the release.
-- A member's or agent's own client files no bank or payout account; the
-- service role does; the owner still chooses the default and removes.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  agent uuid;
  bid uuid;
  pid uuid;
  n int;
begin
  insert into public.agents (user_id, display_name) values (member, 'Probe DB-05 agent') returning id into agent;

  -- Control: the server's insert.
  set local role service_role;
  insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at)
  values (member, '058', 'GTBank', '0123456789', 'PROBE HOLDER', now())
  returning id into bid;
  insert into public.payout_accounts (agent_id, bank_name, bank_code, account_number, account_name)
  values (agent, 'GTBank', '058', '0123456789', 'PROBE HOLDER')
  returning id into pid;
  reset role;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  begin
    insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at)
    values (member, '058', 'GTBank', '0123456780', 'SOMEBODY ELSE ENTIRELY', now());
    raise exception 'PROBE_FAIL db-05 step 2: client filed a bank account';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.payout_accounts (agent_id, bank_name, bank_code, account_number, account_name)
    values (agent, 'GTBank', '058', '0123456780', 'SOMEBODY ELSE ENTIRELY');
    raise exception 'PROBE_FAIL db-05 step 2: agent filed a payout account';
  exception when insufficient_privilege then null; end;

  update public.bank_accounts set is_default = true where id = bid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-05 step 2: bank default rows=%', n; end if;
  update public.payout_accounts set is_default = true where id = pid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-05 step 2: payout default rows=%', n; end if;
  delete from public.payout_accounts where id = pid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-05 step 2: payout remove rows=%', n; end if;

  raise exception 'PROBE_OK db-05 step 2';
end
$$;
