-- DB-05 STEP 1: a member's client files a bank account with only the columns
-- the add path writes, never a recipient_code; an agent's client files a
-- payout account without the processor's columns and afterwards changes only
-- which one is the default; anon writes neither. The step 2 probe (no client
-- insert at all) is tests/pending/db-05-step2.sql.
do $$
declare
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  agent uuid;
  bid uuid;
  pid uuid;
  n int;
begin
  insert into public.agents (user_id, display_name) values (member, 'Probe DB-05 agent') returning id into agent;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);

  -- Control: the deployed add path's insert, and its default and remove updates.
  insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at)
  values (member, '058', 'GTBank', '0123456789', 'PROBE HOLDER', now())
  returning id into bid;
  update public.bank_accounts set is_default = true where id = bid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-05: bank default rows=%', n; end if;

  -- A recipient chosen by the client is refused, on insert and on update.
  begin
    insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at, recipient_code)
    values (member, '058', 'GTBank', '0123456780', 'SOMEBODY ELSE ENTIRELY', now(), 'RCP_forged_by_client');
    raise exception 'PROBE_FAIL db-05: client filed a recipient_code';
  exception when insufficient_privilege then null; end;
  begin
    update public.bank_accounts set recipient_code = 'RCP_forged_by_client' where id = bid;
    raise exception 'PROBE_FAIL db-05: client set a recipient_code';
  exception when insufficient_privilege then null; end;

  -- Payout accounts: the deployed add path, then default only.
  insert into public.payout_accounts (agent_id, bank_name, bank_code, account_number, account_name)
  values (agent, 'GTBank', '058', '0123456789', 'PROBE HOLDER')
  returning id into pid;
  update public.payout_accounts set is_default = true where id = pid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-05: payout default rows=%', n; end if;
  begin
    update public.payout_accounts set account_number = '9876543210' where id = pid;
    raise exception 'PROBE_FAIL db-05: agent rewrote a payout account number';
  exception when insufficient_privilege then null; end;
  begin
    update public.payout_accounts set account_name = 'SOMEBODY ELSE ENTIRELY' where id = pid;
    raise exception 'PROBE_FAIL db-05: agent rewrote a payout account name';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.payout_accounts (agent_id, bank_name, bank_code, account_number, account_name, recipient_code)
    values (agent, 'GTBank', '058', '0123456781', 'PROBE HOLDER', 'RCP_forged_by_client');
    raise exception 'PROBE_FAIL db-05: agent filed a payout recipient_code';
  exception when insufficient_privilege then null; end;
  delete from public.payout_accounts where id = pid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'PROBE_FAIL db-05: payout remove rows=%', n; end if;

  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at)
    values (member, '058', 'GTBank', '0123456782', 'PROBE HOLDER', now());
    raise exception 'PROBE_FAIL db-05: anon filed a bank account';
  exception when insufficient_privilege then null; end;

  raise exception 'PROBE_OK db-05';
end
$$;
