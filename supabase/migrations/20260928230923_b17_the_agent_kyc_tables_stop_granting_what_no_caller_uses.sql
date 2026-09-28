-- The agent KYC tables stop granting what no caller uses.
--
-- anon held table SELECT on agent_applications, agent_documents and
-- agent_verification_checks. Every SELECT policy on them needs auth.uid()
-- (own row, own listing, or admin), no view reads them, and every app read
-- goes through a signed-in session or the service role, so anon could only
-- ever get an empty set. The grant is removed so that a future policy
-- written for {public} cannot quietly open identity papers to strangers.
--
-- authenticated held DELETE on agent_verification_checks. No member policy
-- allows a delete (the only ALL policy is agent_verification_checks_admin_all),
-- the app only upserts rungs, and a decided rung is a record rather than
-- something to remove. The DELETE grant goes; INSERT, UPDATE and SELECT stay
-- for the admin policy and the member's own read.
--
-- RLS and every policy are unchanged.

revoke select on public.agent_applications        from anon;
revoke select on public.agent_documents           from anon;
revoke select on public.agent_verification_checks from anon;
revoke delete on public.agent_verification_checks from authenticated;

do $readback$
declare
  v_sqlstate text;
begin
  -- Grants as recorded.
  if has_table_privilege('anon', 'public.agent_applications', 'select')
     or has_table_privilege('anon', 'public.agent_documents', 'select')
     or has_table_privilege('anon', 'public.agent_verification_checks', 'select') then
    raise exception 'B-17 read-back: anon still holds SELECT on an agent_* table';
  end if;
  if has_table_privilege('authenticated', 'public.agent_verification_checks', 'delete') then
    raise exception 'B-17 read-back: authenticated still holds DELETE on agent_verification_checks';
  end if;
  -- Control: what the app needs is still there.
  if not has_table_privilege('authenticated', 'public.agent_applications', 'select')
     or not has_table_privilege('authenticated', 'public.agent_applications', 'insert')
     or not has_table_privilege('authenticated', 'public.agent_applications', 'update')
     or not has_table_privilege('authenticated', 'public.agent_documents', 'select')
     or not has_table_privilege('authenticated', 'public.agent_documents', 'insert')
     or not has_table_privilege('authenticated', 'public.agent_verification_checks', 'select')
     or not has_table_privilege('authenticated', 'public.agent_verification_checks', 'insert')
     or not has_table_privilege('authenticated', 'public.agent_verification_checks', 'update') then
    raise exception 'B-17 read-back: an authenticated grant the app uses went missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.agent_applications'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.agent_documents'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.agent_verification_checks'::regclass) then
    raise exception 'B-17 read-back: RLS is off on an agent_* table';
  end if;

  -- Behaviour, as the real roles, rolled back.
  v_sqlstate := null;
  begin
    set local role anon;
    perform 1 from public.agent_applications limit 1;
  exception when others then
    v_sqlstate := sqlstate;
  end;
  reset role;
  if v_sqlstate is distinct from '42501' then
    raise exception 'B-17 probe: anon read of agent_applications was not refused (sqlstate %)', v_sqlstate;
  end if;

  -- Control: a signed-in member can still read all three (RLS decides rows).
  v_sqlstate := null;
  begin
    set local role authenticated;
    perform 1 from public.agent_verification_checks limit 1;
    perform 1 from public.agent_applications limit 1;
    perform 1 from public.agent_documents limit 1;
  exception when others then
    v_sqlstate := sqlstate || ' ' || sqlerrm;
  end;
  reset role;
  if v_sqlstate is not null then
    raise exception 'B-17 probe control: authenticated read failed (%)', v_sqlstate;
  end if;

  v_sqlstate := null;
  begin
    set local role authenticated;
    delete from public.agent_verification_checks where false;
  exception when others then
    v_sqlstate := sqlstate;
  end;
  reset role;
  if v_sqlstate is distinct from '42501' then
    raise exception 'B-17 probe: authenticated DELETE on agent_verification_checks was not refused (sqlstate %)', v_sqlstate;
  end if;
end
$readback$;
