-- Real, publishable counts for the landing page.
--
-- The marketing band hardcoded "Listings 17+" and "Cities 6", which were the
-- size of the seed catalogue rather than anything the platform holds, while
-- getPlatformStats() deliberately returned null so nobody published an
-- invented figure. This gives the page one true source instead.
--
-- Security definer so the aggregate can be counted without granting anon a
-- read over anything: it returns four integers, never a row. It counts only
-- PUBLISHED listings and APPROVED agents, which is exactly the set an
-- anonymous visitor can already see one at a time through the catalogue, so
-- nothing here discloses more than the search page does.

create or replace function public.platform_stats()
returns table (
  listings   bigint,
  cities     bigint,
  states     bigint,
  agents     bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (select count(*) from public.listings where status = 'PUBLISHED'),
    (select count(distinct city) from public.listings
      where status = 'PUBLISHED' and city is not null and length(btrim(city)) > 0),
    (select count(distinct state_code) from public.listings
      where status = 'PUBLISHED' and state_code is not null),
    (select count(*) from public.agents where status = 'APPROVED');
$$;

comment on function public.platform_stats() is
  'Publishable platform counts for the landing page: PUBLISHED listings, the distinct cities and states they sit in, and APPROVED agents. Executable by anon BY DESIGN, and flagged by the security linter for exactly that reason. It returns four integers and never a row, and every one of them aggregates rows an anonymous visitor can already read one at a time through the catalogue, so it discloses nothing the search page does not. Security definer so the counts do not require granting anon a read over anything.';

revoke all on function public.platform_stats() from public;
grant execute on function public.platform_stats() to anon, authenticated, service_role;
