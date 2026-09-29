-- RECOVERED FROM THE LIVE HISTORY (DB2, 2026-09-28). This migration was applied as
-- version 20260924100344 but never committed. Everything below this header is
-- supabase_migrations.schema_migrations.statements[1] for that version,
-- byte for byte (md5 checked against the live row). Do not edit.

-- OPS-11: the catalogue pages by keyset, and a listing's rating is aggregated
-- where the reviews are.
--
-- Additive only. Nothing existing is altered, so the code already on main
-- keeps working before and after this runs.
--
-- 1. Two indexes that match the two orders the catalogue reads in, each ending
--    in `id` so the order is total and a cursor names exactly one position.
--    `listings_catalogue_order_idx` (the same columns without `id`) is left in
--    place for the code that does not page yet.
-- 2. `public.listing_review_stats`: the average and count per listing, grouped
--    in SQL. The page's reader used to fetch every review row for a page of
--    listings, capped at 5,000 rows, and average them in memory: past the cap
--    a rating was an average of a truncated sample. SECURITY INVOKER, so the
--    caller's RLS on reviews decides what is counted, exactly as the row read
--    it replaces did.

create index if not exists listings_catalogue_keyset_idx
  on public.listings (featured desc, published_at desc nulls last, created_at desc, id desc)
  where status = 'PUBLISHED';

create index if not exists listings_move_in_keyset_idx
  on public.listings (total_move_in_cost_minor asc nulls last, featured desc,
                      published_at desc nulls last, created_at desc, id desc)
  where status = 'PUBLISHED';

create or replace function public.listing_review_stats(p_listing_ids uuid[])
returns table (listing_id uuid, rating_avg numeric, review_count integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.listing_id,
         round(avg(r.rating)::numeric, 4) as rating_avg,
         count(*)::integer                as review_count
    from public.reviews r
   where r.listing_id = any (p_listing_ids)
     and cardinality(p_listing_ids) <= 1000
   group by r.listing_id
$$;

comment on function public.listing_review_stats(uuid[]) is
  'OPS-11: rating average and review count per listing, grouped in SQL under the caller''s RLS. At most 1000 ids per call.';

revoke all on function public.listing_review_stats(uuid[]) from public;
grant execute on function public.listing_review_stats(uuid[]) to anon, authenticated, service_role;