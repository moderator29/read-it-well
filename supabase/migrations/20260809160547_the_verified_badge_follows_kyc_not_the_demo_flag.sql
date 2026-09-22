-- TRANSCRIBED FROM THE LIVE DATABASE ON 22 SEPTEMBER 2026.
--
-- Applied to `uccixoonmbhrnyczyigt` on 9 August 2026 as version 20260809160547,
-- with NO FILE FOR IT IN THIS REPOSITORY until now. Reproduced verbatim from
-- `supabase_migrations.schema_migrations.statements`, the runner's own record
-- of the SQL it executed.
--
-- THIS IS THE FILE TWO RESEARCH DOCUMENTS COULD NOT FIND.
-- `docs/research/ROLE_ARCHITECTURE_RESEARCH.md` records, in its honesty log,
-- that `public.agent_badges` is a live table whose `create table` is not in
-- `supabase/migrations/` and that `private.sync_agent_badge` is likewise
-- absent, evidenced only by `database.types.ts` and three later migrations.
-- This is where both of them come from.

/*
 * WHO IS ALLOWED TO WEAR THE TICK.
 *
 * THE DEFECT. `verified` on a listing is DERIVED in the repository, and it was
 * derived as `not is_demo`. That means every real published listing on this
 * platform carries the verified badge the moment it goes live, whether or not
 * one person has ever checked one document about the agent behind it. The whole
 * KYC ladder exists - `agent_verification_checks`, four rungs, a tier computed
 * by `private.agent_tier`, an admin queue that passes and fails each rung - and
 * the badge a stranger actually reads was wired to none of it.
 *
 * That is the most expensive kind of wrong on a marketplace. The tick is the
 * one thing a person weighs before they send somebody rent, and it was free.
 *
 * WHY A TABLE AND NOT A JOIN. `agents` is RLS-bound to the agent themselves and
 * to staff, which is correct: nobody browsing should be able to read another
 * person's verification tier, their payout state or their documents. So the
 * catalogue read, which runs as `anon`, cannot join it, and it must not be
 * allowed to.
 *
 * This table publishes exactly ONE derived boolean per agent and nothing else.
 * It is the same fact the badge already shows on every listing that agent has
 * published, so it discloses nothing a visitor cannot already see; what it does
 * not carry is the tier, the rungs, the documents, the reasons or the dates.
 *
 * WHY NOT A VIEW. A view over `agents` would have to bypass that RLS to be
 * readable, which is a SECURITY DEFINER view, which is a thing the Supabase
 * advisors flag and this codebase has spent migrations removing. A plain table
 * with its own row-level policy is readable by design rather than by exemption.
 *
 * NOBODY CAN WRITE TO IT. There is a select policy and there are no others, so
 * `anon`, `authenticated` and an agent's own client can all read it and none of
 * them can change it. The only writer is the trigger below, which is SECURITY
 * DEFINER and runs on the one table that owns the truth.
 */

create table if not exists public.agent_badges (
  agent_id uuid primary key references public.agents (id) on delete cascade,
  /* Tier 1 is IDENTITY PASSED: a person here looked at a government document
     and said yes. That is the least this badge can honestly mean, and it is
     therefore what it means. The higher rungs - address, payout, in person -
     say more and are shown on the agent's own profile, not in one tick. */
  verified boolean not null default false,
  /* When it became true, so a badge can be dated if it is ever disputed. Null
     while it is false, and cleared again if a rung is later failed. */
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.agent_badges enable row level security;

drop policy if exists agent_badges_select_all on public.agent_badges;
create policy agent_badges_select_all
  on public.agent_badges for select
  using (true);

comment on table public.agent_badges is
  'One published boolean per agent: has a human passed their identity check. Readable by everybody, writable by nobody except private.sync_agent_badge.';

/* --------------------------------------------------------------- the writer */

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

  return new;
end;
$$;

revoke execute on function private.sync_agent_badge() from public, anon, authenticated;

drop trigger if exists agents_sync_badge on public.agents;
create trigger agents_sync_badge
  after insert or update of verification_tier on public.agents
  for each row execute function private.sync_agent_badge();

/* ------------------------------------------------------------- the backfill
 *
 * Every agent that already exists gets a row, so the repository can treat a
 * missing row as "no such agent" rather than as "not verified yet" and the two
 * never have to be told apart at read time. The one agent on the platform today
 * is the demo lister at tier 0, so this publishes exactly one `false`, which is
 * the correct answer and is the point of the whole migration. */
insert into public.agent_badges (agent_id, verified, verified_at, updated_at)
select a.id,
       coalesce(a.verification_tier, 0) >= 1,
       case when coalesce(a.verification_tier, 0) >= 1 then now() else null end,
       now()
from public.agents a
on conflict (agent_id) do nothing;

grant select on public.agent_badges to anon, authenticated;
