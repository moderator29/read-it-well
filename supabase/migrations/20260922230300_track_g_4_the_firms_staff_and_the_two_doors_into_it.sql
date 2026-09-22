-- TRACK G, MIGRATION 4 OF 6: THE FIRM'S STAFF.
--
-- A firm's standing is inherited by its staff, and inheritance needs a roster.
-- Without one, every employee of a fifteen person agency uploads the same CAC
-- certificate and fifteen reviewers look at the same document.
--
-- DELIBERATELY NOT A COLUMN ON `agents`. Membership is a fact about a person
-- AND an organisation, and it ENDS. A column on either side cannot carry when
-- it started, who admitted them, or that it was revoked on a Tuesday, and all
-- three of those are what a listing published under inherited standing needs
-- in order to stay explicable after the person has gone.
--
-- A MINIMUM OF ONE PRINCIPAL IS NOT ENFORCED. A firm whose only principal
-- leaves is a real state, and refusing it would trap the row and the people in
-- it. The admin queue surfaces it instead, exactly as `20260919210000_p1` does
-- for an ownerless business.
--
-- THERE IS NO INSERT OR UPDATE POLICY FOR MEMBERSHIP AT ALL, and that is the
-- design rather than an omission. Admission and revocation are decisions with
-- consequences for somebody else's standing, so they go through the two
-- SECURITY DEFINER functions below, each of which writes an `audit_log` row,
-- exactly as verification does at `20260809052558:262`. A person may READ
-- their own membership and a principal may read the roster; nobody writes one
-- with a bare insert.
--
-- RULE 21, BORN LOCKED. This migration creates two SECURITY DEFINER functions.
-- `private.admit_firm_member` and `private.revoke_firm_member` are revoked
-- from `anon` and from `authenticated` in this same migration, restated in
-- full below rather than inherited from anywhere, and the probe reads both
-- revokes back rather than trusting them.
--
-- NOTE ON WHO MAY CALL THEM. Both are `private.*`, so PostgREST does not
-- expose them at all, and the revokes mean that even a caller who reached the
-- schema could not execute them. The service role and a staff surface are the
-- only callers, and each function still re-checks the caller inside itself
-- rather than trusting the door it came through: a SECURITY DEFINER function
-- that trusts its caller is a privilege escalation with extra steps.

create table if not exists public.firm_members (
  id           uuid primary key default gen_random_uuid(),
  firm_id      uuid not null references public.businesses(id) on delete cascade,
  agent_id     uuid not null references public.agents(id) on delete cascade,
  -- 'principal' may admit and remove members and sign a mandate for the firm.
  -- 'staff' may list under the firm's standing and nothing else.
  member_role  text not null default 'staff' check (member_role in ('principal', 'staff')),
  status       text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  -- A revocation is an UPDATE of these three and never a delete, so that a
  -- listing published under inherited standing stays explicable afterwards.
  admitted_by  uuid references auth.users(id) on delete set null,
  admitted_at  timestamptz not null default now(),
  revoked_by   uuid references auth.users(id) on delete set null,
  revoked_at   timestamptz,
  revoke_note  text check (revoke_note is null or length(revoke_note) <= 2000),
  unique (firm_id, agent_id),
  constraint firm_members_revoke_chk check ((status = 'revoked') = (revoked_at is not null))
);

comment on table public.firm_members is
  'Who works at which firm, and since when, and who said so. A roster rather than a column, because membership is a fact about a pair and it ends. Written only by private.admit_firm_member and private.revoke_firm_member, each of which writes an audit_log row.';

create index if not exists firm_members_firm_idx  on public.firm_members (firm_id, status);
create index if not exists firm_members_agent_idx on public.firm_members (agent_id, status);
create index if not exists firm_members_admitted_by_idx on public.firm_members (admitted_by);
create index if not exists firm_members_revoked_by_idx  on public.firm_members (revoked_by);

alter table public.firm_members enable row level security;

-- My own membership, whatever its standing. A person refused or revoked must
-- be able to see that they were, which is the same law the switch sheet obeys
-- on screen: pending, not approved and suspended are all shown and never hidden.
drop policy if exists firm_members_select_own on public.firm_members;
create policy firm_members_select_own
  on public.firm_members for select
  using (exists (select 1 from public.agents a
                  where a.id = firm_members.agent_id and a.user_id = (select auth.uid())));

-- An ACTIVE PRINCIPAL of the same firm reads the whole roster. Not a member,
-- and not a principal whose own membership has been revoked.
drop policy if exists firm_members_select_principal on public.firm_members;
create policy firm_members_select_principal
  on public.firm_members for select
  using (exists (select 1 from public.firm_members p
                   join public.agents pa on pa.id = p.agent_id
                  where p.firm_id = firm_members.firm_id
                    and p.member_role = 'principal'
                    and p.status = 'active'
                    and pa.user_id = (select auth.uid())));

drop policy if exists firm_members_staff_all on public.firm_members;
create policy firm_members_staff_all
  on public.firm_members for all
  using (private.has_role((select auth.uid()), 'admin')
         or private.has_role((select auth.uid()), 'super_admin'))
  with check (private.has_role((select auth.uid()), 'admin')
              or private.has_role((select auth.uid()), 'super_admin'));

/* ------------------------------------------------- the two doors, audited */

create or replace function private.admit_firm_member(
  target_firm_id uuid,
  target_agent_id uuid,
  target_member_role text default 'staff'
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  allowed boolean;
  row_id uuid;
begin
  if target_member_role not in ('principal', 'staff') then
    raise exception 'A firm member is a principal or staff.' using errcode = 'check_violation';
  end if;

  -- THE FUNCTION RE-CHECKS ITS OWN CALLER. A SECURITY DEFINER function that
  -- trusts the door it came through is a privilege escalation with extra
  -- steps. Staff may admit anybody; an active principal may admit into their
  -- own firm; and the FIRST member of a firm may be admitted by the person who
  -- owns the business row, because a roster with nobody on it has no principal
  -- to ask.
  select
    private.has_role(actor, 'admin')
    or private.has_role(actor, 'super_admin')
    or exists (select 1 from public.firm_members p
                 join public.agents pa on pa.id = p.agent_id
                where p.firm_id = target_firm_id and p.member_role = 'principal'
                  and p.status = 'active' and pa.user_id = actor)
    or (not exists (select 1 from public.firm_members f where f.firm_id = target_firm_id)
        and exists (select 1 from public.businesses b
                     where b.id = target_firm_id and b.kind = 'agency' and b.owner_id = actor))
  into allowed;

  if not allowed then
    raise exception 'Only a principal of this firm may admit somebody to it.'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.firm_members (firm_id, agent_id, member_role, status, admitted_by)
  values (target_firm_id, target_agent_id, target_member_role, 'active', actor)
  on conflict (firm_id, agent_id) do update
    set member_role = excluded.member_role,
        status      = 'active',
        admitted_by = excluded.admitted_by,
        admitted_at = now(),
        revoked_by  = null,
        revoked_at  = null,
        revoke_note = null
  returning id into row_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'firm_member.admit', 'firm_members', row_id::text,
          jsonb_build_object('firm_id', target_firm_id, 'agent_id', target_agent_id,
                             'member_role', target_member_role));

  return row_id;
end;
$$;

revoke all on function private.admit_firm_member(uuid, uuid, text) from public;
revoke execute on function private.admit_firm_member(uuid, uuid, text) from anon;
revoke execute on function private.admit_firm_member(uuid, uuid, text) from authenticated;

create or replace function private.revoke_firm_member(
  target_membership_id uuid,
  note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  target_firm uuid;
  allowed boolean;
begin
  select firm_id into target_firm from public.firm_members where id = target_membership_id;
  if target_firm is null then
    raise exception 'No such membership.' using errcode = 'no_data_found';
  end if;

  select
    private.has_role(actor, 'admin')
    or private.has_role(actor, 'super_admin')
    or exists (select 1 from public.firm_members p
                 join public.agents pa on pa.id = p.agent_id
                where p.firm_id = target_firm and p.member_role = 'principal'
                  and p.status = 'active' and pa.user_id = actor)
  into allowed;

  if not allowed then
    raise exception 'Only a principal of this firm may remove somebody from it.'
      using errcode = 'insufficient_privilege';
  end if;

  -- AN UPDATE AND NEVER A DELETE. The row is the explanation of every listing
  -- published under this firm's standing while the person was on the roster.
  update public.firm_members
     set status = 'revoked', revoked_by = actor, revoked_at = now(), revoke_note = note
   where id = target_membership_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (actor, 'firm_member.revoke', 'firm_members', target_membership_id::text,
          jsonb_build_object('firm_id', target_firm));
end;
$$;

revoke all on function private.revoke_firm_member(uuid, text) from public;
revoke execute on function private.revoke_firm_member(uuid, text) from anon;
revoke execute on function private.revoke_firm_member(uuid, text) from authenticated;
