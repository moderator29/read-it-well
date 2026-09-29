-- V-82: WHICH AREAS HAVE EARNED A PUBLIC PRICE PAGE.
--
-- `/areas/<state>/<area>` is the only public inventory surface under the 23
-- September ruling, and it shows AGGREGATES ONLY: what similar homes in that
-- area are asking, by type and bedrooms, with the count and the dates. No
-- listing, no photograph, no agent, no address. It is a statement about a
-- market, like the landing page, and it answers the question people actually
-- type into a search engine.
--
-- A PAGE EXISTS ONLY WHERE THE PRICE CHECK FLOOR IS MET BY REAL LISTINGS.
-- This function is the list of such areas, and the page, the sitemap and the
-- route all read it: an area not in this list is a 404, never a thin page.
-- The floor is the Price Check minimum (`MINIMUM_COMPARABLES`, five) and it is
-- clamped HERE, `greatest(p_minimum, 5)`, so no caller can ask for a page on
-- the strength of fewer. Example listings are excluded by predicate, as they
-- are from every figure Price Check prints: an example's price is fiction.
--
-- TODAY THIS RETURNS NOTHING, AND THAT IS CORRECT. All 64 published listings
-- are examples. The sitemap grows with real supply, not before it.
--
-- The filters are `area_asking_summary`'s own (published, not an example,
-- yearly rent, a positive price, published within 540 days), so an area that
-- earns a page is exactly an area the page can then draw figures for.
--
-- SECURITY INVOKER, like every Price Check read: the caller's RLS decides
-- which listings are counted, and `anon` already reads published listings and
-- executes `area_asking_summary`. It returns names and counts, never a row.

create or replace function public.area_price_pages(p_minimum integer default 5)
returns table (
  state_code    text,
  state_name    text,
  area          text,
  listing_count integer,
  newest_at     timestamptz
)
language sql
stable
set search_path to ''
as $function$
  select
    l.state_code,
    st.name,
    -- The spelling most listers used, so "yaba" and "Yaba" are one page.
    mode() within group (order by btrim(l.area)),
    count(*)::integer,
    max(l.published_at)
  from public.listings l
  join public.states st on st.code = l.state_code
  where l.status = 'PUBLISHED'
    and l.is_demo = false
    and l.listing_intent = 'rent'
    and l.rent_period = 'year'
    and l.rent_amount_minor > 0
    and l.area is not null
    and btrim(l.area) <> ''
    -- An area typed as a street address never becomes a public page title.
    and btrim(l.area) !~* '^(no\.?|number)\s*[0-9]'
    and btrim(l.area) !~* '(^|[\s,])[0-9]+[a-z]?[\s,/-]+.*\m(road|street|close|crescent|avenue|drive|lane|way|boulevard|court|terrace)\M'
    and l.published_at >= now() - interval '540 days'
  group by l.state_code, st.name, lower(btrim(l.area))
  having count(*) >= greatest(coalesce(p_minimum, 5), 5)
  order by count(*) desc, l.state_code;
$function$;

comment on function public.area_price_pages(integer) is
  'V-82. The areas that have earned a public price page: at least five (clamped, never fewer) real, published, yearly-rent listings in the last 540 days. Examples never count. Names and counts only. Empty while every listing is an example, which is correct.';

revoke all on function public.area_price_pages(integer) from public;
grant execute on function public.area_price_pages(integer) to anon, authenticated;
