-- TRACK G 7: THE WHOLE PUBLIC CATALOGUE HAS BEEN REFUSED TO EVERYBODY SINCE
-- 22 SEPTEMBER, AND TRACK G'S OWN MIGRATION 6 DID IT.
--
-- ---------------------------------------------------------------------------
-- WHAT IS BROKEN, MEASURED AND NOT INFERRED
--
-- `private.owns_listing(uuid)` is called by SEVENTEEN RLS policies on TEN
-- tables: listings, listing_photos, listing_videos, listing_amenities,
-- listing_access, listing_mandates, availability, reviews, agent_documents and
-- inspection_requests. A policy expression is evaluated AS THE QUERYING ROLE,
-- so the querying role needs EXECUTE on anything the expression calls.
--
-- `20260922230500_track_g_6_the_firm_arm_on_owns_listing_and_the_publish_gate`
-- added the firm arm to that function with `create or replace`, correctly
-- observed in its own header that `create or replace` PRESERVES grants, and
-- then restated a revoke:
--
--     revoke all     on function private.owns_listing(uuid) from public;
--     revoke execute on function private.owns_listing(uuid) from anon;
--     revoke execute on function private.owns_listing(uuid) from authenticated;
--
-- That is rule 21 applied to a function rule 21 was never about. The result,
-- read off `pg_proc.proacl` today: `{postgres=X/postgres}` and nothing else.
-- `has_function_privilege` answers false for `anon` and false for
-- `authenticated`.
--
-- So `public.listings` carries a FOR ALL policy, `listings_owner_all`, that
-- every role must evaluate, and evaluating it raises `42501 permission denied
-- for function owns_listing`. Postgres ORs permissive policies but it must
-- EVALUATE them, so the error takes the WHOLE STATEMENT down rather than
-- filtering a row out. Proved as a refusal, by switching role inside a
-- transaction that rolled back, with two green controls beside it
-- (`agent_badges` and `amenities` read fine as the same anon role in the same
-- transaction):
--
--   PROBE ALL PASS track-g-before, 8 assertions, 2 controls green. THE PUBLIC
--   CATALOGUE IS REFUSED 42501 TO anon AND TO authenticated over 64 published
--   listings ...
--
-- That is search, the listing page, the map, the shortlist and the sitemap,
-- for signed-out visitors AND for signed-in ones. Only staff and the service
-- role could read a listing.
--
-- ---------------------------------------------------------------------------
-- THIS EXACT OUTAGE HAS A MIGRATION OF ITS OWN FROM JULY, AND IT WAS UNDONE
--
-- `20260730021956_anon_execute_on_rls_helpers.sql` exists for nothing else. Its
-- header describes this failure precisely, names the four helpers an anonymous
-- reader must be able to evaluate, and grants them. `owns_listing` is the
-- second of the four. `20260728152229_listings_core.sql` had already granted it
-- to `authenticated` on the day the function was born.
--
-- And ledger section 53 had already written the rule that decides this:
-- 152 RLS policies across 88 tables call `private.*` functions, a policy
-- expression needs EXECUTE as the QUERYING role, and "22 of the 73 are not a
-- defect, they are load-bearing, and they stay". `owns_listing` is one of the
-- 22. Section 53 avoided this outage by asking what an open grant was FOR.
-- Migration 6 delivered it by not asking.
--
-- ---------------------------------------------------------------------------
-- WHY RESTORING THE GRANT LEAKS NOTHING, WHICH IS THE ONLY QUESTION THAT
-- MATTERS
--
-- `private.owns_listing` is SECURITY DEFINER, STABLE, takes one listing id and
-- returns a BOOLEAN. Both of its arms are keyed on `(select auth.uid())`. For
-- the `anon` role `auth.uid()` is null, so both `exists` clauses are false and
-- the function returns false for every input an anonymous caller can supply.
-- It returns no row, no name, no document and no count. The most an anonymous
-- caller can learn by calling it directly is "false", which is what the July
-- migration said in its own words and what the read-back below re-reads rather
-- than trusts.
--
-- THIS IS A DELIBERATE, NARROW, DOCUMENTED `anon` GRANT, of the kind rule 21
-- allows when it is argued for. A stranger reading a public listing IS
-- anonymous; there is no other role for them to be. What rule 21 forbids is a
-- grant nobody noticed, and the read-back below is how this one stays noticed.
--
-- ---------------------------------------------------------------------------
-- THE SECOND DEFECT, UNDERNEATH THE FIRST
--
-- `public.listings` is granted to `anon` COLUMN BY COLUMN, not table-wide:
-- `pg_class.relacl` gives anon `awdDxtm` with no `r`, and 64 entries in
-- `pg_attribute.attacl` carry `anon=r`. `listing_role` was added by Track G
-- migration 3 and never joined that list, and Track G's read half then put
-- `listing_role` into BOTH `LISTING_SELECT` and `LISTING_DETAIL_SELECT`.
--
-- A missing column privilege fails the WHOLE SELECT, not the column. So even
-- with `owns_listing` restored, every signed-out catalogue read would still
-- raise 42501 on the one column Track G added. One column is granted here, by
-- name, to `anon` only: `authenticated` already holds the table.
--
-- NOTHING ELSE IS GRANTED. The four other Track G columns on `listings` stay
-- dark to `anon` and that is deliberate: `firm_id` is an internal key,
-- `ownership_verified_at` and `mandate_verified_at` are staff decisions that no
-- public read selects, and `supply_verified_by` NAMES THE MEMBER OF STAFF who
-- made one. The read-back asserts all four are still refused, so this file
-- cannot widen by accident.
--
-- ADDITIVE. Two grants and one comment. No function body, table, column,
-- policy, constraint, index or enum value is created, altered or dropped, and
-- nothing anybody legitimately holds is revoked.

/* ------------------------------------------- 1. the policy caller, restored */

grant execute on function private.owns_listing(uuid) to anon;
grant execute on function private.owns_listing(uuid) to authenticated;

comment on function private.owns_listing(uuid) is
  'LOAD-BEARING FOR SEVENTEEN RLS POLICIES ON TEN TABLES, so anon and authenticated MUST hold EXECUTE or every statement against listings, listing_photos, listing_videos, listing_amenities, listing_access, listing_mandates, availability, reviews, agent_documents and inspection_requests raises 42501 for them. A policy expression is evaluated as the querying role. Revoking EXECUTE here is an outage, not a hardening: it has happened twice, on 30 July and again on 22 September. It leaks nothing, because it is keyed on auth.uid() and returns a boolean.';

/* ------------------------------------- 2. the column Track G's read selects */

grant select (listing_role) on public.listings to anon;

/* ---------------------------------------------- 3. read back, in this file */

do $readback$
declare
  bad text := '';
  col text;
begin
  if not has_function_privilege('anon','private.owns_listing(uuid)','execute') then
    bad := bad || ' [anon still cannot evaluate owns_listing]';
  end if;
  if not has_function_privilege('authenticated','private.owns_listing(uuid)','execute') then
    bad := bad || ' [authenticated still cannot evaluate owns_listing]';
  end if;

  /* NOTHING WIDER THAN EXECUTE, read from pg_proc.proacl and not from
     information_schema, which only returns rows where the querying role is
     grantor or grantee and would therefore answer about the observer. */
  if (select count(*) from aclexplode((select proacl from pg_proc where oid = 'private.owns_listing(uuid)'::regprocedure)) a
       where a.grantee = 'anon'::regrole and a.privilege_type <> 'EXECUTE') > 0 then
    bad := bad || ' [anon holds something other than EXECUTE on owns_listing]';
  end if;

  if not has_column_privilege('anon','public.listings','listing_role','select') then
    bad := bad || ' [anon still cannot read listings.listing_role]';
  end if;

  /* A COLUMN GRANT MUST NOT HAVE BECOME A TABLE GRANT. */
  if has_table_privilege('anon','public.listings','select') then
    bad := bad || ' [anon now holds a TABLE-WIDE select on listings]';
  end if;

  /* AND THE FOUR TRACK G COLUMNS THAT MUST STAY DARK. */
  foreach col in array array['firm_id','ownership_verified_at','mandate_verified_at','supply_verified_by'] loop
    if has_column_privilege('anon','public.listings',col,'select') then
      bad := bad || ' [this file exposed listings.' || col || ' to anon]';
    end if;
  end loop;

  if bad <> '' then
    raise exception 'READ-BACK FAILED, the migration did not do what it says:%', bad;
  end if;
  raise notice 'READ-BACK OK: anon and authenticated can evaluate private.owns_listing (EXECUTE only); anon can read listings.listing_role and no other Track G column, and holds no table-wide SELECT on listings.';
end;
$readback$;
