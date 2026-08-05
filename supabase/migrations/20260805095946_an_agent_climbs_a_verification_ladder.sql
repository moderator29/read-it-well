-- The verification tier ladder.
--
-- public.agents carried one boolean, `verified`, which is the first-party
-- inventory mark and correctly means only "this listing is ours". It cannot
-- also carry how far an agent has actually been checked, and a single boolean
-- never could: an agent whose ID was seen once and an agent whose bank account
-- resolved to the same name and who was met in person are not the same risk,
-- and a hesitant first-time booker deserves to be told which one they are
-- dealing with.
--
-- So: four rungs, in a fixed order, each one a decision a named member of staff
-- recorded. The tier is the highest rung reached with every rung below it
-- passed, computed by trigger rather than typed by hand, because a tier an
-- admin can set directly is a tier that drifts from its own evidence.
--
-- Deliberately NOT an enum. A new enum value cannot be used in the transaction
-- that adds it, and a check constraint says the same thing, is readable in
-- \d output, and is how public.reports.category already does it.
--
-- `agents.verified` is untouched. The two mean different things and coupling
-- them would quietly redefine the verified badge.
--
-- Probed after applying, because a function body is only parsed when it runs.
-- Against a throwaway agent: new agent 0; in_person passed alone still 0, so a
-- rung cannot be skipped; +identity 1; +address 2; +payout 4; address later
-- failed drops back to 1; identity deleted drops to 0. Under RLS through
-- private.probe_as: the agent could read their own three rungs and was refused
-- 42501 when trying to record one, and an admin's insert was accepted. Every
-- probe row was then removed.

create table if not exists public.agent_verification_checks (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references public.agents(id) on delete cascade,
  kind        text not null check (kind in ('identity', 'address', 'payout', 'in_person')),
  status      text not null check (status in ('passed', 'failed')),
  note        text,
  decided_by  uuid references auth.users(id) on delete set null,
  decided_at  timestamptz not null default now(),
  unique (agent_id, kind)
);

comment on table public.agent_verification_checks is
  'One row per rung per agent. The rung order is identity, address, payout, in_person; agents.verification_tier is derived from these and never set by hand.';

create index if not exists agent_verification_checks_agent_idx
  on public.agent_verification_checks (agent_id);
create index if not exists agent_verification_checks_decided_by_idx
  on public.agent_verification_checks (decided_by);

alter table public.agents
  add column if not exists verification_tier smallint not null default 0
  check (verification_tier between 0 and 4);

comment on column public.agents.verification_tier is
  '0 to 4. The highest rung reached with every rung below it passed. Derived by trigger from agent_verification_checks; never write it directly.';

-- The ladder itself. Ordered, so a passed in_person check with no identity
-- check behind it does not promote anybody: you cannot skip a rung.
create or replace function private.agent_tier(target_agent uuid)
returns smallint
language sql
stable
set search_path = public
as $$
  select coalesce(
    (
      select count(*)::smallint
      from unnest(array['identity', 'address', 'payout', 'in_person']) with ordinality as rung(kind, position)
      where rung.position <= coalesce(
        (
          select min(missing.position) - 1
          from unnest(array['identity', 'address', 'payout', 'in_person']) with ordinality as missing(kind, position)
          where not exists (
            select 1
            from public.agent_verification_checks c
            where c.agent_id = target_agent
              and c.kind = missing.kind
              and c.status = 'passed'
          )
        ),
        4
      )
    ),
    0
  );
$$;

comment on function private.agent_tier(uuid) is
  'The agent''s verification tier: how many rungs are passed with no gap below them.';

create or replace function private.sync_agent_verification_tier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.agent_id, old.agent_id);
begin
  update public.agents
     set verification_tier = private.agent_tier(target),
         updated_at = now()
   where agents.id = target;
  return null;
end;
$$;

revoke execute on function private.sync_agent_verification_tier() from public, anon, authenticated;

drop trigger if exists agent_verification_checks_sync on public.agent_verification_checks;
create trigger agent_verification_checks_sync
  after insert or update or delete on public.agent_verification_checks
  for each row execute function private.sync_agent_verification_tier();

-- Row Level Security. Admins decide; an agent may read their own rungs, so a
-- future agent-facing screen can say exactly what is still outstanding rather
-- than leaving them guessing. Nobody else reads anybody's checks.
alter table public.agent_verification_checks enable row level security;

drop policy if exists agent_verification_checks_admin_all on public.agent_verification_checks;
create policy agent_verification_checks_admin_all
  on public.agent_verification_checks for all
  using (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  )
  with check (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'super_admin')
  );

drop policy if exists agent_verification_checks_select_own on public.agent_verification_checks;
create policy agent_verification_checks_select_own
  on public.agent_verification_checks for select
  using (
    exists (
      select 1 from public.agents a
      where a.id = agent_verification_checks.agent_id
        and a.user_id = (select auth.uid())
    )
  );
