/*
 * V-64. A MEMBER'S OCCUPATION AND HOME TOWN ARE PRIVATE UNLESS THEY SAY OTHERWISE.
 *
 * A member's profile page is where a scammer goes to write a script: "Hello
 * Madam, I see you are a market trader from Dunukofia". Neither fact helps
 * anybody rent a flat. So both are private by default, and a member who wants
 * either on their page turns it on, per field, in their own settings.
 *
 * THE DISPLAY HALF, NOT THE REVOKE HALF. Who can read `public.profiles` is the
 * audit session's (RLS and grants). This migration adds nothing to `profiles`
 * and changes no policy. It adds ONE published door: a function that returns
 * a member's occupation name and home town ONLY for the fields that member has
 * switched on, read from `profiles.settings -> 'privacy'`:
 *
 *   showOccupation   true publishes the occupation's name
 *   showHomeTown     true publishes the local government and state names
 *
 * Absent, false or anything else is private, so every existing member starts
 * private and nobody is published by this migration. The codes themselves are
 * never returned, only the display names, and nothing else about the person.
 *
 * Signed-in callers only (the platform is signed-in only), a pinned
 * search_path, and every relation schema qualified.
 */

create or replace function public.profile_public_facts(p_user uuid)
returns table (occupation text, lga text, state text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when coalesce((p.settings -> 'privacy' ->> 'showOccupation') = 'true', false)
         then o.name end as occupation,
    case when coalesce((p.settings -> 'privacy' ->> 'showHomeTown') = 'true', false)
         then lg.name end as lga,
    case when coalesce((p.settings -> 'privacy' ->> 'showHomeTown') = 'true', false)
         then s.name end as state
  from public.profiles p
  left join public.occupations o on o.code = p.occupation_code
  left join public.local_governments lg on lg.code = p.lga_code
  left join public.states s on s.code = lg.state_code
  where p.id = p_user;
$$;

comment on function public.profile_public_facts(uuid) is
  'V-64: a member''s occupation name and home town (local government and state), each returned only when that member switched it on in settings.privacy (showOccupation, showHomeTown). Private by default. Returns names, never codes, and nothing else.';

revoke execute on function public.profile_public_facts(uuid) from public, anon;
grant execute on function public.profile_public_facts(uuid) to authenticated;
