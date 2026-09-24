-- V-74: THE AREA'S USUAL FEES, BESIDE THE WIZARD'S FEE LINES.
--
-- The wizard's pricing step now shows what similar homes in the area are
-- asking (from `area_asking_summary`, which exists). Beside the agency and
-- legal fee lines it shows what listings in the same area usually charge as a
-- share of the yearly rent. That figure did not exist anywhere, so this adds
-- the one read that makes it.
--
-- THE SAME DISCIPLINE AS THE ASKING FIGURES. Real, published, yearly lets
-- only (examples never count), published in the last 540 days (the window
-- `area_asking_summary` is called with), and a percentage only where at least
-- five listings STATED that fee (k = 5). A listing that stated no agency fee
-- is absent from the agency figure, never counted as zero: "no agency fee"
-- and "did not say" are different facts. The answer is a median and its
-- count, never a list, and never a listing.
--
-- Signed-in readers only (the wizard is behind the gate), security definer so
-- it reads the fee columns without widening any grant on `listings`, pinned
-- search path (rule 21).

create or replace function public.area_fee_norms(p_state_code text, p_city text, p_area text)
returns table (
  listing_count     integer,
  agency_count      integer,
  agency_pct        numeric,
  legal_count       integer,
  legal_pct         numeric
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
    select l.rent_amount_minor::numeric as rent, l.agency_fee_minor, l.legal_fee_minor
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
  )
  select count(*)::integer,
         count(*) filter (where agency_fee_minor is not null)::integer,
         case when count(*) filter (where agency_fee_minor is not null) >= 5 then
           round((percentile_cont(0.5) within group (order by agency_fee_minor / rent)
                   filter (where agency_fee_minor is not null) * 100)::numeric, 1)
         end,
         count(*) filter (where legal_fee_minor is not null)::integer,
         case when count(*) filter (where legal_fee_minor is not null) >= 5 then
           round((percentile_cont(0.5) within group (order by legal_fee_minor / rent)
                   filter (where legal_fee_minor is not null) * 100)::numeric, 1)
         end
    from lets;
end;
$function$;

comment on function public.area_fee_norms(text, text, text) is
  'V-74. In one area: how many real published yearly lets from the last 540 days, and the median agency and legal fee as a percentage of the yearly rent, each only where at least five listings stated that fee. Signed in only. Counts and medians, never a listing.';

revoke all on function public.area_fee_norms(text, text, text) from public, anon;
grant execute on function public.area_fee_norms(text, text, text) to authenticated;
