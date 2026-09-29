-- V-74, REVIEW FIX: THE LISTER COUNT COMES FROM THE SAME ROWS AS THE RANGE.
--
-- similar_listers counted listings of either intent, any rent period, any
-- city, with no price and dated by created_at, so it could reach three while
-- the rows area_asking_summary actually drew the range from belonged to one
-- lister. It now applies area_asking_summary's filters exactly, and takes the
-- intent (p_intent, 'rent' or 'sale') to do so. The fee medians are
-- unchanged. The five-argument function is dropped.

drop function if exists public.area_fee_norms(text, text, text, text, integer);

create or replace function public.area_fee_norms(
  p_state_code text,
  p_city text,
  p_area text,
  p_property_type text default null,
  p_bedrooms integer default null,
  p_intent text default 'rent'
)
returns table (
  listing_count     integer,
  agency_count      integer,
  agency_listers    integer,
  agency_bp         integer,
  legal_count       integer,
  legal_listers     integer,
  legal_bp          integer,
  similar_listers   integer
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'sign in' using errcode = '42501';
  end if;
  if p_state_code is null or btrim(coalesce(p_area, '')) = '' then
    return;
  end if;

  return query
  with lets as (
    select l.agent_id, l.property_type::text as property_type, l.bedrooms,
           l.rent_amount_minor::numeric as rent, l.agency_fee_minor, l.legal_fee_minor
      from public.listings l
     where l.status = 'PUBLISHED'::public.listing_status
       and l.is_demo = false
       and l.listing_intent::text = 'rent'
       and l.rent_period::text = 'year'
       and coalesce(l.rent_amount_minor, 0) > 0
       and l.state_code = upper(btrim(p_state_code))
       and lower(btrim(l.area)) = lower(btrim(p_area))
       and (p_city is null or btrim(p_city) = '' or lower(btrim(l.city)) = lower(btrim(p_city)))
       and coalesce(l.published_at, l.created_at) >= now() - interval '540 days'
  ),
  agency as (
    select count(*)::integer as n, count(distinct agent_id)::integer as listers,
           round(percentile_cont(0.5) within group (order by agency_fee_minor * 10000 / rent))::integer as bp
      from lets where agency_fee_minor is not null
  ),
  legal as (
    select count(*)::integer as n, count(distinct agent_id)::integer as listers,
           round(percentile_cont(0.5) within group (order by legal_fee_minor * 10000 / rent))::integer as bp
      from lets where legal_fee_minor is not null
  )
  select (select count(*)::integer from lets),
         a.n, a.listers, case when a.n >= 5 and a.listers >= 3 then a.bp end,
         g.n, g.listers, case when g.n >= 5 and g.listers >= 3 then g.bp end,
         -- Listers behind the SAME rows area_asking_summary drew the range
         -- from: its exact filters (state, city, area, type, intent,
         -- bedrooms, yearly rent only for a let, published in the last 540
         -- days, a positive price).
         (select count(distinct l.agent_id)::integer from public.listings l
           where l.status = 'PUBLISHED'::public.listing_status
             and l.is_demo = false
             and l.state_code = p_state_code
             and (p_city is null or lower(btrim(l.city)) = lower(btrim(p_city)))
             and lower(btrim(l.area)) = lower(btrim(p_area))
             and (p_property_type is null or l.property_type::text = p_property_type)
             and l.listing_intent::text = coalesce(p_intent, 'rent')
             and (p_bedrooms is null or l.bedrooms = p_bedrooms)
             and (coalesce(p_intent, 'rent') <> 'rent' or l.rent_period::text = 'year')
             and l.published_at >= now() - make_interval(days => 540)
             and case when l.listing_intent::text = 'sale'
                      then l.sale_price_minor else l.rent_amount_minor end > 0)
    from agency a, legal g;
end;
$function$;

comment on function public.area_fee_norms(text, text, text, text, integer, text) is
  'V-74. In one area: real published yearly lets from the last 540 days; the median agency and legal fee as WHOLE BASIS POINTS of the yearly rent, each only where five listings from at least three listers stated it; and how many different listers hold the very rows area_asking_summary draws the range from (same filters, intent included), so a range from one lister can be refused. Signed in only.';

revoke all on function public.area_fee_norms(text, text, text, text, integer, text) from public, anon;
grant execute on function public.area_fee_norms(text, text, text, text, integer, text) to authenticated;
