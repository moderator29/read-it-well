-- P2 SOCIAL FOLLOW SUGGESTIONS (pending; not applied).
--
-- The founder, 7 October: a block in the feed suggesting accounts to follow,
-- "mostly top agents, landlords, hotels and restaurants in the member's
-- vicinity", chosen by location from data the app already holds and ranked by
-- real activity; and a social search to find people and businesses to follow,
-- City or Global, filtered by kind.
--
-- One read serves both. It returns only accounts that have a public social
-- handle (social_profiles), and only for something they have done in public:
--
--   agent       an approved agent of type individual with a published listing
--   agency      an approved agent of type business, or a published agency
--   landlord    an approved agent who said at sign-up they let their own
--               property, with a published listing (the declaration alone is
--               private and is never a reason to be suggested)
--   hotel       the owner of a published hotel, serviced apartments, guest
--               house, resort or shortlet business
--   restaurant  the owner of a published restaurant
--
-- Demo rows never count (is_demo). "Where" is the city of the published
-- listings or business, never a person's own profile address, and a city is
-- matched case-insensitively and whole, so "Lagos" is not "Lagos Island".
--
-- Ranked by verified first, then by how many published listings (or one per
-- published business) they hold in scope, then by handle so the order is
-- stable for paging. Not followed by the caller, not the caller, and not
-- anyone on either side of a block with the caller.
--
-- SECURITY DEFINER because agents, listings and businesses are read here only
-- as counts and a city; nothing private leaves the function. search_path is
-- pinned. Executable by anon and authenticated (the feed is readable signed
-- out, and a guest is shown the same public accounts).

create or replace function public.social_follow_suggestions(
  p_city   text default null,
  p_kind   text default null,
  p_query  text default null,
  p_limit  integer default 12,
  p_offset integer default 0
)
returns table (
  user_id       uuid,
  handle        text,
  display_label text,
  avatar_path   text,
  kind          text,
  city          text,
  verified      boolean,
  published     integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with scope as (
    select
      nullif(lower(btrim(p_city)), '') as city,
      nullif(lower(btrim(p_kind)), '') as kind,
      nullif(regexp_replace(btrim(coalesce(p_query, '')), '[%_\\]', '', 'g'), '') as q,
      least(greatest(coalesce(p_limit, 12), 1), 50) as lim,
      greatest(coalesce(p_offset, 0), 0) as off,
      auth.uid() as me
  ),
  lister as (
    select
      a.user_id,
      case
        when a.type = 'business' then 'agency'
        when p.signup_role = 'landlord' then 'landlord'
        else 'agent'
      end as kind,
      min(l.city) as city,
      bool_or(a.verified) as verified,
      count(*)::integer as published
    from public.agents a
    join public.listings l on l.agent_id = a.id
    left join public.profiles p on p.id = a.user_id
    cross join scope s
    where a.status = 'APPROVED'
      and l.status = 'PUBLISHED'
      and coalesce(l.is_demo, false) = false
      and (s.city is null or lower(btrim(l.city)) = s.city)
    group by a.user_id, a.type, p.signup_role
  ),
  operator as (
    select
      b.owner_id as user_id,
      case when b.kind = 'restaurant' then 'restaurant'
           when b.kind = 'agency' then 'agency'
           else 'hotel' end as kind,
      min(b.city) as city,
      bool_or(coalesce(ag.verified, false)) as verified,
      count(*)::integer as published
    from public.businesses b
    left join public.agents ag on ag.id = b.agent_id
    cross join scope s
    where b.owner_id is not null
      and b.status = 'PUBLISHED'
      and coalesce(b.is_demo, false) = false
      and (s.city is null or lower(btrim(b.city)) = s.city)
    group by b.owner_id, 2
  ),
  everyone as (
    select * from lister
    union all
    select * from operator
  ),
  ranked as (
    select
      e.user_id,
      (array_agg(e.kind order by e.published desc))[1] as kind,
      min(e.city) as city,
      bool_or(e.verified) as verified,
      sum(e.published)::integer as published
    from everyone e
    group by e.user_id
  )
  select
    r.user_id,
    sp.handle,
    coalesce(nullif(sp.display_label, ''), '@' || sp.handle) as display_label,
    sp.avatar_path,
    r.kind,
    r.city,
    r.verified,
    r.published
  from ranked r
  join public.social_profiles sp on sp.user_id = r.user_id
  cross join scope s
  where (s.kind is null or r.kind = s.kind)
    and (s.q is null or sp.handle ilike '%' || s.q || '%' or sp.display_label ilike '%' || s.q || '%')
    and (s.me is null or r.user_id <> s.me)
    and (s.me is null or not exists (
      select 1 from public.follows f where f.follower_id = s.me and f.followee_id = r.user_id
    ))
    and (s.me is null or not exists (
      select 1 from public.blocks bl
      where (bl.user_id = s.me and bl.other_id = r.user_id)
         or (bl.user_id = r.user_id and bl.other_id = s.me)
    ))
  order by r.verified desc, r.published desc, sp.handle
  limit (select lim from scope)
  offset (select off from scope);
$$;

comment on function public.social_follow_suggestions(text, text, text, integer, integer) is
  'Accounts to follow (agents, agencies, landlords, hotels, restaurants) for the feed and the social search: public handles only, ranked by verified and published activity in a city or everywhere; never the caller, someone they follow, or anyone on either side of a block.';

revoke all on function public.social_follow_suggestions(text, text, text, integer, integer) from public;
grant execute on function public.social_follow_suggestions(text, text, text, integer, integer) to anon, authenticated;
