-- ONE PASTE, after the release: run this whole file once in the Supabase SQL editor (project uccixoonmbhrnyczyigt).
-- The agent connector refuses DROP and DELETE, so these cleanups cannot be run from the session.
-- 1. Daily purge of old reminder rows. 2. Seven leftover test functions. 3. Retired objects nothing uses (rt01). 4. The old renter passport (rt02).

-- 1
create or replace function private.purge_old_reminders()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.member_reminders where sent_at < now() - interval '400 days';
  delete from public.viewing_reminders where sent_at < now() - interval '400 days';
$$;

revoke all on function private.purge_old_reminders() from public, anon, authenticated;

select cron.schedule('vallo_purge_old_reminders', '23 3 * * *', 'select private.purge_old_reminders();');

-- 2
drop function if exists private.tmp_probe_rowtype();
drop function if exists private.tmp_probe2();
drop function if exists private.tmp_probe3(uuid);
drop function if exists private.tmp_probe4(uuid);
drop function if exists private.tmp_probe5(uuid);
drop function if exists private.tmp_probe6(uuid, uuid);
drop function if exists private.tmp_probe7(timestamp with time zone);

-- 3
-- DRAFT, not applied. RETIRED OBJECTS 1 of 2 (Part A: safe now).
-- Removes database objects that nothing uses any more: not the new code (this
-- branch), not the old code still serving production (origin/main), not any
-- live function body, trigger, view, RLS policy, cron job, foreign key, column
-- default, check constraint, index expression, or pending migration.
-- Part B (the V-100 renter passport) is rt02 and waits for the deploy.
--
-- HOW THIS WAS CHECKED (13 October 2026, read-only, project uccixoonmbhrnyczyigt)
--   * Every function in public and private (1275, extension-owned skipped) was
--     matched by name, as a whole word, against: every identifier in apps/,
--     packages/ and scripts/ on this branch (database.types.ts excluded, it is
--     generated), the same on origin/main, and supabase/migrations/pending/.
--   * In the database: a whole-word match against every function body
--     (pg_proc.prosrc), pg_depend for the 56 functions written as SQL bodies,
--     pg_policies (all schemas, storage included), cron.job, view definitions,
--     column defaults, check constraints, trigger definitions, event triggers,
--     index expressions and functions in other schemas. A reference held only
--     by another unused object does not count (reachability from live roots).
--   * No Edge Functions are deployed. No dynamic rpc name is built from a
--     prefix of any object below.
--   * supabase/tests: none of these objects is called by a probe.
--
-- WHAT GOES, AND WHY IT IS UNUSED
--   private.room_type_is_public(uuid)       superseded by private.public_room_type_ids()
--                                            (perf_db_2, 28 Sep); no policy or body reads it.
--   private.accommodation_is_public(uuid)   superseded by private.public_accommodation_ids();
--                                            its only reader is room_type_is_public above.
--   private.business_is_public(uuid)        superseded by private.public_business_ids(); its
--                                            comment says RLS reads it, but no policy does now.
--   private.area_visible(uuid)              social foundations (4 Aug); no policy, body or code.
--   private.is_area_moderator(uuid, uuid)   same; policies use private.is_area_member.
--   private.bot_spend_this_month()          social bot helper; no caller anywhere.
--   private.prune_read_notifications(int)   wallet-era housekeeping (30 Jul), never scheduled;
--                                            no cron job, no caller.
--   private.touch_places_cache()            trigger function with no trigger; its table
--                                            (places_cache) no longer exists.
--   private.referral_cap_reason(uuid)       B4 helper no function calls (the engine checks
--                                            caps elsewhere); no code, no probe.
--   public.listing_review_stats(uuid[])     OPS-11 read; no caller in either codebase.
--   public.closed_listing_count()           landlord-line review read; no caller anywhere.
--   public.closed_listing_reasons(uuid[])   same.
--   public.listing_truth_for_lister(uuid)   V-05 lister read; no caller anywhere (the app
--                                            reads public.listing_truth_summary).
--   public.listing_lister_tier (view)       R-SH4 projection; no code, no view, no function
--                                            reads it; nothing depends on it in pg_depend.
--   private.platform_settings (table)       0 rows. Held only custody_structure, which
--                                            track_a1 (25 Sep) deleted; no reader left.
--   private.platform_switches (table)       1 row (bank_payouts = closed, a config row, NOT
--                                            member data). Its only reader,
--                                            private.bank_payouts_open(), was dropped by
--                                            track_a1; no reader left.
--
-- CRON: nothing to unschedule. cron.job holds 40 jobs, every one calls a live
-- function; the old wallet and escrow jobs are already gone.
--
-- NOT HERE ON PURPOSE: private.tmp_probe* (another agent drops them); objects
-- that are unused but part of a feature built and kept (see the audit report,
-- Part C); public.book_viewing_slot(uuid, timestamptz, text), which both
-- codebases still call.
--
-- Every drop is RESTRICT (no CASCADE): if anything does depend on one of
-- these, the statement fails and nothing is lost. Dependents go first.
--
-- RUN IN THE DASHBOARD SQL EDITOR: the agents' migration connector waits on a
-- confirmation for DROP that never arrives (docs/DB_NOTES.md).
-- After it runs: regenerate apps/web/src/lib/supabase/database.types.ts.
-- Probe: supabase/tests/probes-pending/rt01-remove-retired-objects.sql
set lock_timeout = '5s';

-- Functions: the reader before what it reads.
drop function if exists private.room_type_is_public(uuid);
drop function if exists private.accommodation_is_public(uuid);
drop function if exists private.business_is_public(uuid);
drop function if exists private.area_visible(uuid);
drop function if exists private.is_area_moderator(uuid, uuid);
drop function if exists private.bot_spend_this_month();
drop function if exists private.prune_read_notifications(integer);
drop function if exists private.touch_places_cache();
drop function if exists private.referral_cap_reason(uuid);
drop function if exists public.listing_review_stats(uuid[]);
drop function if exists public.closed_listing_count();
drop function if exists public.closed_listing_reasons(uuid[]);
drop function if exists public.listing_truth_for_lister(uuid);

-- Views before tables.
drop view if exists public.listing_lister_tier;

-- Tables.
drop table if exists private.platform_settings;
drop table if exists private.platform_switches;

-- READ-BACK: fails the migration if anything is still here, or if a live
-- replacement went with it.
do $check$
begin
  if to_regprocedure('private.room_type_is_public(uuid)') is not null
     or to_regprocedure('private.accommodation_is_public(uuid)') is not null
     or to_regprocedure('private.business_is_public(uuid)') is not null
     or to_regprocedure('private.area_visible(uuid)') is not null
     or to_regprocedure('private.is_area_moderator(uuid, uuid)') is not null
     or to_regprocedure('private.bot_spend_this_month()') is not null
     or to_regprocedure('private.prune_read_notifications(integer)') is not null
     or to_regprocedure('private.touch_places_cache()') is not null
     or to_regprocedure('private.referral_cap_reason(uuid)') is not null
     or to_regprocedure('public.listing_review_stats(uuid[])') is not null
     or to_regprocedure('public.closed_listing_count()') is not null
     or to_regprocedure('public.closed_listing_reasons(uuid[])') is not null
     or to_regprocedure('public.listing_truth_for_lister(uuid)') is not null
     or to_regclass('public.listing_lister_tier') is not null
     or to_regclass('private.platform_settings') is not null
     or to_regclass('private.platform_switches') is not null then
    raise exception 'rt01: a retired object is still present';
  end if;
  if to_regprocedure('private.public_accommodation_ids()') is null
     or to_regprocedure('private.public_business_ids()') is null
     or to_regprocedure('private.public_room_type_ids()') is null
     or to_regprocedure('private.is_area_member(uuid, uuid)') is null
     or to_regclass('public.listing_lister') is null
     or to_regclass('public.listing_truth_summary') is null then
    raise exception 'rt01: a live replacement is missing';
  end if;
end
$check$;

-- 4
-- DRAFT, not applied. RETIRED OBJECTS 2 of 2 (Part B: after the deploy).
-- Removes the old V-100 renter passport, retired in the app on 13 October
-- 2026 and replaced by the Vallo passport (pass01, pass02). This is item 3 of
-- docs/DB_NOTES.md, with exact signatures and a guard.
--
-- APPLY ONLY WHEN BOTH ARE TRUE:
--   1. pass01_passport_settings.sql has been applied. pass01 reads
--      public.renter_passports once to carry members' choices into
--      public.passport_settings. The guard below refuses to run without it.
--   2. This branch is deployed to production. origin/main still calls these
--      functions today:
--        my_renter_passport          lib/trust/passport-read.ts (twice)
--        renter_passport_for_thread  lib/trust/passport-read.ts
--        passport_shared_here        lib/trust/passport-read.ts
--        set_renter_passport         lib/trust/passport-actions.ts
--        share_renter_passport       lib/trust/passport-actions.ts
--      The new code calls none of them (only comments in pass01 and pass02
--      name them; pass02 does not call private.passport_facts).
--
-- WHAT GOES, AND WHAT READS IT TODAY (13 October 2026)
--   public.share_renter_passport(uuid, boolean)  old main only
--   public.passport_shared_here(uuid)            old main only
--   public.renter_passport_for_thread(uuid)      old main only; calls passport_facts
--   public.set_renter_passport(boolean)          old main only
--   public.my_renter_passport()                  old main only; calls passport_facts
--   private.passport_facts(uuid)                 read only by the two above
--   public.passport_shares (table)               0 rows. Read only by the five
--                                                functions above. No trigger, no
--                                                policy reads it, nothing points at it.
--   public.renter_passports (table)              1 row: ONE MEMBER'S REAL CHOICE
--                                                (passport on or off). pass01 copies
--                                                it into passport_settings; the guard
--                                                below checks the copy before the drop.
--                                                No trigger, nothing points at it.
--
-- KEPT: public.record_vnin_check (still called); private.shares_identity_with
-- (live functions read it).
--
-- After it runs: regenerate apps/web/src/lib/supabase/database.types.ts, and
-- in the same commit take check 5 out of
-- supabase/tests/probes/pass01-passport-settings.sql (it reads
-- public.renter_passports and would fail once the table is gone).
--
-- RUN IN THE DASHBOARD SQL EDITOR: the agents' migration connector waits on a
-- confirmation for DROP that never arrives (docs/DB_NOTES.md).
-- Probe: supabase/tests/probes-pending/rt02-remove-v100-renter-passport.sql
set lock_timeout = '5s';

-- GUARD: pass01 ran, and every explicit V-100 choice is in passport_settings.
do $guard$
declare
  missed integer;
begin
  if to_regclass('public.passport_settings') is null then
    raise exception 'rt02: apply pass01_passport_settings.sql first (public.passport_settings is missing)';
  end if;
  if to_regclass('public.renter_passports') is not null then
    execute $q$
      select count(*) from public.renter_passports rp
       where not exists (select 1 from public.passport_settings s
                          where s.user_id = rp.user_id and s.enabled = rp.enabled)
    $q$ into missed;
    if missed <> 0 then
      raise exception 'rt02: % renter passport choice(s) were not carried into passport_settings', missed;
    end if;
  end if;
end
$guard$;

-- Functions first (callers before what they call), then the tables they read.
drop function if exists public.share_renter_passport(uuid, boolean);
drop function if exists public.passport_shared_here(uuid);
drop function if exists public.renter_passport_for_thread(uuid);
drop function if exists public.set_renter_passport(boolean);
drop function if exists public.my_renter_passport();
drop function if exists private.passport_facts(uuid);
drop table if exists public.passport_shares;
drop table if exists public.renter_passports;

-- READ-BACK
do $check$
begin
  if to_regprocedure('public.share_renter_passport(uuid, boolean)') is not null
     or to_regprocedure('public.passport_shared_here(uuid)') is not null
     or to_regprocedure('public.renter_passport_for_thread(uuid)') is not null
     or to_regprocedure('public.set_renter_passport(boolean)') is not null
     or to_regprocedure('public.my_renter_passport()') is not null
     or to_regprocedure('private.passport_facts(uuid)') is not null
     or to_regclass('public.passport_shares') is not null
     or to_regclass('public.renter_passports') is not null then
    raise exception 'rt02: a V-100 passport object is still present';
  end if;
  if to_regclass('public.passport_settings') is null
     or to_regprocedure('public.record_vnin_check(uuid, text, text, text, boolean, text)') is null
     or to_regprocedure('private.shares_identity_with(uuid, uuid)') is null then
    raise exception 'rt02: a live object went with the passport';
  end if;
end
$check$;
