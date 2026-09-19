-- P2. A verified agent means a person was checked, and there is only one
-- derivation of that fact left that can be written.
--
-- WHAT WAS OPEN. R2's audit, `docs/design/audits/R2-content-truth-and-carried-items.md`
-- section 4: the verified badge has TWO derivations and they disagree on the
-- happy path.
--
--   A, correct: `agent_verification_checks` -> `private.agent_tier()` ->
--   `agents.verification_tier` -> `private.sync_agent_badge()` ->
--   `agent_badges.verified`, which is `verification_tier >= 1`. Read by every
--   listing surface, by stays and restaurants through the catalogue
--   projection, by the agent dashboard and by `/agent/verification`.
--
--   B, wrong: `agents.verified`, a hand-set boolean, read by messaging, by the
--   social profile badge and by the chat listing chip.
--
-- The write that split them was `verified: true` in the agent application
-- approval in `apps/web/src/lib/admin/actions.ts`, set at
-- `verification_tier = 0`, before one document had been looked at, with a
-- notification on the next line titled "You are a verified Vallo agent". From
-- the first approval onward: a tick in every message thread and on the social
-- profile, no tick on any listing behind them, and their own dashboard saying
-- they have not started. A reader deciding whether to send a deposit sees the
-- tick in the thread and not on the listing, and cannot tell which screen is
-- lying.
--
-- RULE 12 IS ABSOLUTE: the verified badge only ever means a human was checked.
-- A badge awarded at tier 0 is a lie told by the product about a stranger's
-- trustworthiness on a surface where people send deposits.
--
-- THIS IS NOT VISIBLE TODAY AND THE FILE WILL NOT OVERSTATE IT. Read live,
-- aggregates only, before this migration: 1 agent row, 0 with
-- `verified = true`, 0 with `agent_badges.verified = true`, 0 rows that would
-- fail the constraint below. It fires on the FIRST approval, not now. That is
-- the argument for doing it today rather than in a month: the constraint
-- applies clean while nobody is in the wrong state, and it will not once
-- anybody is.
--
-- THE PRECEDENT IS ALREADY DECIDED THE OTHER WAY FOR BUSINESSES. M15,
-- `20260918120500`, gave `public.businesses` both halves: the constraint
-- `businesses_verified_means_identity_chk` and a BEFORE trigger,
-- `private.derive_business_badge()`, that derives the column from the tier on
-- every write. Businesses cannot have this bug. Agents can, only because that
-- table is older. This file gives agents the same two halves, in the same
-- shape, with the same names.
--
-- ---------------------------------------------------------------------------
-- THE THING R2 DID NOT SEE, AND IT DECIDES THE SHAPE OF THIS FILE.
--
-- `public.agents.verified` is `boolean NOT NULL DEFAULT TRUE`. So removing
-- `verified: true` from the approval upsert does NOT, on its own, stop a new
-- agent being marked verified: the column default puts it back. Worse, once
-- the constraint below exists, an insert that omits the column would default
-- to true at tier 0, VIOLATE the constraint, and fail the whole approval. So
-- the default must move to false in this same file or the constraint takes
-- agent approval down with it.
--
-- AND THE SAME FACT DECIDES WHY THE COLUMN IS DERIVED RATHER THAN SIMPLY
-- FROZEN. R2's four steps, applied literally, would leave `agents.verified`
-- false for ever, and there are three live readers of it that are not the
-- messaging read R2 names:
--
--   `public.agent_trust(uuid)`, which awards 30 of its 100 trust points for
--   `verified and status = 'APPROVED'`. Frozen false, a genuinely checked
--   agent would silently lose 30 points they had earned.
--
--   `public.enforce_demo_listing_has_unverified_lister()` and
--   `private.enforce_demo_business_has_unverified_agent()`, which both read
--   `a.verified or a.verification_tier > 0`, so they keep working either way.
--
-- Deriving the column, exactly as M15 derives the business one, leaves every
-- one of those three reading the truth without a single one of them being
-- re-emitted. `agent_trust` is therefore NOT touched by this file, which also
-- means its deliberate `anon, authenticated` execute grant is not disturbed;
-- the probe asserts that grant is still there afterwards.
--
-- ---------------------------------------------------------------------------
-- WHAT THIS FILE DOES. Four things, and none of them drops anything.
--
--   1. `public.agents.verified` gets DEFAULT false, and a comment saying it is
--      derived. It is no longer a field anybody fills in.
--   2. `private.derive_agent_badge()`, a BEFORE INSERT OR UPDATE trigger on
--      `verification_tier, verified`, sets `verified := verification_tier >= 1`.
--      A caller who writes `verified = true` by hand has it overwritten rather
--      than refused, which is the same behaviour `private.derive_business_badge()`
--      has had since M15, and it means no existing caller starts erroring.
--   3. `agents_verified_means_identity_chk`, the constraint the businesses
--      table has already carried for a day. Belt to the trigger's braces, and
--      the thing that makes the bad state unrepresentable even if somebody
--      later disables the trigger for a bulk load.
--   4. `private.award_agent_badges()` is repointed at the tier rather than the
--      boolean, and its caption is corrected. It read "Identity and payout
--      account verified, application approved", which claims TWO rungs,
--      identity and payout, where tier 1 proves one, and which was being
--      awarded when NEITHER had been looked at. It now reads "Identity checked
--      by a person at Vallo", which is what tier 1 means in the ladder's own
--      words at `apps/web/src/lib/trust/verification.ts`.
--
-- R2 ALSO ASKED FOR THE BADGE TRIGGER TO BE MOVED so a tier climb awards the
-- badge. It does not need moving: `agents_award_badges_after_write` is already
-- `AFTER INSERT OR UPDATE` with NO column list, so it fires on a
-- `verification_tier` write as it stands. Read off `pg_get_triggerdef` rather
-- than assumed, and left alone. `private.award_badge` is `on conflict do
-- nothing`, so firing it on every write to the row is free.
--
-- WHAT THIS FILE DOES NOT DO, AND IT IS R2's STEP 5. It does not drop
-- `agents.verified`. Once the column can only be true at tier 1 or above it is
-- a slower copy of `agent_badges.verified` and should eventually go, leaving
-- one published fact. That IS a data-losing migration, it is on the stop list,
-- and it needs the founder's word. Named here and taken no further.
--
-- ADDITIVE. One column default, one column comment, one constraint, one new
-- function and its trigger, one function replaced. No column, table, enum
-- value, policy, index or foreign key is dropped, and no grant anybody
-- legitimately holds is revoked.
--
-- RULE 21, BORN LOCKED. `private.derive_agent_badge()` is created here and
-- revokes EXECUTE from `public`, `anon` and `authenticated` in this same file,
-- because Supabase's default privileges would otherwise hand it to every
-- signed-in caller the moment it existed. It is granted back to nobody: it is
-- a trigger function and the trigger runs it as the table owner.
-- `private.award_agent_badges()` is replaced rather than created and already
-- carries that revoke from `20260804121638`; the revoke is re-stated anyway so
-- the file is self-contained, and the probe PROVES both rather than assuming.
--
-- ---------------------------------------------------------------------------
-- PROBE, run through `apply_migration`. One transaction ended by a deliberate
-- `raise exception` so the whole thing rolls back and no test row is left in a
-- live product table. It fails loudly on the first assertion that does not
-- hold.
--
-- THE FIXTURE IS CHOSEN BY THE PREDICATE UNDER TEST AND NEVER POSITIONALLY.
-- Two false reds on this estate in one day came from taking the first or the
-- second row of `auth.users`: the first is a verified agent and the second is
-- banned with no confirmed email. This probe asks for a user who has NO agent
-- row, because that is what the write under test does, and raises if the
-- estate cannot supply one.
--
-- WHAT IT PROVES
--   1. RULE 21, read off `has_function_privilege`: neither
--      `private.derive_agent_badge` nor `private.award_agent_badges` is
--      executable by `anon` or `authenticated`. And the deliberate grant this
--      file must NOT have disturbed is still there: `public.agent_trust` is
--      still executable by both.
--   2. THE APPROVAL WRITE CANNOT LIGHT THE BADGE ANY MORE. An agent inserted
--      exactly as the approval inserts one, APPROVED, and with
--      `verified => true` forced on top for good measure, comes out
--      `verified = false` at tier 0. This is the assertion the whole file
--      turns on.
--   3. NOTHING DOWNSTREAM LIT EITHER: no `agent_badges.verified`, and no
--      `verified_agent` row in `user_badges`. That is the messaging tick and
--      the social profile badge, both dark, for an agent nobody has checked.
--   4. A REAL CHECK LIGHTS IT. One passed `identity` rung takes the tier to 1,
--      and in the same statement `verified` becomes true,
--      `agent_badges.verified` becomes true, and the social badge is awarded
--      with the CORRECTED caption and not the old two-rung claim.
--   5. THE CONSTRAINT HOLDS EVEN WITHOUT THE TRIGGER. With the derive trigger
--      disabled, a forced `verified = true` at tier 0 is refused with
--      `23514 check_violation`.
--   6. THE RLS CROSS-USER READ THAT MUST FAIL, and it is not vacuous: the
--      agent row demonstrably EXISTS in this transaction, and a stranger
--      wearing an `authenticated` JWT reads ZERO rows of `public.agents`. The
--      MCP `execute_sql` tool can never show this, because the role it runs as
--      carries `rolbypassrls`; this probe sets the role itself.
--
--   begin;
--
--   do $probe$
--   declare
--     fixture  uuid;
--     stranger uuid;
--     ag       uuid;
--     v        boolean;
--     t        smallint;
--     caption  text;
--     n        integer;
--     leaked   integer;
--   begin
--     -- 1. the grants, born locked, and the one grant that must survive
--     if has_function_privilege('anon', 'private.derive_agent_badge()', 'execute')
--        or has_function_privilege('authenticated', 'private.derive_agent_badge()', 'execute') then
--       raise exception 'FAIL 1: derive_agent_badge is reachable by a signed-in caller';
--     end if;
--     if has_function_privilege('anon', 'private.award_agent_badges()', 'execute')
--        or has_function_privilege('authenticated', 'private.award_agent_badges()', 'execute') then
--       raise exception 'FAIL 1: award_agent_badges is reachable by a signed-in caller';
--     end if;
--     if not has_function_privilege('anon', 'public.agent_trust(uuid)', 'execute')
--        or not has_function_privilege('authenticated', 'public.agent_trust(uuid)', 'execute') then
--       raise exception 'FAIL 1: this file disturbed the deliberate public grant on agent_trust';
--     end if;
--
--     -- the fixture, by the predicate under test: somebody with no agent row.
--     select u.id into fixture
--       from auth.users u
--      where not exists (select 1 from public.agents a where a.user_id = u.id)
--      order by u.created_at
--      limit 1;
--     if fixture is null then
--       raise exception 'PROBE NEEDS ONE AUTH USER WITH NO AGENT ROW AND THE ESTATE HAS NONE';
--     end if;
--     select u.id into stranger from auth.users u where u.id <> fixture order by u.created_at limit 1;
--     if stranger is null then
--       raise exception 'PROBE NEEDS A SECOND AUTH USER TO STAND IN AS THE STRANGER';
--     end if;
--
--     -- 2. the approval write, with verified forced true on top of it
--     insert into public.agents (user_id, display_name, type, status, verified)
--     values (fixture, 'Probe agent, rolled back', 'individual', 'APPROVED', true)
--     returning id, verified, verification_tier into ag, v, t;
--     if v is not false then
--       raise exception 'FAIL 2: an agent was marked verified at approval, tier %', t;
--     end if;
--     if t <> 0 then
--       raise exception 'FAIL 2: a brand new agent is at tier % and should be 0', t;
--     end if;
--
--     -- 3. nothing downstream lit
--     if coalesce((select ab.verified from public.agent_badges ab where ab.agent_id = ag), false) then
--       raise exception 'FAIL 3: agent_badges.verified is true for an agent nobody has checked';
--     end if;
--     select count(*) into n from public.user_badges
--      where user_id = fixture and badge_code = 'verified_agent';
--     if n <> 0 then
--       raise exception 'FAIL 3: the social profile badge was awarded at tier 0';
--     end if;
--
--     -- 4. a real check lights every one of them
--     insert into public.agent_verification_checks (agent_id, kind, status)
--     values (ag, 'identity', 'passed');
--     select a.verified, a.verification_tier into v, t from public.agents a where a.id = ag;
--     if t < 1 then
--       raise exception 'FAIL 4: a passed identity rung left the tier at %', t;
--     end if;
--     if v is not true then
--       raise exception 'FAIL 4: tier % and the column is still false', t;
--     end if;
--     if not coalesce((select ab.verified from public.agent_badges ab where ab.agent_id = ag), false) then
--       raise exception 'FAIL 4: agent_badges.verified did not follow the tier';
--     end if;
--     select ub.reason into caption from public.user_badges ub
--      where ub.user_id = fixture and ub.badge_code = 'verified_agent';
--     if caption is null then
--       raise exception 'FAIL 4: the social profile badge was not awarded at tier 1';
--     end if;
--     if caption ilike '%payout%' then
--       raise exception 'FAIL 4: the badge still claims a payout rung nobody looked at: %', caption;
--     end if;
--     if caption not ilike '%Identity checked by a person%' then
--       raise exception 'FAIL 4: the badge caption is not the corrected one: %', caption;
--     end if;
--
--     -- 5. the constraint holds with the trigger out of the way
--     alter table public.agents disable trigger agents_derive_badge;
--     begin
--       update public.agents set verified = true, verification_tier = 0 where id = ag;
--       alter table public.agents enable trigger agents_derive_badge;
--       raise exception 'FAIL 5: verified = true at tier 0 was accepted';
--     exception when check_violation then
--       null;
--     end;
--     alter table public.agents enable trigger agents_derive_badge;
--
--     -- 6. the cross-user read that must fail, and it is not vacuous
--     if not exists (select 1 from public.agents where id = ag) then
--       raise exception 'FAIL 6: the read would be vacuous, the agent row is not here';
--     end if;
--     perform set_config('request.jwt.claims',
--                        json_build_object('sub', stranger, 'role', 'authenticated')::text, true);
--     perform set_config('role', 'authenticated', true);
--     select count(*) into leaked from public.agents where id = ag;
--     perform set_config('role', 'postgres', true);
--     if leaked <> 0 then
--       raise exception 'FAIL 6: a stranger read % agent rows that are not theirs', leaked;
--     end if;
--
--     raise exception 'PROBE ALL PASS p2 a verified agent means a person was checked: approval leaves the badge dark at tier 0 on all three surfaces, one passed identity rung lights all three with the corrected caption, the constraint refuses the bad state with the trigger disabled, a stranger read 0 agent rows, and agent_trust kept its public grant. Rolled back on purpose.';
--   end;
--   $probe$;
--
--   rollback;
-- ---------------------------------------------------------------------------

/* ------------------------------------------------ 1. the column is derived */

alter table public.agents
  alter column verified set default false;

comment on column public.agents.verified is
  'The badge. True only once the identity rung has passed, which is verification_tier >= 1. Derived by trigger from the tier; never written by hand. agent_badges.verified is the published copy every listing surface reads.';

/* --------------------------------------------- 2. the derivation, as M15 */

create or replace function private.derive_agent_badge()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.verified := coalesce(new.verification_tier, 0) >= 1;
  return new;
end;
$$;

revoke execute on function private.derive_agent_badge() from public, anon, authenticated;

drop trigger if exists agents_derive_badge on public.agents;
create trigger agents_derive_badge
  before insert or update of verification_tier, verified on public.agents
  for each row execute function private.derive_agent_badge();

/* ------------------------------------------------------- 3. the constraint */

alter table public.agents drop constraint if exists agents_verified_means_identity_chk;
alter table public.agents
  add constraint agents_verified_means_identity_chk
  check (verified = false or verification_tier >= 1);

/* ----------------------------------- 4. the social badge follows the ladder */

create or replace function private.award_agent_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The tier, not the boolean, and not the approval. Approval opens Agent
  -- Mode; it is not a check of anybody. Tier 1 is a member of staff here
  -- having looked at a government document and said yes.
  if new.status <> 'APPROVED' or coalesce(new.verification_tier, 0) < 1 then
    return new;
  end if;

  perform private.award_badge(new.user_id, 'verified_agent',
    'Identity checked by a person at Vallo.',
    jsonb_build_object('agent_id', new.id, 'tier', new.verification_tier));

  return new;
end;
$$;

revoke execute on function private.award_agent_badges() from public, anon, authenticated;
