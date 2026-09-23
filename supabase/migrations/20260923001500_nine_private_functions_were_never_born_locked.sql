-- RULE 21 SAYS BORN LOCKED, NEVER BORN PUBLIC. NINE FUNCTIONS WERE BORN PUBLIC.
--
-- Found by pulling on an escrow worker's finding that four private functions
-- had no ACL. It fixed its four. This asks the question of the whole schema:
--
--   220 functions in `private`, 205 of them SECURITY DEFINER
--    73 executable by `authenticated`
--    68 executable by `anon`
--    47 with NO ACL AT ALL, which in PostgreSQL means EXECUTE to PUBLIC
--
-- THE FIRST READING OF THAT WAS WRONG AND THE FIX WOULD HAVE TAKEN THE
-- PLATFORM DOWN. `authenticated` holds USAGE on `private` on purpose, because
-- 152 RLS POLICIES ACROSS 88 TABLES call `private.*` functions, and a policy
-- expression needs EXECUTE as the QUERYING role. A blanket revoke would have
-- failed every one of those policies and locked every person out of their own
-- rows. 22 of the 73 are exactly that: necessary, and they stay.
--
-- What is left after removing the policy callers, the 38 trigger functions
-- (PostgreSQL fires a trigger without checking EXECUTE on the invoking role)
-- and anything used in a check constraint (none) is NINE.
--
-- TWO OF THEM GRANT AND REVOKE STAFF ROLES. ONE REFUNDS MONEY. And every one
-- of the first five takes `acting_admin` AS A CALLER ARGUMENT, which is the
-- same shape the escrow doors were closed for on 22 September: a function that
-- believes whoever calls it about who is calling it.
--
-- NOT A LIVE BREACH, AND SAYING SO IS PART OF THE RECORD. PostgREST exposes
-- `public` on this project, not `private`, so none of these is reachable over
-- the API today. The exposure is one configuration change or one `public`
-- wrapper away, which is exactly the distance rule 21 exists to keep. A door
-- that is unlocked but behind another door is still unlocked.

revoke all on function private.grant_staff_role(uuid, text, app_role) from public, anon, authenticated;
revoke all on function private.revoke_staff_role(uuid, uuid, app_role) from public, anon, authenticated;
revoke all on function private.suspend_agent(uuid, uuid, text) from public, anon, authenticated;
revoke all on function private.reinstate_agent(uuid, uuid, text) from public, anon, authenticated;
revoke all on function private.refund_and_cancel_booking(uuid, uuid, bigint, text, text, text) from public, anon, authenticated;
revoke all on function private.agent_tier(uuid) from public, anon, authenticated;
revoke all on function private.catalogue_refresh_accommodation(uuid) from public, anon, authenticated;
revoke all on function private.catalogue_refresh_listing(uuid) from public, anon, authenticated;
revoke all on function private.handle_seed(text) from public, anon, authenticated;

-- OBSERVE THE OUTCOME. Fail unless all nine are shut to both roles, and fail
-- just as loudly if the 22 policy callers lost their grant, because that would
-- be the outage this migration was written to avoid.
do $$
declare
  v_open int;
  v_policy_callers int;
begin
  select count(*) into v_open
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private'
     and p.proname in ('grant_staff_role','revoke_staff_role','suspend_agent',
                       'reinstate_agent','refund_and_cancel_booking','agent_tier',
                       'catalogue_refresh_accommodation','catalogue_refresh_listing','handle_seed')
     and (has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if v_open <> 0 then
    raise exception '% of the nine are still open to anon or authenticated', v_open;
  end if;

  select count(*) into v_policy_callers
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.prokind = 'f'
     and has_function_privilege('authenticated', p.oid, 'EXECUTE')
     and exists (
       select 1 from pg_policies
        where coalesce(qual,'')||' '||coalesce(with_check,'') ilike '%private.'||p.proname||'%'
     );
  if v_policy_callers < 22 then
    raise exception 'only % policy-calling functions remain executable, was 22: this revoke has broken RLS', v_policy_callers;
  end if;
end
$$;
