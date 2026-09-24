-- V-99, REVIEW FIX: ROUTING INPUT IS VALIDATED, THE MEMBER CHECK IS NOT
-- CALLABLE, AND A MEMBER'S COUNT IS THIS FIRM'S ONLY.
--
-- 1. set_firm_routing cast each area's member to uuid, so a malformed value
--    surfaced as a raw 22P02. It is now checked first and refused with the
--    firm_not_member hint.
-- 2. private.is_active_firm_member was executable by authenticated, which
--    let anyone ask whether a given agent belongs to a given firm. Every
--    caller of it is a security definer function, so authenticated loses it.
-- 3. firm_team counted every enquiry recorded for a member, across firms.
--    It now counts only enquiries about this firm's listings.
-- Everything else is as in 20260924122600.

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
    -- A value that is not a uuid is refused with the member hint, never a
    -- raw 22P02 from the cast below.
    if entry.value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'route to active members of the firm' using errcode = '22023', hint = 'firm_not_member';
    end if;
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

create or replace function public.firm_team(p_firm uuid)
returns table (agent_id uuid, display_name text, member_role text, routed_30d integer)
language sql
stable
security definer
set search_path to ''
as $function$
  select m.agent_id, a.display_name, m.member_role,
         (select count(*)::integer from public.conversations c
            join public.listings l on l.id = c.listing_id and l.firm_id = p_firm
           where c.routed_agent_id = m.agent_id and c.created_at > now() - interval '30 days')
    from public.firm_members m
    join public.agents a on a.id = m.agent_id
   where m.firm_id = p_firm and m.status = 'active'
     and private.can_route_firm(p_firm)
   order by m.member_role, a.display_name;
$function$;

revoke all on function private.is_active_firm_member(uuid, uuid) from public, anon, authenticated;
revoke all on function public.set_firm_routing(uuid, text, jsonb, time, time) from public, anon;
revoke all on function public.firm_team(uuid) from public, anon;
grant execute on function public.set_firm_routing(uuid, text, jsonb, time, time) to authenticated;
grant execute on function public.firm_team(uuid) to authenticated;
