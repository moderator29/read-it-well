/*
 * The two indexes the catalogue's own query has been running without.
 *
 * BE-2, the ordering. Every catalogue read ends in
 *
 *   where status = 'PUBLISHED'
 *   order by featured desc, published_at desc nulls last, created_at desc
 *
 * and the only index that touched it was listings_status_idx, a plain btree on
 * status alone. That index can find the published rows and then Postgres has to
 * sort all of them, on the single most-run query in the product, every time
 * anybody opens search or the home page. listings_catalogue_order_idx below is
 * that exact ordering under that exact predicate, so the read walks the index
 * in order and stops at the row cap instead of sorting the catalogue to throw
 * most of it away.
 *
 * The column order matters and is not cosmetic: it is the order of the ORDER BY
 * clause, including `nulls last` on published_at, because a btree can only be
 * walked in sorted order if its declared order is the one being asked for.
 *
 * BE-3, the free text, and this one is a correctness bug rather than a slow
 * query. Free text was never a predicate at all. The repository fetched the
 * first 200 published rows by featured and recency and THEN matched the search
 * term over them in memory, which means a search only ever saw the newest 200
 * listings. Searching Lekki returned nothing the moment the 201st listing was
 * published, and it looks like it works today only because the catalogue is
 * small enough that 200 covers all of it. It fails quietly and it fails at
 * exactly the point where the product starts working.
 *
 * The fix is to make the term narrow the rows in SQL so the cap applies to
 * MATCHING rows instead of to recent ones, and these are the indexes that lets
 * it be cheap. Trigram rather than tsvector on purpose: the in-memory matcher
 * is a substring test, and `to_tsvector` matches whole lexemes, so full text
 * search would answer a different question than the browser's live match count
 * does. gin_trgm_ops indexes `ilike '%term%'`, which is the same question, and
 * the two halves of this product are required not to disagree about how many
 * results a filter leaves.
 *
 * Partial on status = 'PUBLISHED' like their neighbours: an unpublished row is
 * not searchable by anyone, so indexing one is disk spent on rows the query can
 * never return.
 *
 * Built without CONCURRENTLY because a migration runs in a transaction and
 * cannot use it. That is safe here and would not be later: this table is small
 * today, so the lock is momentary. On a large listings table these should be
 * created concurrently outside a migration instead.
 */

create extension if not exists pg_trgm with schema extensions;

create index if not exists listings_catalogue_order_idx
  on public.listings (featured desc, published_at desc nulls last, created_at desc)
  where status = 'PUBLISHED';

create index if not exists listings_title_trgm_idx
  on public.listings using gin (title extensions.gin_trgm_ops)
  where status = 'PUBLISHED';

create index if not exists listings_city_trgm_idx
  on public.listings using gin (city extensions.gin_trgm_ops)
  where status = 'PUBLISHED';

create index if not exists listings_area_trgm_idx
  on public.listings using gin (area extensions.gin_trgm_ops)
  where status = 'PUBLISHED';
