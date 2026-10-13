set lock_timeout = '5s';

create or replace function public.listings_ownership_seen_at(p_listings uuid[])
returns table (listing_id uuid, seen_at timestamptz)
language sql
stable
security definer
set search_path to ''
as $fn$
  select l.id, public.ownership_seen_at(a.user_id)
    from public.listings l
    join public.agents a on a.id = l.agent_id
   where l.id = any (coalesce(p_listings[1:200], '{}'::uuid[]))
     and l.status::text = 'PUBLISHED'
     and a.role::text = 'owner'
     and public.ownership_seen_at(a.user_id) is not null;
$fn$;

comment on function public.listings_ownership_seen_at(uuid[]) is
  'The "Ownership seen" date for each of up to 200 published listings whose lister is an owner with an approved, current proof of ownership. The batch twin of listing_ownership_seen_at(uuid). Leaks no document, only a date.';

revoke all on function public.listings_ownership_seen_at(uuid[]) from public;
grant execute on function public.listings_ownership_seen_at(uuid[]) to anon, authenticated;
