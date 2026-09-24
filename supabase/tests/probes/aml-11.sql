-- AML-11 (SCUML checklist item 11): a transaction record is kept five years
-- and stays reconstructable. When an account with money history is purged,
-- the person is anonymised but the financial record is not: the bank account a
-- withdrawal went to, the payout account, and the withdrawal's destination
-- (account name and number, the payee's name) are kept, with anything that
-- could pay out through them cleared, until five years after the purge; then
-- the daily job redacts them. An account with no money history is purged as
-- before, and an approved agent's identification is kept to the same date.
-- Throwaway accounts created and purged inside this transaction; rolls back.
do $$
declare
  rich   constant uuid := 'a1a11000-0000-4000-8000-00000000000a';   -- money history
  clean  constant uuid := 'b1a11000-0000-4000-8000-00000000000b';   -- none
  agent  constant uuid := 'c1a11000-0000-4000-8000-00000000000c';   -- approved agent with money history
  member constant uuid := '957b3bd2-cce3-425d-bba9-5cd876ca3d62';
  w uuid; wa uuid; req_r uuid; req_c uuid; req_a uuid; app_a uuid; ag uuid;
  res jsonb; md jsonb; keep_until timestamptz; kyc_until timestamptz;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                          created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values
    (rich,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'probe.rich.aml11@example.invalid', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
    (clean, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'probe.clean.aml11@example.invalid', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
    (agent, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'probe.agent.aml11@example.invalid', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb);

  -- The rich account funded its wallet and withdrew all of it to a bank.
  insert into public.wallets (user_id) values (rich) returning id into w;
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
  values (w, 'deposit', 'credit', 500000, 'probe-aml11-d', 'COMPLETED');
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status, metadata)
  values (w, 'withdrawal', 'debit', 500000, 'probe-aml11-w', 'COMPLETED',
          jsonb_build_object('account_name', 'Probe Payee', 'account_number', '0123456789',
                             'bank_code', '058', 'name', 'Probe Payee', 'email', 'payee@example.invalid'));
  insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name,
                                    resolved_at, recipient_code, is_default)
  values (rich, '058', 'Probe Bank', '0123456789', 'Probe Payee', now(), 'RCP_probe_aml11', true);
  insert into public.payment_methods (user_id, authorization_code, signature, reusable, email_used, last4)
  values (rich, 'AUTH_probe_aml11', 'sig-probe-aml11', true, 'probe.rich.aml11@example.invalid', '4081');

  -- The clean account saved a bank account and never moved money.
  insert into public.bank_accounts (user_id, bank_code, bank_name, account_number, resolved_account_name, resolved_at)
  values (clean, '058', 'Probe Bank', '1111111111', 'Probe Clean', now());

  -- The approved agent was paid out once.
  insert into public.agent_applications (user_id, status, full_name, id_type, id_number, account_number, account_name)
  values (agent, 'APPROVED', 'Probe Agent', 'nin', '10987654321', '9876543210', 'Probe Agent')
  returning id into app_a;
  insert into public.agent_documents (application_id, uploader_id, kind, storage_path)
  values (app_a, agent, 'identity', agent::text || '/probe-id.jpg');
  insert into public.agents (user_id, display_name) values (agent, 'Probe Agent') returning id into ag;
  insert into public.payout_accounts (agent_id, bank_name, account_number, account_name, bank_code, recipient_code)
  values (ag, 'Probe Bank', '9876543210', 'Probe Agent', '058', 'RCP_probe_aml11_agent');
  insert into public.wallets (user_id) values (agent) returning id into wa;
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status)
  values (wa, 'payment_in', 'credit', 300000, 'probe-aml11-a-in', 'COMPLETED');
  insert into public.wallet_entries (wallet_id, kind, direction, amount_minor, reference, status, metadata)
  values (wa, 'withdrawal', 'debit', 300000, 'probe-aml11-a-out', 'COMPLETED',
          jsonb_build_object('account_name', 'Probe Agent', 'account_number', '9876543210', 'bank_code', '058'));

  insert into public.account_deletion_requests (user_id, purge_after) values (rich,  now() - interval '1 minute') returning id into req_r;
  insert into public.account_deletion_requests (user_id, purge_after) values (clean, now() - interval '1 minute') returning id into req_c;
  insert into public.account_deletion_requests (user_id, purge_after) values (agent, now() - interval '1 minute') returning id into req_a;

  -- 1. Money history: the person goes, the financial record stays.
  res := public.purge_account_rows(req_r);
  if (res ->> 'purged')::boolean is not true then raise exception 'PROBE_FAIL aml-11: the rich account was not purged: %', res; end if;
  if (select display_name from public.profiles where id = rich) <> 'Deleted account' then
    raise exception 'PROBE_FAIL aml-11: the person was not anonymised';
  end if;
  if not exists (select 1 from public.bank_accounts
                  where user_id = rich and account_number = '0123456789' and resolved_account_name = 'Probe Payee') then
    raise exception 'PROBE_FAIL aml-11: the bank account a withdrawal went to was deleted';
  end if;
  if exists (select 1 from public.bank_accounts where user_id = rich and (recipient_code is not null or deleted_at is null)) then
    raise exception 'PROBE_FAIL aml-11: a kept bank account can still be paid to';
  end if;
  select metadata into md from public.wallet_entries where reference = 'probe-aml11-w';
  if md ->> 'account_number' is distinct from '0123456789' or md ->> 'account_name' is distinct from 'Probe Payee'
     or md ->> 'name' is distinct from 'Probe Payee' then
    raise exception 'PROBE_FAIL aml-11: the withdrawal no longer says who was paid: %', md;
  end if;
  if md ? 'email' then raise exception 'PROBE_FAIL aml-11: contact data stayed on the ledger: %', md; end if;
  if exists (select 1 from public.payment_methods where user_id = rich) then
    raise exception 'PROBE_FAIL aml-11: a saved card token survived the purge';
  end if;
  select money_retain_until into keep_until from public.account_deletion_requests where id = req_r;
  if keep_until is null or keep_until < now() + interval '4 years 11 months' or keep_until > now() + interval '5 years 1 day' then
    raise exception 'PROBE_FAIL aml-11: the financial record is kept until %', keep_until;
  end if;

  -- 2. No money history: as before, nothing kept.
  res := public.purge_account_rows(req_c);
  if (res ->> 'purged')::boolean is not true then raise exception 'PROBE_FAIL aml-11: the clean account was not purged: %', res; end if;
  if exists (select 1 from public.bank_accounts where user_id = clean) then
    raise exception 'PROBE_FAIL aml-11: an account with no money history kept its bank account';
  end if;
  if (select money_retain_until from public.account_deletion_requests where id = req_c) is not null then
    raise exception 'PROBE_FAIL aml-11: an account with no money history was given a retention date';
  end if;

  -- 3. The approved agent: identification and payout destination kept to the same date.
  res := public.purge_account_rows(req_a);
  if (res ->> 'purged')::boolean is not true then raise exception 'PROBE_FAIL aml-11: the agent was not purged: %', res; end if;
  if not exists (select 1 from public.agent_documents where uploader_id = agent) then
    raise exception 'PROBE_FAIL aml-11: the approved agent''s identification was destroyed';
  end if;
  if not exists (select 1 from public.payout_accounts where agent_id = ag and account_number = '9876543210' and recipient_code is null) then
    raise exception 'PROBE_FAIL aml-11: the payout destination was not kept, or can still be paid to';
  end if;
  select kyc_retain_until into kyc_until from public.agent_applications where id = app_a;
  select money_retain_until into keep_until from public.account_deletion_requests where id = req_a;
  if kyc_until is null or keep_until is null or kyc_until <> keep_until then
    raise exception 'PROBE_FAIL aml-11: identification kept until %, the financial record until %', kyc_until, keep_until;
  end if;

  -- 4. Five years on, the daily job redacts the kept destination, and only the service role can run it.
  if to_regprocedure('public.destroy_expired_money_records(integer)') is null then
    raise exception 'PROBE_FAIL aml-11: there is no job to end the retention';
  end if;
  update public.account_deletion_requests set status = 'PURGED', money_retain_until = now() - interval '1 minute' where id = req_r;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  begin
    perform public.destroy_expired_money_records(50);
    raise exception 'PROBE_FAIL aml-11: a signed-in caller ran the money-record destruction';
  exception when insufficient_privilege then null;
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  res := public.destroy_expired_money_records(50);
  select metadata into md from public.wallet_entries where reference = 'probe-aml11-w';
  if exists (select 1 from public.bank_accounts where user_id = rich)
     or md ?| array['account_name', 'account_number', 'name']
     or (select money_retain_until from public.account_deletion_requests where id = req_r) is not null
     or not exists (select 1 from public.audit_log where action = 'account.money_records.redacted' and entity_id = rich::text) then
    raise exception 'PROBE_FAIL aml-11: the expired record was not redacted: % %', res, md;
  end if;
  if md ->> 'bank_code' is distinct from '058' or (select amount_minor from public.wallet_entries where reference = 'probe-aml11-w') <> 500000 then
    raise exception 'PROBE_FAIL aml-11: the redaction took more than the destination: %', md;
  end if;
  -- The agent's is not due yet.
  if not exists (select 1 from public.payout_accounts where agent_id = ag) then
    raise exception 'PROBE_FAIL aml-11: a record not yet due was redacted';
  end if;

  raise exception 'PROBE_OK aml-11';
end
$$;
