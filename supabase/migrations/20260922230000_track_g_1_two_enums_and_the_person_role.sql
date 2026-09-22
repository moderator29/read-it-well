-- TRACK G, MIGRATION 1 OF 6: THE TWO ENUMS AND THE PERSON AXIS.
--
-- `docs/research/ROLE_ARCHITECTURE_RESEARCH.md` Part 2 is the design and this
-- is the first of the six migrations it sketches. Until today the whole of
-- Track G's schema was at zero, verified against the live database rather than
-- against a migration file: no `agents.role`, no `agents.firm_id`, no
-- `firm_members`, no `listings.listing_role`, no `listing_mandates`, and no
-- dated property stamps. Three forms filed three different applications and
-- nothing downstream could tell them apart.
--
-- THE WORST OF IT, AND MIGRATION 1 IS WHAT MAKES THE FIX POSSIBLE.
-- `agent_applications.supply_role` has been written by the three forms since
-- `20260922170000` and READ BY NOTHING THAT DECIDES ANYTHING. The approval
-- path in `lib/admin/actions.ts` upserted an `agents` row with `type` and
-- `status` and granted `user_roles.role = 'agent'`, so an approved OWNER
-- became an "agent" row and the role was discarded at the door. There was
-- nowhere to put it. This migration is the somewhere.
--
-- TWO ENUMS, BECAUSE THERE ARE TWO QUESTIONS.
-- `supply_role` answers "what kind of supply account is this", which an
-- onboarding form branches on. `listing_role` (migration 3) answers "what is
-- this person to THIS property", which a searcher filters on. One enum for
-- both would make the second question unanswerable for the man who owns one
-- flat and lets another for a cousin, which is the founder's own example and
-- the case this project exists for.
--
-- `agents.user_id` STAYS `not null unique`, AND THAT IS THE ANSWER RATHER THAN
-- THE PROBLEM. It is tempting to read "a role column on a person makes the
-- founder's example unrepresentable" as an instruction to drop the unique
-- index and let a person hold two supply accounts. That would be the wrong
-- half of the fix. The research file's ruling is that OWNERSHIP IS A PROPERTY
-- OF A PAIR, a person and a property, never of a person: one supply account,
-- and each listing under it says what its lister is to THAT address. Dropping
-- the unique index would give a person two accounts, two ladders, two badges
-- and two sets of documents for one human being, which is the multiplication
-- the pair axis exists to avoid. The example becomes representable in
-- migration 3, where it belongs.
--
-- RULE 21, BORN LOCKED. This migration creates one SECURITY DEFINER function
-- and revokes EXECUTE from `anon` and `authenticated` in the same migration,
-- restated below rather than inherited, and the probe reads the revoke back.

/* ------------------------------------------------------------- the enums */

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'public' and t.typname = 'supply_role') then
    create type public.supply_role as enum ('owner', 'agent');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'public' and t.typname = 'listing_role') then
    create type public.listing_role as enum ('owner', 'agent', 'firm');
  end if;
end$$;

comment on type public.supply_role is
  'What kind of supply account a person runs on the property side. Two values, not three: a registered agency is an agent with a firm behind them (agents.firm_id), because the proof set for a firm is a SUPERSET of the individual agent''s and a superset is a branch in a form rather than a role.';

comment on type public.listing_role is
  'What the lister is to THIS property. Three values here and two on the person, deliberately: "listed by the owner", "listed by Chidi Okeke, agent" and "listed by Acme Properties Ltd" are three different offers to a reader, while at the person level the last two are the same job with different paperwork behind it.';

/* ------------------------------------------------------- the person axis */

alter table public.agents
  add column if not exists role public.supply_role,
  add column if not exists firm_id uuid references public.businesses(id) on delete set null;

-- THE HONEST BACKFILL IS "EVERYBODY IS AN AGENT". That is what every existing
-- row applied to be: there is one live row and it is the example lister, which
-- came in through the six step agent application. Guessing owner for anybody
-- would be inventing a fact about a person, and rule 15 forbids it.
update public.agents set role = 'agent' where role is null;

alter table public.agents alter column role set default 'agent';
alter table public.agents alter column role set not null;

create index if not exists agents_firm_idx on public.agents (firm_id) where firm_id is not null;
create index if not exists agents_role_idx on public.agents (role);

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.agents'::regclass
                    and conname = 'agents_firm_is_an_agency_chk') then
    alter table public.agents
      add constraint agents_firm_is_an_agency_chk check (firm_id is null or role = 'agent');
  end if;
end$$;

comment on column public.agents.role is
  'OWNER or AGENT. The person axis. Written from agent_applications.supply_role at approval, which is the first moment a claim on a form becomes a decision a named member of staff made. Never read as authorisation: it says what kind of account this is, not what this person may do to a given listing, which is listings.listing_role and the RLS behind it.';

comment on column public.agents.firm_id is
  'The registered firm this agent works under, when there is one. Constrained to a businesses row whose kind is agency by private.agents_firm_must_be_an_agency, because that is a cross-row condition and a CHECK cannot see another table.';

comment on column public.agents.type is
  'DEPRECATED, and kept rather than dropped the way agents.verified was kept and derived by 20260919230000. individual|business, which has never meant owner|agent: a landlord with one flat and a one person letting agency are both "individual". New code reads agents.role and agents.firm_id. Five surfaces still read this column and renaming it is a separate, readable change.';

/* ------------------------- the cross-row condition, which must be a trigger */

-- A firm_id must name an AGENCY and not a hotel. That reads a second table, so
-- a CHECK cannot express it and a trigger must.
create or replace function private.agents_firm_must_be_an_agency()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.firm_id is null then return new; end if;
  if not exists (select 1 from public.businesses b
                  where b.id = new.firm_id and b.kind = 'agency') then
    raise exception 'An agent''s firm must be a registered agency on Vallo.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- RULE 21, BORN LOCKED, RESTATED IN FULL RATHER THAN INHERITED. `create or
-- replace` keeps whatever grants the old definition carried, so a function
-- that was once public stays public through a replace. The revoke is written
-- again on every definition of every SECURITY DEFINER function in this tree,
-- and the probe at the end of this set reads it back rather than trusting it.
revoke all on function private.agents_firm_must_be_an_agency() from public;
revoke execute on function private.agents_firm_must_be_an_agency() from anon;
revoke execute on function private.agents_firm_must_be_an_agency() from authenticated;

drop trigger if exists agents_firm_must_be_an_agency on public.agents;
create trigger agents_firm_must_be_an_agency
  before insert or update of firm_id on public.agents
  for each row execute function private.agents_firm_must_be_an_agency();
