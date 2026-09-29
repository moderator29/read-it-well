-- MONEY 7 / V-39: PRICE CHECK LEARNS WHAT PEOPLE ACTUALLY PAID.
--
-- Supersedes the unapplied 20260924140600_v39 (moved to superseded/). The
-- original counted a tenancy once ANY successful transaction existed on its
-- charge. With V-86 a charge can be paid in several shares, so one share is
-- not a price anybody paid: a tenancy now counts only once its successful
-- split payments cover the whole move-in total (`private.tenancy_paid`), and
-- its paid date is the day the LAST share settled. It reads the tenancy
-- snapshot (MONEY 4) for the area as it stood when paid.
--
-- IT SPEAKS ONLY IN CROWDS: a cell (state, area, property type, bedrooms)
-- answers only with at least five standing tenancies from at least three
-- listers; the window is fixed at 365 days; an area is required; the count is
-- a band; quartiles are rounded to 50,000 naira and the fee share to 500
-- basis points; months, never days. Examples, cancelled, refunded and
-- reversed tenancies never count. Security definer because it aggregates rows
-- no caller may read one by one; it returns aggregates only.

create or replace function public.area_paid_summary(p_state_code text, p_area text)
returns table (
  property_type        public.property_type,
  bedrooms             integer,
  tenancy_band         text,
  p25_minor            bigint,
  median_minor         bigint,
  p75_minor            bigint,
  median_fee_share_bps integer,
  oldest_at            timestamptz,
  newest_at            timestamptz
)
language sql
stable
security definer
set search_path to ''
as $function$
  with settled as (
    select rp.id, rp.lister_id, rp.total_minor, rp.rent_minor,
           coalesce(rp.agency_minor, 0) + coalesce(rp.legal_minor, 0) + coalesce(rp.agreement_minor, 0) as fees_minor,
           l.property_type, l.bedrooms,
           coalesce(s.listing ->> 'state_code', l.state_code) as state_code,
           coalesce(s.listing ->> 'area', l.area) as area,
           (select max(t.created_at) from public.transactions t
             where t.booking_id = rp.booking_id and t.status = 'SUCCESSFUL') as paid_at
      from public.rent_payments rp
      join public.listings l on l.id = rp.listing_id
      join public.bookings b on b.id = rp.booking_id
      left join public.tenancy_snapshots s on s.rent_payment_id = rp.id
     where l.is_demo = false
       and rp.rent_period = 'year'
       and rp.total_minor > 0
       and b.status <> 'CANCELLED'
       and private.tenancy_paid(rp.id)
       and not private.tenancy_void(rp.id)
       and not exists (select 1 from public.transactions t where t.booking_id = rp.booking_id and t.status = 'REFUNDED')
       and not exists (select 1 from public.booking_refunds r where r.booking_id = rp.booking_id and r.refund_minor > 0)
       and not exists (select 1 from public.rent_refunds_owed o where o.booking_id = rp.booking_id)
  )
  select
    s.property_type,
    s.bedrooms,
    case when count(*) >= 10 then '10+' else '5-9' end,
    (round(percentile_cont(0.25) within group (order by s.total_minor) / 5000000) * 5000000)::bigint,
    (round(percentile_cont(0.50) within group (order by s.total_minor) / 5000000) * 5000000)::bigint,
    (round(percentile_cont(0.75) within group (order by s.total_minor) / 5000000) * 5000000)::bigint,
    (round(percentile_cont(0.50) within group (
       order by case when s.rent_minor > 0 then (s.fees_minor * 10000.0 / s.rent_minor) end) / 500) * 500)::integer,
    date_trunc('month', min(s.paid_at)),
    date_trunc('month', max(s.paid_at))
  from settled s
  where nullif(btrim(coalesce(p_area, '')), '') is not null
    and s.paid_at is not null
    and s.paid_at >= now() - interval '365 days'
    and s.state_code = p_state_code
    and lower(btrim(s.area)) = lower(btrim(p_area))
  group by s.property_type, s.bedrooms
  having count(*) >= 5
     and count(distinct s.lister_id) >= 3
  order by s.property_type, s.bedrooms;
$function$;

revoke all on function public.area_paid_summary(text, text) from public, anon;
grant execute on function public.area_paid_summary(text, text) to authenticated;

comment on function public.area_paid_summary(text, text) is
  'V-39. What yearly tenancies of a type and bedroom count in one named area were actually PAID at to move in (every split share settled), over the last 365 days (fixed): quartiles rounded to 50,000 naira, the median fee share rounded to 500 basis points, and a count band. Only a cell with at least 5 standing tenancies from at least 3 listers answers.';

do $$
begin
  if has_function_privilege('anon', 'public.area_paid_summary(text,text)', 'EXECUTE') then
    raise exception 'area_paid_summary is open to anon';
  end if;
  if position('private.tenancy_paid' in pg_get_functiondef('public.area_paid_summary(text,text)'::regprocedure)) = 0 then
    raise exception 'area_paid_summary does not wait for the whole move-in';
  end if;
  if exists (select 1 from public.area_paid_summary('LA', 'Yaba')) then
    raise exception 'area_paid_summary answered with no settled tenancies on the platform';
  end if;
end $$;
