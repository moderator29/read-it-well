-- V-07 AND V-82, REVIEW FIX: TEXT A LISTER TYPED IS HELD TO RULE 10 IN THE
-- DATABASE, NOT ONLY IN THE CODE.
--
-- The first version of the share door filtered the AREA and printed the
-- lister's TITLE as typed, so a title of "2 bed flat, 14 Admiralty Way" would
-- have reached the public card, the page title, the Open Graph tags and the
-- unfurl image. And the area pages' filter caught "14 Admiralty Way" but not
-- "Admiralty Way", "Chevron Drive" or "Lekki Gardens Estate", any of which
-- could have become an indexed public page. Rule 10: no share artefact ever
-- carries a specific address, for anybody.
--
-- `private.public_text_is_safe` is the SQL twin of
-- `apps/web/src/lib/share/public-text.ts`, and both apply one test: the Price
-- Check address shapes, any street or estate word, a house, plot, block, flat
-- or unit number, and landmark phrasing. It fails towards printing less.
--
-- `share_door` now hands over the title, the area and the city ONLY when they
-- pass; otherwise null, and the card composes a title from facts ("2 bedroom
-- flat in Yaba") and falls back from the area to the city to the state.
-- `area_price_pages` now admits only an area that passes, and becomes
-- SECURITY DEFINER so a stranger (`anon`, who has no usage on the private
-- schema) can call the helper through it. It reads only published, real
-- listings and returns names and counts, which is exactly what it returned
-- under the caller's rights, so the widening changes who may run the test and
-- nothing about what comes back. Both functions are
-- otherwise exactly as their first migrations wrote them, so the claim in
-- those headers ("cannot carry an address") is true of the pair.

create or replace function private.public_text_is_safe(p_text text)
returns boolean
language sql
immutable
set search_path to ''
as $function$
  select p_text is not null
     and btrim(p_text) <> ''
     and btrim(p_text) !~* '^(no\.?|number)\s*[0-9]'
     and btrim(p_text) !~* '(^|[\s,])[0-9]+[a-z]?[\s,/-]+.*\m(road|street|close|crescent|avenue|drive|lane|way|boulevard|court|terrace)\M'
     and btrim(p_text) !~* '\m(road|rd|street|str|close|crescent|cres|avenue|ave|drive|lane|ln|way|boulevard|blvd|court|terrace|estate|gardens|layout|mews|quarters|scheme)\M'
     and btrim(p_text) !~* '\m(st|dr)\.'
     and btrim(p_text) !~* '\mgarden\s+city\M'
     and btrim(p_text) !~* '\m(no\.?|number|plot|block|blk|house|flat|apt|apartment|unit|suite|door)\s*[#:.-]?\s*[a-z]?[0-9]'
     and btrim(p_text) !~* '\m(opposite|opp|beside|behind|adjacent|near|off)\M'
     and btrim(p_text) !~* '\m(next|close)\s+to\M';
$function$;

comment on function private.public_text_is_safe(text) is
  'Rule 10, in SQL: may this piece of lister text (a title, an area, a city) appear on a public surface? False for street and estate words, house/plot/block/unit numbers, landmark phrasing and the Price Check address shapes. The twin of apps/web/src/lib/share/public-text.ts.';

revoke all on function private.public_text_is_safe(text) from public, anon;
grant execute on function private.public_text_is_safe(text) to authenticated, service_role;

create or replace function public.share_door(p_token text)
returns table (
  state                    text,     -- 'listing', 'price_area' or 'gone'
  listing_id               uuid,
  reference                text,
  is_demo                  boolean,
  title                    text,
  area                     text,
  city                     text,
  state_name               text,
  property_type            text,
  listing_intent           text,
  bedrooms                 integer,
  rent_amount_minor        bigint,
  rent_period              text,
  caution_deposit_minor    bigint,
  service_charge_minor     bigint,
  service_charge_period    text,
  agency_fee_minor         bigint,
  legal_fee_minor          bigint,
  agreement_fee_minor      bigint,
  total_move_in_cost_minor bigint,
  sale_price_minor         bigint,
  rate_minor               bigint,
  rate_period              text,
  photo_path               text,
  price_share_id           uuid
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  link_kind text;
  link_target uuid;
  wanted text := btrim(coalesce(p_token, ''));
  code text;
  target uuid;
  board_open boolean;
begin
  -- A listing code, at the door, only while the board flag says true.
  if upper(wanted) ~ '^VL-?[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$' then
    select coalesce((select f.enabled from public.feature_flags f where f.key = 'listing_board'), false)
      into board_open;
    if not board_open then
      return;
    end if;
    code := 'VL-' || right(regexp_replace(upper(wanted), '[^A-Z0-9]', '', 'g'), 6);
    select l.id into target from public.listings l where l.reference = code;
    if target is null then
      return;
    end if;
    link_kind := 'listing';
    link_target := target;
  else
    if wanted !~ '^[23456789abcdefghjkmnpqrstvwxyz]{10}$' then
      return;
    end if;
    select sl.kind, sl.target_id into link_kind, link_target
      from public.share_links sl
     where sl.token = wanted and sl.revoked_at is null;
    if not found then
      return;
    end if;
  end if;

  if link_kind = 'price_area' then
    return query
      select 'price_area'::text, null::uuid, null::text, false, null::text,
             null::text, null::text, null::text, null::text, null::text, null::integer,
             null::bigint, null::text, null::bigint, null::bigint, null::text,
             null::bigint, null::bigint, null::bigint, null::bigint, null::bigint,
             null::bigint, null::text, null::text, s.id
        from public.price_check_shares s
       where s.id = link_target;
    return;
  end if;

  -- An unpublished listing (withdrawn, suspended, let) answers "gone" and
  -- nothing else: no title, no place, no figure.
  if not exists (
    select 1 from public.listings l
     where l.id = link_target and l.status = 'PUBLISHED'::public.listing_status
  ) then
    return query
      select 'gone'::text, null::uuid, null::text, false, null::text,
             null::text, null::text, null::text, null::text, null::text, null::integer,
             null::bigint, null::text, null::bigint, null::bigint, null::text,
             null::bigint, null::bigint, null::bigint, null::bigint, null::bigint,
             null::bigint, null::text, null::text, null::uuid;
    return;
  end if;

  -- The only select on public.listings that feeds the card. Every column it
  -- names is on the card; for an example the title, place and every figure
  -- are blanked here, under the syndication rule.
  return query
    select 'listing'::text,
           l.id,
           l.reference,
           l.is_demo,
           case when l.is_demo or not private.public_text_is_safe(l.title) then null else l.title end,
           case when l.is_demo or not private.public_text_is_safe(l.area) then null else l.area end,
           case when l.is_demo or not private.public_text_is_safe(l.city) then null else l.city end,
           case when l.is_demo then null else st.name end,
           l.property_type::text,
           l.listing_intent::text,
           case when l.is_demo then null else l.bedrooms end,
           case when l.is_demo then null else l.rent_amount_minor end,
           case when l.is_demo then null else l.rent_period::text end,
           case when l.is_demo then null else l.caution_deposit_minor end,
           case when l.is_demo then null else l.service_charge_minor end,
           case when l.is_demo then null else l.service_charge_period::text end,
           case when l.is_demo then null else l.agency_fee_minor end,
           case when l.is_demo then null else l.legal_fee_minor end,
           case when l.is_demo then null else l.agreement_fee_minor end,
           case when l.is_demo then null else l.total_move_in_cost_minor end,
           case when l.is_demo then null else l.sale_price_minor end,
           case when l.is_demo then null else l.rate_minor end,
           case when l.is_demo then null else l.rate_period::text end,
           case when l.is_demo then null else (
             select p.storage_path from public.listing_photos p
              where p.listing_id = l.id
              order by p.position asc, p.created_at asc
              limit 1)
           end,
           null::uuid
      from public.listings l
      left join public.states st on st.code = l.state_code
     where l.id = link_target;
end;
$function$;

comment on function public.share_door(text) is
  'V-07. The whole public projection of a share door. No address, landmark, coordinate, location, estate, lister or contact column; the title, area and city are returned only when private.public_text_is_safe passes. Examples come back with no title, place, photo or figure. VL- codes answer only while feature_flags.listing_board is true.';

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
security definer
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
    -- A street, an estate, a house number or a landmark never becomes a
    -- public page title: the same test the share door applies.
    and private.public_text_is_safe(l.area)
    and l.published_at >= now() - interval '540 days'
  group by l.state_code, st.name, lower(btrim(l.area))
  having count(*) >= greatest(coalesce(p_minimum, 5), 5)
  order by count(*) desc, l.state_code;
$function$;

comment on function public.area_price_pages(integer) is
  'V-82. The areas that have earned a public price page: at least five (clamped) real, published, yearly-rent listings in the last 540 days, in an area whose name passes private.public_text_is_safe. Examples never count. Names and counts only.';
