-- Applied 13 October 2026 (owner proof of ownership and one side per account, founder decisions).
set lock_timeout = '5s';

create or replace function public.ownership_seen_at(p_user uuid)
returns timestamptz
language sql
stable
security definer
set search_path to ''
as $fn$
  select max(d.reviewed_at)
    from public.agent_documents d
   where d.uploader_id = p_user
     and d.kind = 'ownership'
     and d.listing_id is null
     and d.review_status = 'approved'
     and not exists (select 1 from public.agent_documents s where s.supersedes_id = d.id)
     and exists (select 1 from public.agents a where a.user_id = p_user and a.role::text = 'owner');
$fn$;

comment on function public.ownership_seen_at(uuid) is
  'When a reviewer approved this owner''s current proof of ownership filed with their registration, or null. Draws the "Ownership seen" mark. Leaks no document, only a date.';

revoke all on function public.ownership_seen_at(uuid) from public;
grant execute on function public.ownership_seen_at(uuid) to anon, authenticated;

/* The same date for a listing's lister, so the listing page need not know
   the lister's account id, which no public read carries. A listing listed by
   an agent never shows it: the mark is the owner's own. */
create or replace function public.listing_ownership_seen_at(p_listing uuid)
returns timestamptz
language sql
stable
security definer
set search_path to ''
as $fn$
  select public.ownership_seen_at(a.user_id)
    from public.listings l
    join public.agents a on a.id = l.agent_id
   where l.id = p_listing
     and l.status::text = 'PUBLISHED'
     and a.role::text = 'owner';
$fn$;

revoke all on function public.listing_ownership_seen_at(uuid) from public;
grant execute on function public.listing_ownership_seen_at(uuid) to anon, authenticated;

