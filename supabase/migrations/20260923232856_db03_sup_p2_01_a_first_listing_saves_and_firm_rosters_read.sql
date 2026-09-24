-- DB-03 (with SUP-01): creating a listing is INSERT ... RETURNING, and
-- RETURNING must pass the SELECT side of listings_owner_all. That side was
-- private.owns_listing(id), a definer function that looks the listing up by
-- id in the statement's snapshot, where the row being inserted is not yet
-- visible, so every first save was refused 42501.
--
-- The policy now asks about the row's own columns. Both helpers are SECURITY
-- DEFINER so the policy never reads agents or firm_members under RLS
-- (firm_members' own policy recursed, SUP-P2-01). owns_listing(id) stays for
-- the child tables, whose parent row already exists.
--
-- SUP-P2-01: firm_members_select_principal read firm_members under RLS
-- inside firm_members' own policy, so every non-definer read of the table,
-- including the admin supply desk's firm roster, failed 42P17. The principal
-- test moves into a definer helper.

create or replace function private.listing_agent_is_me(p_agent uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.agents a
     where a.id = p_agent and a.user_id = (select auth.uid())
  );
$$;

create or replace function private.firm_member_is_me(p_firm uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_firm is not null and exists (
    select 1 from public.firm_members m
      join public.agents a on a.id = m.agent_id
     where m.firm_id = p_firm and m.status = 'active'
       and a.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_firm_principal(p_firm uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.firm_members p
      join public.agents pa on pa.id = p.agent_id
     where p.firm_id = p_firm and p.member_role = 'principal'
       and p.status = 'active' and pa.user_id = (select auth.uid())
  );
$$;

-- The policies below apply to the public role, so both API roles evaluate
-- them and must keep EXECUTE (the same grant owns_listing carries).
revoke all on function private.listing_agent_is_me(uuid), private.firm_member_is_me(uuid),
  private.is_firm_principal(uuid) from public;
grant execute on function private.listing_agent_is_me(uuid), private.firm_member_is_me(uuid),
  private.is_firm_principal(uuid) to anon, authenticated;

drop policy listings_owner_all on public.listings;
create policy listings_owner_all on public.listings
  for all
  using (private.listing_agent_is_me(agent_id) or private.firm_member_is_me(firm_id))
  with check (private.listing_agent_is_me(agent_id));

drop policy firm_members_select_principal on public.firm_members;
create policy firm_members_select_principal on public.firm_members
  for select
  using (private.is_firm_principal(firm_id));
