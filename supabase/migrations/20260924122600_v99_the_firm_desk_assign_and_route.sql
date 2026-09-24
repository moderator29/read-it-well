-- V-99: THE FIRM DESK. ASSIGN, ROUTE, AND RECORDS THAT BELONG TO PEOPLE.
--
-- Track G built the firm (a `businesses` row), its roster (`firm_members`,
-- roles principal and staff) and the firm arm of `owns_listing`. What an
-- agency needs next is operational: who handles which listing, and who
-- answers which enquiry.
--
-- A THIRD ROLE, COORDINATOR: routes and reassigns, and nothing else (it
-- cannot sign mandates; nothing here gives it any power over a mandate).
--
-- ASSIGNMENT: `listings.assigned_agent_id`, an active member of the
-- listing's firm, set only through `assign_listing` by the firm's principal
-- or a coordinator. A trigger refuses any other change to the column from a
-- client role, so a staff member cannot assign a listing to themselves by
-- editing it.
--
-- ROUTING: `firm_routing` per firm: to whoever the listing is assigned to
-- (or who listed it), by closed-list neighbourhood to a named member, or
-- round robin among active members within office hours (outside them, to the
-- assignee). It is computed WHEN THE CONVERSATION IS CREATED and recorded on
-- the conversation (`routed_agent_id`, `routed_reason`, `routed_at`), so the
-- decision is auditable and never recomputed after the fact.
--
-- WHEN SOMEBODY LEAVES: revoking a member clears their assignments (the
-- listings stay with the firm, unassigned) and removes them from the area
-- map. Their own history is theirs: nothing here moves a person's listings,
-- reviews or record to the firm.
--
-- NOT HERE: routing does not yet widen who can READ a thread (the lister of
-- record still holds it under the existing conversation policies); the desk
-- shows where each enquiry was routed. Widening thread access to the routed
-- member is a policy change for the audit.

alter table public.firm_members drop constraint if exists firm_members_member_role_check;
alter table public.firm_members
  add constraint firm_members_member_role_check check (member_role in ('principal', 'coordinator', 'staff'));

create or replace function private.can_route_firm(p_firm uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select p_firm is not null and exists (
    select 1 from public.firm_members m
      join public.agents a on a.id = m.agent_id
     where m.firm_id = p_firm
       and m.member_role in ('principal', 'coordinator')
       and m.status = 'active'
       and a.user_id = (select auth.uid()));
$function$;

create or replace function private.is_active_firm_member(p_firm uuid, p_agent uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.firm_members m
     where m.firm_id = p_firm and m.agent_id = p_agent and m.status = 'active');
$function$;

revoke all on function private.can_route_firm(uuid) from public, anon;
revoke all on function private.is_active_firm_member(uuid, uuid) from public, anon;
grant execute on function private.can_route_firm(uuid) to authenticated;
grant execute on function private.is_active_firm_member(uuid, uuid) to authenticated;

/* ----------------------------------------------------------- assignment */

alter table public.listings
  add column if not exists assigned_agent_id uuid references public.agents(id) on delete set null;

comment on column public.listings.assigned_agent_id is
  'V-99. The firm member handling this listing. Set only through assign_listing by the firm''s principal or a coordinator; cleared when that member leaves.';

create or replace function private.guard_listing_assignment()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if new.assigned_agent_id is distinct from old.assigned_agent_id
     and current_user in ('authenticated', 'anon')
     and coalesce(current_setting('vallo.assigning', true), '') <> 'on' then
    raise exception 'a listing is assigned from the firm desk' using errcode = '42501';
  end if;
  return new;
end;
$function$;

drop trigger if exists listings_guard_assignment on public.listings;
create trigger listings_guard_assignment
  before update of assigned_agent_id on public.listings
  for each row execute function private.guard_listing_assignment();

create or replace function public.assign_listing(p_listing uuid, p_agent uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  firm uuid;
begin
  select l.firm_id into firm from public.listings l where l.id = p_listing;
  if firm is null or not private.can_route_firm(firm) then
    raise exception 'only the firm''s principal or a coordinator assigns its listings' using errcode = '42501';
  end if;
  if p_agent is not null and not private.is_active_firm_member(firm, p_agent) then
    raise exception 'assign to an active member of the firm' using errcode = '22023', hint = 'firm_not_member';
  end if;
  perform set_config('vallo.assigning', 'on', true);
  update public.listings set assigned_agent_id = p_agent where id = p_listing;
  perform set_config('vallo.assigning', '', true);
end;
$function$;

/* -------------------------------------------------------------- routing */

create table if not exists public.firm_routing (
  firm_id       uuid primary key references public.businesses(id) on delete cascade,
  mode          text not null default 'lister' check (mode in ('lister', 'area', 'round_robin')),
  area_agents   jsonb not null default '{}'::jsonb check (jsonb_typeof(area_agents) = 'object'),
  office_start  time,
  office_end    time,
  rr_cursor     uuid,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id) on delete set null,
  constraint firm_routing_hours check ((office_start is null) = (office_end is null) and (office_start is null or office_end > office_start))
);

comment on table public.firm_routing is
  'V-99. How a firm''s new enquiries are routed: to the assignee (or lister), by closed-list neighbourhood to a member, or round robin within office hours. Members read it; set only through set_firm_routing.';

alter table public.firm_routing enable row level security;
revoke all on public.firm_routing from public, anon, authenticated;
grant select on public.firm_routing to authenticated;
grant all on public.firm_routing to service_role;

drop policy if exists firm_routing_members_read on public.firm_routing;
create policy firm_routing_members_read on public.firm_routing
  for select to authenticated
  using (exists (
    select 1 from public.firm_members m join public.agents a on a.id = m.agent_id
     where m.firm_id = firm_routing.firm_id and m.status = 'active' and a.user_id = (select auth.uid())));

create or replace function public.set_firm_routing(
  p_firm uuid,
  p_mode text,
  p_area_agents jsonb default '{}'::jsonb,
  p_office_start time default null,
  p_office_end time default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  entry record;
  clean jsonb := '{}'::jsonb;
  place text;
begin
  if not private.can_route_firm(p_firm) then
    raise exception 'only the firm''s principal or a coordinator sets routing' using errcode = '42501';
  end if;
  if p_mode not in ('lister', 'area', 'round_robin') then
    raise exception 'unknown routing' using errcode = '22023';
  end if;
  for entry in select key, value from jsonb_each_text(coalesce(p_area_agents, '{}'::jsonb)) loop
    place := private.public_neighbourhood(entry.key, null);
    if place is null then
      raise exception 'route by neighbourhoods from the list' using errcode = '22023', hint = 'firm_area';
    end if;
    if not private.is_active_firm_member(p_firm, entry.value::uuid) then
      raise exception 'route to active members of the firm' using errcode = '22023', hint = 'firm_not_member';
    end if;
    clean := clean || jsonb_build_object(place, entry.value);
  end loop;

  insert into public.firm_routing (firm_id, mode, area_agents, office_start, office_end, updated_at, updated_by)
  values (p_firm, p_mode, clean, p_office_start, p_office_end, now(), (select auth.uid()))
  on conflict (firm_id) do update
    set mode = excluded.mode, area_agents = excluded.area_agents,
        office_start = excluded.office_start, office_end = excluded.office_end,
        updated_at = excluded.updated_at, updated_by = excluded.updated_by;
end;
$function$;

alter table public.conversations
  add column if not exists routed_agent_id uuid references public.agents(id) on delete set null,
  add column if not exists routed_reason text check (routed_reason is null or routed_reason in ('lister', 'assigned', 'area', 'round_robin', 'out_of_hours')),
  add column if not exists routed_at timestamptz;

comment on column public.conversations.routed_agent_id is
  'V-99. The firm member a new enquiry about a firm listing was routed to, decided once when the conversation was created (routed_reason says how).';

create or replace function private.route_firm_enquiry()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  l record;
  r public.firm_routing%rowtype;
  fallback uuid;
  chosen uuid;
  reason text;
  place text;
  local_time time;
begin
  if new.context_kind <> 'listing'::public.thread_context or new.listing_id is null then
    return new;
  end if;
  select li.firm_id, li.agent_id, li.assigned_agent_id, li.area, li.state_code into l
    from public.listings li where li.id = new.listing_id;
  if l.firm_id is null then
    return new;
  end if;

  if l.assigned_agent_id is not null and private.is_active_firm_member(l.firm_id, l.assigned_agent_id) then
    fallback := l.assigned_agent_id;
    reason := 'assigned';
  else
    fallback := l.agent_id;
    reason := 'lister';
  end if;
  chosen := fallback;

  select * into r from public.firm_routing fr where fr.firm_id = l.firm_id;
  if found and r.mode = 'area' then
    place := private.public_neighbourhood(l.area, l.state_code);
    if place is not null and r.area_agents ? place
       and private.is_active_firm_member(l.firm_id, (r.area_agents ->> place)::uuid) then
      chosen := (r.area_agents ->> place)::uuid;
      reason := 'area';
    end if;
  elsif found and r.mode = 'round_robin' then
    local_time := (now() at time zone 'Africa/Lagos')::time;
    if r.office_start is null or (local_time >= r.office_start and local_time < r.office_end) then
      select m.agent_id into chosen
        from public.firm_members m
       where m.firm_id = l.firm_id and m.status = 'active'
       order by (m.agent_id <= coalesce(r.rr_cursor, '00000000-0000-0000-0000-000000000000'::uuid)), m.agent_id
       limit 1;
      if chosen is null then
        chosen := fallback;
      else
        reason := 'round_robin';
        update public.firm_routing set rr_cursor = chosen where firm_id = l.firm_id;
      end if;
    else
      reason := 'out_of_hours';
    end if;
  end if;

  new.routed_agent_id := chosen;
  new.routed_reason := reason;
  new.routed_at := now();
  return new;
exception when others then
  /* Routing must never cost the renter their enquiry. */
  return new;
end;
$function$;

revoke all on function private.route_firm_enquiry() from public, anon, authenticated;

drop trigger if exists conversations_zz_route_firm_enquiry on public.conversations;
create trigger conversations_zz_route_firm_enquiry
  before insert on public.conversations
  for each row execute function private.route_firm_enquiry();

/* ---------------------------------------------------- when someone leaves */

create or replace function private.firm_member_left()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.status = 'revoked' and old.status is distinct from 'revoked' then
    perform set_config('vallo.assigning', 'on', true);
    update public.listings set assigned_agent_id = null
     where firm_id = new.firm_id and assigned_agent_id = new.agent_id;
    perform set_config('vallo.assigning', '', true);
    update public.firm_routing
       set area_agents = coalesce((select jsonb_object_agg(k, v) from jsonb_each(area_agents) as e(k, v)
                                    where v #>> '{}' <> new.agent_id::text), '{}'::jsonb)
     where firm_id = new.firm_id;
  end if;
  return new;
end;
$function$;

revoke all on function private.firm_member_left() from public, anon, authenticated;

drop trigger if exists firm_members_left on public.firm_members;
create trigger firm_members_left
  after update of status on public.firm_members
  for each row execute function private.firm_member_left();

/* ------------------------------------------------------------- the desk */

create or replace function public.firm_desk(p_firm uuid)
returns table (
  listing_id         uuid,
  title              text,
  status             text,
  area               text,
  listed_by          uuid,
  assigned_agent_id  uuid,
  enquiries_30d      integer
)
language sql
stable
security definer
set search_path to ''
as $function$
  select l.id, l.title, l.status::text, l.area, l.agent_id, l.assigned_agent_id,
         (select count(*)::integer from public.conversations c
           where c.listing_id = l.id and c.created_at > now() - interval '30 days')
    from public.listings l
   where l.firm_id = p_firm
     and private.can_route_firm(p_firm)
     and l.status in ('DRAFT'::public.listing_status, 'SUBMITTED'::public.listing_status,
                      'UNDER_REVIEW'::public.listing_status, 'PUBLISHED'::public.listing_status,
                      'MORE_INFO_REQUIRED'::public.listing_status)
   order by l.status, l.created_at desc
   limit 500;
$function$;

create or replace function public.firm_team(p_firm uuid)
returns table (agent_id uuid, display_name text, member_role text, routed_30d integer)
language sql
stable
security definer
set search_path to ''
as $function$
  select m.agent_id, a.display_name, m.member_role,
         (select count(*)::integer from public.conversations c
           where c.routed_agent_id = m.agent_id and c.created_at > now() - interval '30 days')
    from public.firm_members m
    join public.agents a on a.id = m.agent_id
   where m.firm_id = p_firm and m.status = 'active'
     and private.can_route_firm(p_firm)
   order by m.member_role, a.display_name;
$function$;

create or replace function public.my_routing_firms()
returns table (firm_id uuid, firm_name text, member_role text)
language sql
stable
security definer
set search_path to ''
as $function$
  select m.firm_id, b.name, m.member_role
    from public.firm_members m
    join public.agents a on a.id = m.agent_id
    join public.businesses b on b.id = m.firm_id
   where a.user_id = (select auth.uid())
     and m.status = 'active'
     and m.member_role in ('principal', 'coordinator');
$function$;

comment on function public.assign_listing(uuid, uuid) is
  'V-99. The firm''s principal or a coordinator assigns one of the firm''s listings to an active member (or clears it).';
comment on function public.set_firm_routing(uuid, text, jsonb, time, time) is
  'V-99. The firm''s principal or a coordinator sets how new enquiries are routed; areas must be closed-list neighbourhoods and members active.';
comment on function public.firm_desk(uuid) is
  'V-99. The firm''s open listings with who listed and who is assigned, and enquiries in 30 days. Principal and coordinators only.';
comment on function public.firm_team(uuid) is
  'V-99. The firm''s active members, their roles and how many enquiries were routed to each in 30 days. Principal and coordinators only.';
comment on function public.my_routing_firms() is
  'V-99. The firms where the caller is an active principal or coordinator.';

revoke all on function public.assign_listing(uuid, uuid) from public, anon;
revoke all on function public.set_firm_routing(uuid, text, jsonb, time, time) from public, anon;
revoke all on function public.firm_desk(uuid) from public, anon;
revoke all on function public.firm_team(uuid) from public, anon;
revoke all on function public.my_routing_firms() from public, anon;
grant execute on function public.assign_listing(uuid, uuid) to authenticated;
grant execute on function public.set_firm_routing(uuid, text, jsonb, time, time) to authenticated;
grant execute on function public.firm_desk(uuid) to authenticated;
grant execute on function public.firm_team(uuid) to authenticated;
grant execute on function public.my_routing_firms() to authenticated;
