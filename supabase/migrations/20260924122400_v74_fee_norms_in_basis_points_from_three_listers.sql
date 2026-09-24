-- V-74, REVIEW FIX: FEE NORMS IN WHOLE BASIS POINTS, AND ONLY FROM AT LEAST
-- THREE LISTERS.
--
-- The median fee share was a rounded decimal, and five listings from one
-- agent could make "the area's usual fee" one agent's habit. Now each share is
-- whole basis points (an integer: 1000 is 10 per cent), a fee's figure needs
-- at least five listings that stated it FROM AT LEAST THREE DIFFERENT
-- LISTERS, and the function also says how many different listers hold the
-- similar homes the asking range is drawn from, so the wizard can refuse a
-- range that is one lister's pricing. The old three-argument function is
-- dropped.

drop function if exists public.area_fee_norms(text, text, text);

create or replace function public.area_fee_norms(
  p_state_code text,
  p_city text,
  p_area text,
  p_property_type text default null,
  p_bedrooms integer default null
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
         -- Similar homes of either intent (the range may be a sale's), real,
         -- published, in the area, in the same 540 days.
         (select count(distinct l.agent_id)::integer from public.listings l
           where l.status = 'PUBLISHED'::public.listing_status
             and l.is_demo = false
             and l.state_code = upper(btrim(p_state_code))
             and lower(btrim(l.area)) = lower(btrim(p_area))
             and coalesce(l.published_at, l.created_at) >= now() - interval '540 days'
             and (p_property_type is null or l.property_type::text = p_property_type)
             and (p_bedrooms is null or l.bedrooms = p_bedrooms))
    from agency a, legal g;
end;
$function$;

comment on function public.area_fee_norms(text, text, text, text, integer) is
  'V-74. In one area: real published yearly lets from the last 540 days; the median agency and legal fee as WHOLE BASIS POINTS of the yearly rent, each only where five listings from at least three listers stated it; and how many different listers hold similar homes (type and bedrooms), so a range from one lister can be refused. Signed in only.';

revoke all on function public.area_fee_norms(text, text, text, text, integer) from public, anon;
grant execute on function public.area_fee_norms(text, text, text, text, integer) to authenticated;
