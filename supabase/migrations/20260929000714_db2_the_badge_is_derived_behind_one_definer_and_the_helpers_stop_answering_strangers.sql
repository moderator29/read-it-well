-- DB2 / BADGE ORACLE: a stranger can no longer ask whether a user id is staff
-- or verified, and a signed-out reader still sees every badge.
--
-- public.is_platform_staff(uuid) and public.is_checked_person(uuid) were
-- EXECUTE-able by anon and authenticated, and they are in `public`, so
-- PostgREST served them as /rest/v1/rpc/...: anybody could test any user id.
-- They were granted on purpose (20260923111950): public.person_badge is a
-- non-invoker view, which checks TABLE access as its owner but FUNCTION
-- execute as the QUERYING role, so a plain revoke makes every signed-out read
-- of the view raise 42501 and the badge vanish everywhere (the 22 September
-- outage in its second costume; agent-badge-derivation.test.ts).
--
-- The redesign: the derivation moves behind one SECURITY DEFINER function in
-- `private`, private.badge_tier_for(uuid), which calls the two helpers as its
-- owner. The view calls only that function, so the querying role needs
-- EXECUTE on it and on nothing else. `private` is not an API schema (the Data
-- API exposes public and graphql_public), so the function is not an RPC, and
-- anon holds no USAGE on it; its answer for a user id is exactly the row the
-- view already publishes for that id, so it can tell nobody anything new. The view keeps its
-- columns (user_id, tier), its candidates and its rule (only rows with a
-- badge), so every reader sees the same rows as before; this is checked below
-- against a copy taken before the swap.
--
-- Then the two helpers lose anon/authenticated/PUBLIC EXECUTE (service_role
-- keeps it). Their other callers, found in pg_depend and every pg_proc body
-- and pg_policies expression: private.refresh_agent_badge_tier (SECURITY
-- DEFINER, runs as owner, unaffected) and the view (repointed here). No RLS
-- policy calls either.

create temp table _person_badge_before on commit drop as
  select user_id, tier from public.person_badge;

create or replace function private.badge_tier_for(p_user uuid)
returns public.badge_tier
language sql
stable
security definer
set search_path = ''
as $$
  select public.badge_tier(public.is_platform_staff(p_user), public.is_checked_person(p_user));
$$;

comment on function private.badge_tier_for(uuid) is
  'DB2: the one badge derivation, run as owner so public.person_badge needs no EXECUTE on is_platform_staff / is_checked_person. Not an API function (private schema).';

revoke all on function private.badge_tier_for(uuid) from public;
grant execute on function private.badge_tier_for(uuid) to anon, authenticated, service_role;

create or replace view public.person_badge as
  with candidates as (
    select ur.user_id from public.user_roles ur
    union
    select a.user_id from public.agents a
    union
    select b.owner_id as user_id from public.businesses b where b.owner_id is not null
  )
  select c.user_id, t.tier
    from candidates c
    cross join lateral (select private.badge_tier_for(c.user_id) as tier) t
   where t.tier <> 'none'::public.badge_tier;

revoke all on public.person_badge from public, anon, authenticated;
grant select on public.person_badge to anon, authenticated;

revoke all on function public.is_platform_staff(uuid) from public, anon, authenticated;
revoke all on function public.is_checked_person(uuid) from public, anon, authenticated;
grant execute on function public.is_platform_staff(uuid) to service_role;
grant execute on function public.is_checked_person(uuid) to service_role;

-- Read back. Every assertion raises, so a partial state never commits.
do $check$
declare
  n_before int;
  n_diff int;
  n_anon int;
  def text := pg_get_viewdef('public.person_badge'::regclass);
begin
  if has_function_privilege('anon', 'public.is_platform_staff(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.is_platform_staff(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.is_checked_person(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.is_checked_person(uuid)', 'EXECUTE') then
    raise exception 'DB2 badge: a client role still executes is_platform_staff / is_checked_person';
  end if;
  if not has_function_privilege('service_role', 'public.is_platform_staff(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.is_checked_person(uuid)', 'EXECUTE') then
    raise exception 'DB2 badge: service_role lost EXECUTE on a helper';
  end if;
  if not has_function_privilege('anon', 'private.badge_tier_for(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'private.badge_tier_for(uuid)', 'EXECUTE') then
    raise exception 'DB2 badge: the view''s one function is not executable by the reading roles';
  end if;
  if has_schema_privilege('anon', 'private', 'USAGE') then
    raise exception 'DB2 badge: anon holds USAGE on private';
  end if;
  if not has_table_privilege('anon', 'public.person_badge', 'SELECT')
     or has_table_privilege('anon', 'public.person_badge', 'INSERT') then
    raise exception 'DB2 badge: person_badge grants are not select-only for anon';
  end if;
  if def ~ '(is_platform_staff|is_checked_person)' then
    raise exception 'DB2 badge: person_badge still calls a revoked helper with invoker rights';
  end if;
  select count(*) into n_before from _person_badge_before;
  select count(*) into n_diff from (
    (select user_id, tier from _person_badge_before except select user_id, tier from public.person_badge)
    union all
    (select user_id, tier from public.person_badge except select user_id, tier from _person_badge_before)
  ) d;
  if n_diff <> 0 then
    raise exception 'DB2 badge: the view publishes % different row(s) than before (% before)', n_diff, n_before;
  end if;
  -- As the signed-out reader: the view answers in full, the helper refuses.
  set local role anon;
  select count(*) into n_anon from public.person_badge;
  begin
    perform public.is_platform_staff(gen_random_uuid());
    raise exception 'DB2 badge: anon can still call is_platform_staff';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.is_checked_person(gen_random_uuid());
    raise exception 'DB2 badge: anon can still call is_checked_person';
  exception when insufficient_privilege then null;
  end;
  reset role;
  if n_anon <> n_before then
    raise exception 'DB2 badge: anon reads % badge row(s), expected %', n_anon, n_before;
  end if;
  raise notice 'DB2 badge: % badge row(s), identical before and after, and anon reads all of them', n_before;
end
$check$;
