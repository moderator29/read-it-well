/*
 * V-64 REVIEW FIX. PEOPLE SEARCH SHOWS ONLY WHAT A MEMBER TURNED ON.
 *
 * `/u?q=` read occupation and place codes for every member from
 * `social_profiles` and printed them on each row, and let anyone search
 * people BY occupation and place, while the settings switch said "Off by
 * default. When it is off, only you see it." The page now stops selecting
 * those codes and resolves each row through this set-returning twin of
 * `profile_public_facts`, which returns a name only for the fields the member
 * switched on in `settings.privacy`.
 *
 * At most 60 ids per call (a page of people is 30). Nothing is added to any
 * table. The `social_profiles` projection still carries the three codes; that
 * view and its trigger are the audit session's (see the batch report).
 */

begin;

create or replace function public.profile_public_facts_many(p_users uuid[])
returns table (user_id uuid, occupation text, lga text, state text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    case when coalesce((p.settings -> 'privacy' ->> 'showOccupation') = 'true', false)
         then o.name end,
    case when coalesce((p.settings -> 'privacy' ->> 'showHomeTown') = 'true', false)
         then lg.name end,
    case when coalesce((p.settings -> 'privacy' ->> 'showHomeTown') = 'true', false)
         then s.name end
  from public.profiles p
  left join public.occupations o on o.code = p.occupation_code
  left join public.local_governments lg on lg.code = p.lga_code
  left join public.states s on s.code = lg.state_code
  where p.id = any (coalesce(p_users[1:60], array[]::uuid[]))
    /* Nobody a block touches in either direction (review). */
    and not private.blocked_with(p.id);
$$;

revoke execute on function public.profile_public_facts_many(uuid[]) from public, anon;
grant execute on function public.profile_public_facts_many(uuid[]) to authenticated;

commit;
