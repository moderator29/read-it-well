-- DB-20 / DOC-03: every function an RLS policy calls is executable by every
-- API role that evaluates that policy.
--
-- A policy expression is evaluated AS THE QUERYING ROLE, and PostgreSQL checks
-- EXECUTE when it initialises the expression, so one revoked grant on a policy
-- helper turns every statement on that table into 42501 for that role; it does
-- not filter rows. That is the 22 September outage (`private.owns_listing`,
-- 17 policies on 10 tables, the whole catalogue refused to anon and
-- authenticated) and the DB-04 regression (`inspection_photo_path_access`
-- revoked from anon while three storage.objects policies still applied to
-- PUBLIC).
--
-- This replaces scripts/probes/policy_callers_hold_execute.sql, which matched
-- function names with LIKE over pg_get_expr (so it saw only private/public
-- and missed schema-less or quoted calls) and ignored pg_policy.polroles (so it
-- "allowlisted" pairs anon never evaluates and missed ones it does). Here:
--   * the functions are the policy's recorded dependencies in pg_depend (any
--     schema), which is exactly the set the planner will call;
--   * a (role, policy) pair counts only if the policy applies to the role
--     (polroles holds PUBLIC or the role) AND the role can reach the table at
--     all (any table privilege or any column privilege), because a role with
--     no privilege on a table never evaluates its policies;
--   * there is no allowlist. A gap is either granted or the policy is scoped
--     `to authenticated`.
-- Known limit: a helper called only from inside another SECURITY INVOKER
-- helper is not a pg_depend edge of the policy and is not seen here.
--
-- Controls: the run must examine pairs, some must hold, and at least one
-- (anon, <helper>, public.listings) pair must be among those examined: the
-- public catalogue is the table the outage took down, so a query that no
-- longer reaches its policies as anon is broken, not clean. (It is not pinned
-- to private.owns_listing: the listings policies have since moved to other
-- helpers, and the control must survive a correct refactor.)
do $$
declare
  total int;
  ok int;
  catalogue_pairs int;
  bad text;
begin
  with dep as (
    select distinct p.polrelid, p.polrelid::regclass::text as tbl, p.polname, p.polroles, d.refobjid as fnoid
      from pg_policy p
      join pg_depend d
        on d.classid = 'pg_policy'::regclass and d.objid = p.oid and d.refclassid = 'pg_proc'::regclass
  ), roles(r) as (values ('anon'), ('authenticated')),
  pairs as (
    select dep.tbl, dep.polname, dep.fnoid, roles.r, f.oid::regprocedure::text as sig
      from dep
      join pg_proc f on f.oid = dep.fnoid
      cross join roles
     where (0::oid = any (dep.polroles) or (select oid from pg_roles where rolname = roles.r) = any (dep.polroles))
       and (has_table_privilege(roles.r, dep.polrelid, 'select,insert,update,delete')
            or has_any_column_privilege(roles.r, dep.polrelid, 'select,insert,update'))
  )
  select count(*),
         count(*) filter (where has_function_privilege(r, fnoid, 'execute')),
         count(*) filter (where r = 'anon' and tbl = 'listings'),
         string_agg(case when not has_function_privilege(r, fnoid, 'execute')
                         then r || ' cannot execute ' || sig || ' (policy ' || tbl || '.' || polname || ')' end, '; ')
    into total, ok, catalogue_pairs, bad
    from pairs;

  if total = 0 then
    raise exception 'PROBE_FAIL db-20: harness broken, 0 policy/function/role pairs examined';
  end if;
  if ok = 0 then
    raise exception 'PROBE_FAIL db-20: harness broken, % pairs and none holds EXECUTE', total;
  end if;
  if catalogue_pairs = 0 then
    raise exception 'PROBE_FAIL db-20: harness broken, no (anon, helper, public.listings) pair was examined';
  end if;
  if bad is not null then
    raise exception 'PROBE_FAIL db-20: % of % pairs cannot be evaluated by the role the policy applies to (42501 on every statement): %', total - ok, total, bad;
  end if;

  raise exception 'PROBE_OK db-20: % policy/function/role pairs, all hold EXECUTE', total;
end;
$$;
