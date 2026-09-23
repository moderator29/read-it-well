-- TWO BADGE TIERS, ONE DERIVATION, AND RULE 12 IS UNCHANGED BY IT.
--
-- The founder's instruction: gold for any account we have verified (a hotel, a
-- restaurant, a landlord or landlady, a realtor or an agent), platinum for a
-- platform administrator, drawn everywhere a person appears, from ONE source.
--
-- THE CHAIN THIS EXTENDS, AND DOES NOT REPLACE.
--
--   agent_verification_checks   one row per rung, each a named member of
--        |                      staff's recorded decision
--        |  private.agent_tier via private.sync_agent_verification_tier
--        v
--   agents.verification_tier    rungs passed with no gap below them, 0 to 4
--        |  private.sync_agent_badge
--        v
--   agent_badges.verified       := verification_tier >= 1, the published fact
--        |
--        |  public.is_checked_person  +  public.is_platform_staff
--        |  ordered by public.badge_tier
--        v
--   public.person_badge.tier    and public.agent_badges.tier
--
-- Nothing above the line moved. The tier is a READING of the published fact,
-- not a new fact, which is why gold cannot exist without a rung.
--
-- WHY THERE IS A VIEW AS WELL AS A COLUMN, AND WHY THAT IS NOT A SECOND
-- DERIVATION. agent_badges is keyed by AGENT. The founder is not an agent and
-- never will be, and neither is a hotel's owner or a member of staff, so a row
-- keyed by agent cannot carry the badge of every person a screen draws a name
-- for. public.person_badge is keyed by the PERSON and is the door those screens
-- read. It is a VIEW: it stores nothing, so it cannot hold a state that
-- disagrees with the chain, and there is nothing to keep in step. The column on
-- agent_badges is the same answer for the same person, written by one function,
-- kept honest by triggers on all three of its inputs, and it exists so a
-- listing read that already joins agent_badges gets the tier without a second
-- query. Both compute from public.badge_tier, public.is_platform_staff and
-- public.is_checked_person, and each of those three says its thing exactly once.
--
-- PRECEDENCE, DECIDED AND WRITTEN INTO THE DERIVATION RATHER THAN EACH
-- RENDERER. Platinum beats gold. A person can hold both; a screen draws one
-- mark. Gold says Vallo checked this person's identity documents. Platinum says
-- this person IS Vallo. On a screen where somebody is deciding whether to trust
-- a message, being told they are talking to the platform is the larger fact,
-- and drawing gold would hide it behind the smaller one. Because it is
-- public.badge_tier(boolean, boolean) and nothing else, no component can
-- decide differently and no second answer can appear on another screen.
--
-- GOLD IS EARNED AT A CHECK, NEVER AT AN APPROVAL. public.is_checked_person
-- reads only agent_badges.verified and businesses.verified. Both are derived
-- from their own ladders by trigger and constrained
-- (agents_verified_means_identity_chk, businesses_verified_means_identity_chk),
-- so neither can be true without a passed rung. There is no hand-set boolean
-- anywhere on this path. That is the defect of
-- 20260919230000_p2_a_verified_agent_means_a_person_was_checked staying closed.
--
-- PLATINUM COMES FROM THE ROLE THAT ALREADY EXISTS. public.is_platform_staff is
-- private.has_role over public.user_roles, the estate's source of truth for who
-- is staff, written through user_roles_admin_manage by a super_admin. No new
-- flag, no new column, no new table.
--
-- ---------------------------------------------------------------------------
-- THE GRANT THAT WAS MEASURED RATHER THAN ASSUMED, AND IT IS THE 22 SEPTEMBER
-- OUTAGE IN A SECOND COSTUME.
--
-- A non-invoker view checks TABLE access as the view owner. It does NOT check
-- FUNCTION execute that way: a function called in the view body is checked
-- against the QUERYING role, exactly as an RLS policy expression is. A first
-- draft of this file kept the three helpers in `private` and locked, and a
-- rolled-back probe as `anon` answered:
--
--   ERROR: 42501: permission denied for function badge_tier
--
-- and it would have taken the badge off every public surface the day it landed.
-- The same probe showed the trap inside the trap: `select count(*) from
-- public.person_badge` SUCCEEDED in that run, because count(*) never evaluates
-- the column, so a check that counted rows would have gone green over a view
-- nobody could read. The probe below selects the COLUMN.
--
-- So the three helpers live in `public` and are granted to `anon` and
-- `authenticated` deliberately, with the reason, and to nobody else. Rule 21 is
-- honoured in its own terms: nothing here is born public. Every function has
-- its default PUBLIC grant revoked first, and the only ones granted back are
-- the three a stranger must evaluate to read a badge, which is section 53's
-- "load-bearing, and they stay". The one function nobody needs to call,
-- private.refresh_agent_badge_tier, is revoked and granted back to nobody.
--
-- NO REVOKE HERE TOUCHES ANYTHING ANYBODY ALREADY HOLDS. Six of the seven
-- functions revoked over are created by this file. The seventh,
-- private.sync_agent_badge, already carried this exact revoke from
-- 20260809160547_the_verified_badge_follows_kyc_not_the_demo_flag, so restating
-- it takes nothing from anybody. Checked against
-- scripts/probes/policy_callers_hold_execute.sql on the live project after this
-- file landed: 371 pairs examined, 366 hold EXECUTE, 3 allowlisted, 0
-- unexplained, and NONE of the seven appears in any RLS policy expression.
--
-- SECTION 65'S TWIN RULE FOR A VIEW. pg_default_acl on this project grants
-- arwdDxtm on every new relation in public to anon and authenticated, and a
-- non-invoker view WRITES as its owner. public.person_badge is therefore born
-- able to write to user_roles, agents and businesses with RLS bypassed, by an
-- anonymous caller. Everything is revoked and only SELECT granted back.
--
-- WHAT IS DELIBERATELY PUBLIC, SAID PLAINLY. public.user_roles is not readable
-- by a stranger (its policies are own-row or admin). This view publishes, for
-- anybody who holds a badge, that they are staff. That is not a leak, it is the
-- instruction: a platinum badge IS a public declaration that this person is
-- Vallo. It is held to the minimum that allows that: two columns, no names, and
-- it does not distinguish admin from super_admin.
--
-- A CONTROL IN THE FIRST DRAFT OF THIS FILE CARRIED A STALE PREMISE, AND IT IS
-- RECORDED RATHER THAN QUIETLY DELETED. It asserted that public.agent_trust
-- kept its grant to BOTH anon and authenticated, copied from the P2 probe of 19
-- September. That is no longer true and has not been since 22 September:
-- 20260922123239_the_escrow_doors_are_locked_and_trust_stops_answering_strangers
-- revoked it from anon on purpose. The read-back below now asserts what is true
-- today, which is that authenticated holds it and anon does not, and that this
-- file moved neither.
--
-- ADDITIVE. One type, one column with a default, one view, three new public
-- functions, three new private ones, two new triggers, one function replaced.
-- Nothing is dropped and no data is lost.
--
-- ---------------------------------------------------------------------------
-- PROBE, run through `apply_migration` AGAINST THE APPLIED OBJECTS rather than
-- against a copy of this text, in one transaction ended by a deliberate
-- `raise exception` so everything rolls back and no row is left in a live
-- product table. Section 63's lesson: a harness that lifts the migration TEXT
-- is testing the text, not the estate.
--
-- EVERY COLUMN OF REFUSALS HAS A CONTROL IN THE SAME TRANSACTION THAT MUST
-- SUCCEED. Step 2's refusals sit beside a read of agent_badges that must return
-- rows; step 7's refusal sits beside a read of the very row it then fails to
-- write, so a refusal cannot be an absence.
--
-- THE FIXTURE IS CHOSEN BY THE PREDICATE UNDER TEST: a user with no agent row
-- who is not staff, because that is what the write under test does.
--
-- RESULT, live project, 23 September 2026:
--
--   PROBE ALL PASS badge tiers: grants born locked with the three view helpers
--   granted deliberately to anon and authenticated and to nobody else,
--   person_badge SELECT-only for the two readers and it refused an anon insert,
--   derive_agent_badge and agent_trust both undisturbed; a SIGNED-OUT reader
--   sees the founder as PLATINUM while reading 0 rows of user_roles directly;
--   approval at tier 0 drew NO badge on either door; one passed identity rung
--   drew GOLD on BOTH doors in the same statement; the same person granted
--   admin read PLATINUM on both and fell back to GOLD when the role was
--   withdrawn; a signed-in caller who demonstrably CAN read the row could not
--   write platinum into it. Rolled back on purpose.
--
-- The probe text is kept in scripts/probes/badge_tiers.sql so it can be re-run
-- rather than re-typed.
-- ---------------------------------------------------------------------------

/* ------------------------------------------------------ 1. the vocabulary */

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'public' and t.typname = 'badge_tier') then
    create type public.badge_tier as enum ('none', 'gold', 'platinum');
  end if;
end;
$$;

/* ------------------------------------- 2. the precedence, written ONCE */

create or replace function public.badge_tier(is_staff boolean, is_checked boolean)
returns public.badge_tier
language sql
immutable
as $$
  select case
           when coalesce(is_staff, false)   then 'platinum'
           when coalesce(is_checked, false) then 'gold'
           else 'none'
         end::public.badge_tier;
$$;

comment on function public.badge_tier(boolean, boolean) is
  'The precedence between the two badge tiers, and the only place it is written. Platinum beats gold, because the two answer different questions and the more consequential one must win: gold says Vallo checked this person''s identity documents, platinum says this person IS Vallo. A reader weighing a message from somebody needs to know they are talking to the platform; drawing gold on a member of staff who is also a checked agent would hide the larger fact behind the smaller one. It is a property of the derivation and not of any renderer, so no screen can choose differently.';

/* -------------------------------- 3. who is staff, written ONCE */

create or replace function public.is_platform_staff(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    private.has_role(check_user_id, 'admin'::app_role)
    or private.has_role(check_user_id, 'super_admin'::app_role),
    false);
$$;

comment on function public.is_platform_staff(uuid) is
  'Platinum''s source. It adds no new idea of who staff are: it is private.has_role over public.user_roles, which is already the estate''s source of truth for staff, and a role is granted through user_roles_admin_manage by a super_admin. Never a flag anybody types.';

/* ------------------------- 4. who has been checked by a person, written ONCE */

create or replace function public.is_checked_person(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
      from public.agents a
      join public.agent_badges ab on ab.agent_id = a.id
     where a.user_id = check_user_id
       and ab.verified
  ) or exists (
    select 1
      from public.businesses b
     where b.owner_id = check_user_id
       and b.verified
  );
$$;

comment on function public.is_checked_person(uuid) is
  'Gold''s source, and rule 12 lives here. It reads only the two PUBLISHED derived facts, agent_badges.verified (which private.sync_agent_badge writes as agents.verification_tier >= 1, and the tier is counted by private.agent_tier off the rungs in agent_verification_checks, each one a named member of staff''s recorded decision) and businesses.verified (derived the same way by private.derive_business_badge off business_verification_checks). There is no hand-set boolean on either path: agents.verified carries agents_verified_means_identity_chk and businesses.verified carries businesses_verified_means_identity_chk, so neither can be true without a rung. Gold is therefore earned at a check and never at an approval.';

/* ---------------- 5. the published projection, keyed by the PERSON */

create or replace view public.person_badge as
  with candidates as (
    select ur.user_id from public.user_roles ur
    union
    select a.user_id from public.agents a
    union
    select b.owner_id as user_id from public.businesses b where b.owner_id is not null
  )
  select c.user_id,
         public.badge_tier(public.is_platform_staff(c.user_id),
                           public.is_checked_person(c.user_id)) as tier
    from candidates c
   where public.is_platform_staff(c.user_id)
      or public.is_checked_person(c.user_id);

comment on view public.person_badge is
  'THE published badge, keyed by the person, and the one door every surface that draws a name reads. A VIEW and not a table on purpose: it holds no state of its own, so it cannot drift from the chain it is computed off and there is nothing to keep in step. An absent row means no badge, which is the correct failure direction: the failure mode of this must be a mark that does not appear, never a mark that appears with no check behind it. Two columns only, and deliberately: it names nobody and it does not say WHICH staff role a platinum holder has.';

/* ------------------- 6. the same published row carries which tier */

alter table public.agent_badges
  add column if not exists tier public.badge_tier not null default 'none';

comment on column public.agent_badges.tier is
  'Which badge this agent''s person draws, from the same derivation as public.person_badge and by the same three sources. Written only by private.refresh_agent_badge_tier; never by hand. It is here so that a listing surface, which already joins agent_badges by agent_id, gets the tier without a second read, and so that this row and the person view can never say different things on two screens.';

/* ------------------------- 7. the one writer of that column */

create or replace function private.refresh_agent_badge_tier(check_user_id uuid)
returns void
language sql
security definer
set search_path to 'public'
as $$
  update public.agent_badges ab
     set tier = public.badge_tier(public.is_platform_staff(check_user_id),
                                  public.is_checked_person(check_user_id)),
         updated_at = now()
    from public.agents a
   where a.id = ab.agent_id
     and a.user_id = check_user_id
     and ab.tier is distinct from
         public.badge_tier(public.is_platform_staff(check_user_id),
                           public.is_checked_person(check_user_id));
$$;

revoke execute on function private.refresh_agent_badge_tier(uuid) from public, anon, authenticated;

/* -------- 8. the ladder trigger writes verified, then asks for the tier */

create or replace function private.sync_agent_badge()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  is_verified boolean;
begin
  is_verified := coalesce(new.verification_tier, 0) >= 1;

  insert into public.agent_badges (agent_id, verified, verified_at, updated_at)
  values (new.id, is_verified, case when is_verified then now() else null end, now())
  on conflict (agent_id) do update
    set verified = excluded.verified,
        /* The date the badge was EARNED, kept across later recomputations that
           leave it true. Recomputing the tier because a payout rung passed must
           not restamp the day the identity check was signed off. */
        verified_at = case
          when excluded.verified and public.agent_badges.verified then public.agent_badges.verified_at
          when excluded.verified then now()
          else null
        end,
        updated_at = now();

  /* The tier is ASKED FOR rather than computed here, so that this function
     holds no second copy of the rule. By this line the published `verified` is
     already written, so the refresh reads a settled row and nothing lags. */
  perform private.refresh_agent_badge_tier(new.user_id);

  return new;
end;
$$;

revoke execute on function private.sync_agent_badge() from public, anon, authenticated;

/* ------------- 9. the two doors that would otherwise let the copy drift */

create or replace function private.refresh_agent_badge_tier_on_roles()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform private.refresh_agent_badge_tier(coalesce(new.user_id, old.user_id));
  return null;
end;
$$;

revoke execute on function private.refresh_agent_badge_tier_on_roles() from public, anon, authenticated;

drop trigger if exists user_roles_refresh_agent_badge_tier on public.user_roles;
create trigger user_roles_refresh_agent_badge_tier
  after insert or update or delete on public.user_roles
  for each row execute function private.refresh_agent_badge_tier_on_roles();

create or replace function private.refresh_agent_badge_tier_on_business()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.owner_id is not null then
    perform private.refresh_agent_badge_tier(new.owner_id);
  end if;
  if tg_op = 'UPDATE' and old.owner_id is not null and old.owner_id is distinct from new.owner_id then
    perform private.refresh_agent_badge_tier(old.owner_id);
  end if;
  return null;
end;
$$;

revoke execute on function private.refresh_agent_badge_tier_on_business() from public, anon, authenticated;

drop trigger if exists businesses_refresh_agent_badge_tier on public.businesses;
create trigger businesses_refresh_agent_badge_tier
  after insert or update of verified, owner_id on public.businesses
  for each row execute function private.refresh_agent_badge_tier_on_business();

/* ------------------------------------------------------- 10. the backfill */

update public.agent_badges ab
   set tier = public.badge_tier(public.is_platform_staff(a.user_id),
                                public.is_checked_person(a.user_id))
  from public.agents a
 where a.id = ab.agent_id
   and ab.tier is distinct from public.badge_tier(public.is_platform_staff(a.user_id),
                                                  public.is_checked_person(a.user_id));

/* ----------------------------------------- 11. the grants, each deliberate */

revoke all on function public.badge_tier(boolean, boolean)  from public;
revoke all on function public.is_platform_staff(uuid)       from public;
revoke all on function public.is_checked_person(uuid)       from public;
grant execute on function public.badge_tier(boolean, boolean) to anon, authenticated;
grant execute on function public.is_platform_staff(uuid)      to anon, authenticated;
grant execute on function public.is_checked_person(uuid)      to anon, authenticated;

revoke all on public.person_badge from public, anon, authenticated;
grant select on public.person_badge to anon, authenticated;

/* --------------------------- 12. the grants, READ BACK in this same body */

do $readback$
declare
  acl text;
begin
  if has_function_privilege('anon', 'private.refresh_agent_badge_tier(uuid)', 'execute')
     or has_function_privilege('authenticated', 'private.refresh_agent_badge_tier(uuid)', 'execute') then
    raise exception 'READBACK: refresh_agent_badge_tier is reachable by a signed-in caller';
  end if;
  if has_function_privilege('anon', 'private.sync_agent_badge()', 'execute')
     or has_function_privilege('authenticated', 'private.sync_agent_badge()', 'execute') then
    raise exception 'READBACK: sync_agent_badge is reachable by a signed-in caller';
  end if;
  if not has_function_privilege('anon', 'public.badge_tier(boolean,boolean)', 'execute')
     or not has_function_privilege('anon', 'public.is_platform_staff(uuid)', 'execute')
     or not has_function_privilege('anon', 'public.is_checked_person(uuid)', 'execute') then
    raise exception 'READBACK: anon cannot evaluate a helper the view calls, so the view refuses the whole statement';
  end if;
  if not has_function_privilege('authenticated', 'public.badge_tier(boolean,boolean)', 'execute')
     or not has_function_privilege('authenticated', 'public.is_platform_staff(uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.is_checked_person(uuid)', 'execute') then
    raise exception 'READBACK: authenticated cannot evaluate a helper the view calls';
  end if;

  select string_agg(p.proacl::text, ' | ') into acl
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in ('badge_tier', 'is_platform_staff', 'is_checked_person');
  if acl is null or acl ~ '(^|[^a-z_])=X' then
    raise exception 'READBACK: a helper is still granted to PUBLIC: %', coalesce(acl, '(null proacl, which means the default open grant)');
  end if;

  select c.relacl::text into acl
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'person_badge';
  if acl is null or acl not like '%anon=r/%' or acl not like '%authenticated=r/%' then
    raise exception 'READBACK: person_badge does not hold SELECT for the two reader roles: %', coalesce(acl, '(null)');
  end if;
  if acl ~ '(anon|authenticated)=r[awdDxtm]' then
    raise exception 'READBACK: person_badge is still writable by a reader role: %', acl;
  end if;

  -- CONTROL: the two grants on public.agent_trust as they actually stand since
  -- 20260922123239, which this file must have moved neither way.
  if not has_function_privilege('authenticated', 'public.agent_trust(uuid)', 'execute') then
    raise exception 'READBACK: this file took agent_trust away from authenticated';
  end if;
  if has_function_privilege('anon', 'public.agent_trust(uuid)', 'execute') then
    raise exception 'READBACK: this file handed agent_trust back to anon, undoing a deliberate revoke';
  end if;
end;
$readback$;
