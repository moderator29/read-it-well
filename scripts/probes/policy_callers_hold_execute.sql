-- EVERY FUNCTION AN RLS POLICY CALLS, AGAINST THE ROLE THAT MUST EVALUATE IT.
--
-- THIS IS THE CHECK THAT WOULD HAVE CAUGHT THE 22 SEPTEMBER OUTAGE, and it is
-- written as a class rather than as that instance. See ledger section 65.
--
-- WHY IT EXISTS. A PostgreSQL RLS policy expression is evaluated AS THE
-- QUERYING ROLE. If that role lacks EXECUTE on a function the expression calls,
-- the statement raises `42501 permission denied for function <name>` and the
-- WHOLE STATEMENT dies. It does not filter a row out. Postgres ORs permissive
-- policies but it must EVALUATE them, so one revoked grant on one helper takes
-- down every read of every table whose policies mention it.
--
-- That happened. `private.owns_listing(uuid)` is called by 17 policies on 10
-- tables, a rule 21 revoke was restated over it, and the entire public
-- catalogue was refused to `anon` AND to `authenticated` for a day. The
-- repository already carried a migration written for that exact outage in July
-- and a ledger section that stated the rule, and it still shipped, because the
-- knowledge was in prose where it needed to be in a check.
--
-- HOW TO RUN. Through `mcp__Supabase__apply_migration` on project
-- `uccixoonmbhrnyczyigt`. It ends in a deliberate `raise exception` either way,
-- so it rolls back and writes nothing. `mcp__Supabase__execute_sql` cannot do
-- this job usefully: it runs as a role with `rolbypassrls`, which answers every
-- question of this kind with a success.
--
-- WHAT IT SKIPS AND WHY THAT IS NOT A HOLE. A role with no privilege at all on
-- a table never evaluates that table's policies, so a missing EXECUTE there is
-- not a defect. Flagging it would fill this check with noise and train people
-- to ignore it. The predicate is therefore "this role can reach this table",
-- read as a table privilege OR any column privilege, which is what
-- `public.listings` needs: it is granted to `anon` column by column and holds
-- no table-wide SELECT at all.
--
-- THE CONTROLS. Two, and both are about the harness rather than the estate.
-- The run fails if it examined ZERO pairs, and it fails if NOT ONE pair held
-- its grant. Either would mean the query is broken and a clean answer
-- meaningless. A check that can only come back green is not a check.
--
-- THE ALLOWLIST IS THE DEBT, WRITTEN DOWN. Three functions are executable by
-- `authenticated` and not by `anon` while the policies calling them apply to
-- PUBLIC. No shipping path reaches them anonymously today. They are named with
-- their reason rather than granted, because widening a grant nobody asked for
-- is the mistake in the other direction. Delete an entry the day it is granted
-- or the day its table is closed to `anon`. A NEW one fails this probe.
--
-- LAST RUN: 2026-09-23, live project.
--   PROBE ALL PASS policy-callers: 371 pairs examined over every RLS policy in
--   the database, 366 hold EXECUTE, 3 known and named exceptions carried in the
--   allowlist with their reason, 0 unexplained.
--
-- AND IT WAS MUTATED, because a check nobody has seen fail is a check nobody
-- should believe. Re-run with `allowed` set to `array[]::text[]`:
--   MUTATION CONFIRMED, THE CHECK BITES: 5 of 371 pairs flagged with the
--   allowlist emptied. [anon cannot evaluate private.attachment_path_access(text),
--   used by storage.objects.message attachments member insert] ... and four more.

do $probe$
declare
  r record;
  bad text := '';
  found integer := 0;
  checked integer := 0;
  control integer := 0;
  allowed text[] := array[
    'private.attachment_path_access(text)|anon',
    'private.can_see_listing_access(uuid)|anon',
    'private.escrow_evidence_path_access(text,boolean)|anon'
  ];
begin
  for r in
    with pol as (
      select p.polrelid, p.polrelid::regclass::text as tbl, p.polname,
             coalesce(pg_get_expr(p.polqual, p.polrelid), '') || ' ' ||
             coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') as expr
        from pg_policy p
    ), fn as (
      select f.oid, n.nspname, f.proname, f.oid::regprocedure::text as sig
        from pg_proc f join pg_namespace n on n.oid = f.pronamespace
       where n.nspname in ('private', 'public')
    )
    select distinct fn.sig, fn.oid, pol.tbl, pol.polname, grantee.role
      from pol
      join fn on pol.expr like '%' || fn.nspname || '.' || fn.proname || '(%'
      cross join (values ('anon'), ('authenticated')) as grantee(role)
     where has_table_privilege(grantee.role, pol.polrelid, 'select')
        or exists (
             select 1 from pg_attribute a
              where a.attrelid = pol.polrelid and a.attnum > 0 and not a.attisdropped
                and has_column_privilege(grantee.role, pol.polrelid, a.attnum, 'select')
           )
     order by 1, 5
  loop
    checked := checked + 1;
    if has_function_privilege(r.role, r.oid, 'execute') then
      control := control + 1;
    elsif (r.sig || '|' || r.role) = any (allowed) then
      null;
    else
      found := found + 1;
      bad := bad || ' [' || r.role || ' cannot evaluate ' || r.sig
                 || ', used by ' || r.tbl || '.' || r.polname || ']';
    end if;
  end loop;

  if checked = 0 then
    raise exception 'PROBE HARNESS BROKEN: it examined 0 policy caller pairs, so a green answer would be meaningless.';
  end if;
  if control = 0 then
    raise exception 'PROBE HARNESS BROKEN: % pairs examined and NOT ONE holds its grant, which is not a believable estate.', checked;
  end if;

  if found > 0 then
    raise exception 'PROBE FAILED: % of % policy caller pairs cannot be evaluated by the role that must evaluate them, which is an outage on those tables.%', found, checked, bad;
  end if;
  raise exception 'PROBE ALL PASS policy-callers: % pairs examined over every RLS policy in the database, % hold EXECUTE, 3 known and named exceptions carried in the allowlist with their reason, 0 unexplained. A policy expression is evaluated as the querying role, so a role that can reach a table and cannot evaluate its policy gets 42501 on every statement rather than an empty result. Rolled back on purpose.', checked, control;
end;
$probe$;
