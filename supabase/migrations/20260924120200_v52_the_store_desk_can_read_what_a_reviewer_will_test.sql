-- V-52: THE STORE DESK CAN READ WHAT A REVIEWER WILL TEST.
--
-- The Store panel on `/admin/operations` runs, live, the checks an App Store
-- or Play reviewer will run by hand. Two of them are questions about the
-- database that an operator's own client cannot ask, because the rows are
-- deliberately closed to every client role:
--
--   1. Guideline 1.2 needs a working objectionable-content filter. The filter
--      is `blocked_terms` and `private.objectionable_pattern()`, and neither
--      is readable or executable by `authenticated`, admin or not. Until the
--      23 September seed the table was empty and the pattern was null, which
--      is a filter that matches nothing while every screen said it was on.
--   2. Guideline 1.2 also needs report and block on every user-generated
--      surface. The browser walk (`tests/report.spec.mjs`) proves the
--      controls are drawn; this proves the database will accept what they
--      send: a member holds INSERT on `reports` and `blocks` and each has its
--      own-row insert policy.
--
-- So this is one read, for staff only, returning facts and never rows: a
-- count of terms, whether the pattern compiles to something, and four
-- booleans about grants and policies. No term is returned (the list is how
-- abuse is detected, and publishing it is how it is evaded).
--
-- SECURITY DEFINER WITH AN INTERNAL GUARD, per rule 21: the function checks
-- `private.has_role` for admin or super admin itself and raises otherwise,
-- and EXECUTE is revoked from public and anon and granted to authenticated
-- only so the guard, not the grant, is what answers a member. The nightly
-- run (`/api/cron/store-readiness`) reads it as the service role, which the
-- guard admits by role, never by a missing uid.

create or replace function public.store_readiness_facts()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  caller uuid := (select auth.uid());
begin
  /* Staff, or the nightly run, which uses the service role and has no uid. */
  if (select auth.role()) is distinct from 'service_role'
     and (caller is null
          or not (private.has_role(caller, 'admin'::public.app_role)
                  or private.has_role(caller, 'super_admin'::public.app_role))) then
    raise exception 'staff only' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'blocked_terms', (select count(*) from public.blocked_terms),
    'pattern_ready', (private.objectionable_pattern() is not null),
    'report_insert_grant', has_table_privilege('authenticated', 'public.reports', 'insert'),
    'report_insert_policy', exists (
      select 1 from pg_catalog.pg_policy p
       where p.polrelid = 'public.reports'::regclass and p.polcmd in ('a', '*')
         and p.polname = 'reports_insert_own'),
    'block_insert_grant', has_table_privilege('authenticated', 'public.blocks', 'insert'),
    'block_insert_policy', exists (
      select 1 from pg_catalog.pg_policy p
       where p.polrelid = 'public.blocks'::regclass and p.polcmd in ('a', '*')
         and p.polname = 'blocks_insert_own')
  );
end;
$function$;

comment on function public.store_readiness_facts() is
  'V-52. Staff only. Facts, never rows, for the Store panel on /admin/operations: the objectionable-content filter has terms and a pattern, and a member may insert a report and a block. Returns no term.';

revoke all on function public.store_readiness_facts() from public, anon;
grant execute on function public.store_readiness_facts() to authenticated, service_role;
