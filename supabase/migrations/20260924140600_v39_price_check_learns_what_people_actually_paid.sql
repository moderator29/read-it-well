-- V-39: PRICE CHECK LEARNS WHAT PEOPLE ACTUALLY PAID.
--
-- `/price` reports what properties near here are ASKING. Asking prices in Lagos
-- are aspiration plus bait. `rent_payments` is the only table in the country
-- that knows what a tenancy was actually settled at, to the kobo, so this adds
-- the second number beside the first: the move-in totals actually paid in an
-- area in the last twelve months, and the median share of the rent paid in
-- fees on top.
--
-- IT SPEAKS ONLY IN CROWDS. A figure is returned for a cell (state, area,
-- property type, bedrooms) only when at least FIVE settled tenancies from at
-- least THREE different listers stand behind it, so no single charge and no
-- single agent's book can be read back out of it. And it gives nothing a
-- patient caller could subtract:
--
--   - the window is FIXED at the last 365 days; no caller chooses it, so two
--     windows cannot be differenced to isolate the tenancies between them;
--   - an AREA IS REQUIRED and there is no state-wide or city-wide total, so an
--     area cannot be subtracted from its parent;
--   - the count is a BAND ('5-9' or '10+'), not a number, so one new tenancy
--     does not move it by one;
--   - the quartiles are rounded to the nearest fifty thousand naira and the
--     fee share to the nearest 500 basis points (five percent);
--   - months, never days.
--
-- WHAT COUNTS. A tenancy counts once its move-in payment is SUCCESSFUL (a
-- `transactions` row) in the last 365 days, on a yearly let, on a listing that
-- is not an example (the demo trigger already refuses any charge on an
-- example; the filter says it again), and only while it stands: a charge
-- whose booking was CANCELLED, whose payment was REFUNDED, that was refunded
-- through `booking_refunds` or reversed by the lister (`rent_refunds_owed`)
-- is not a price anybody paid. The area is the one frozen in the tenancy's
-- promise snapshot where there is one, else the listing's.
--
-- TODAY IT RETURNS NOTHING, and that is the correct answer: there is no real
-- listing and no settled tenancy on the platform. The probe that ships with
-- this file proves the gate at 4 tenancies, at 5 tenancies from 2 listers, at
-- 5 from 3, and that a refunded tenancy drops out.
--
-- SECURITY DEFINER because it aggregates rows no caller may read one by one;
-- it returns aggregates only. Callable by signed-in members, like the asking
-- report it sits beside.

create or replace function public.area_paid_summary(
  p_state_code text,
  p_area       text
)
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
           (select min(t.created_at) from public.transactions t
             where t.booking_id = rp.booking_id and t.status = 'SUCCESSFUL') as paid_at
      from public.rent_payments rp
      join public.listings l on l.id = rp.listing_id
      join public.bookings b on b.id = rp.booking_id
      left join public.tenancy_snapshots s on s.rent_payment_id = rp.id
     where l.is_demo = false
       and rp.rent_period = 'year'
       and rp.total_minor > 0
       and b.status <> 'CANCELLED'
       and not exists (select 1 from public.transactions t
                        where t.booking_id = rp.booking_id and t.status = 'REFUNDED')
       and not exists (select 1 from public.booking_refunds r
                        where r.booking_id = rp.booking_id and r.refund_minor > 0)
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
  'V-39. What yearly tenancies of a type and bedroom count in one named area were actually PAID at to move in, over the last 365 days (fixed): quartiles of the settled move-in total rounded to 50,000 naira, the median fee share of rent rounded to 500 basis points, and a count band (5-9 or 10+). Returned only for a cell with at least 5 standing tenancies from at least 3 listers. No area, no answer. Examples, cancelled and refunded tenancies never count.';
