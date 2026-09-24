set local lock_timeout = '5s';

-- OPS-11 after V-58 and V-06: ratings are grouped over the counted reviews,
-- and the keyset indexes no longer lead with `featured`.
--
-- ORDER: APPLY AFTER 20260924130800 (V-58), which creates
-- public.reviews_counted. This file names that view, so it cannot run before
-- it. Until it runs, the catalogue reads ratings through V-58's row read, which
-- is correct and capped; nothing is counted wrongly in between.
--
-- 1. `public.listing_review_counted_stats`: the average and count per listing,
--    grouped in SQL over `public.reviews_counted`, so a review written from the
--    lister's own shadow is neither averaged nor counted. SECURITY INVOKER:
--    the view decides what the caller may see, as it does for the row read.
-- 2. `public.listing_review_stats` (20260924100344) is dropped. It grouped the
--    bare table, so it would count the withheld reviews back in, and every
--    anonymous caller could compare its answer with the counted one and learn
--    which listings have a withheld review. Nothing calls it after the merge.
-- 3. The two keyset indexes from 20260924100344 led with `featured`, which
--    V-06 locked to false and nothing orders on. They are replaced by the same
--    orders without it, which is what the catalogue now reads in.

create or replace function public.listing_review_counted_stats(p_listing_ids uuid[])
returns table (listing_id uuid, rating_avg numeric, review_count integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.listing_id,
         round(avg(r.rating)::numeric, 4) as rating_avg,
         count(*)::integer                as review_count
    from public.reviews_counted r
   where r.listing_id = any (p_listing_ids)
     and cardinality(p_listing_ids) <= 1000
   group by r.listing_id
$$;

comment on function public.listing_review_counted_stats(uuid[]) is
  'OPS-11 with V-58: rating average and review count per listing over public.reviews_counted, so a review from the lister''s own shadow does not count. At most 1000 ids per call.';

revoke all on function public.listing_review_counted_stats(uuid[]) from public;
grant execute on function public.listing_review_counted_stats(uuid[]) to anon, authenticated, service_role;

drop function if exists public.listing_review_stats(uuid[]);

drop index if exists public.listings_catalogue_keyset_idx;
drop index if exists public.listings_move_in_keyset_idx;

create index if not exists listings_newest_keyset_idx
  on public.listings (published_at desc nulls last, created_at desc, id desc)
  where status = 'PUBLISHED';

create index if not exists listings_move_in_newest_keyset_idx
  on public.listings (total_move_in_cost_minor asc nulls last,
                      published_at desc nulls last, created_at desc, id desc)
  where status = 'PUBLISHED';

-- Read-back: raise, so a partial application rolls back.
do $$
declare
  bad text := '';
begin
  if to_regprocedure('public.listing_review_counted_stats(uuid[])') is null then
    bad := bad || ' [counted stats missing]';
  elsif pg_get_functiondef('public.listing_review_counted_stats(uuid[])'::regprocedure) not ilike '%public.reviews_counted%' then
    bad := bad || ' [counted stats does not read reviews_counted]';
  end if;
  if to_regprocedure('public.listing_review_stats(uuid[])') is not null then
    bad := bad || ' [bare-table stats still present]';
  end if;
  if has_function_privilege('anon', 'public.listing_review_counted_stats(uuid[])', 'execute') is not true then
    bad := bad || ' [anon cannot call counted stats]';
  end if;
  if to_regclass('public.listings_newest_keyset_idx') is null
     or to_regclass('public.listings_move_in_newest_keyset_idx') is null then
    bad := bad || ' [keyset indexes missing]';
  end if;
  if to_regclass('public.listings_catalogue_keyset_idx') is not null
     or to_regclass('public.listings_move_in_keyset_idx') is not null then
    bad := bad || ' [featured-led indexes still present]';
  end if;
  if bad <> '' then
    raise exception 'ops11 counted ratings read-back failed:%', bad;
  end if;
end
$$;
