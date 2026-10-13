-- Applied 13 October 2026. Founder decision: the fee is per seated table, not per seated guest.
-- The commission on bills paid through Vallo was also set to 2 percent (200 bps) with:
--   update public.restaurant_money_settings set bill_commission_bps = 200, updated_at = now() where id;
set lock_timeout = '5s';

create or replace function public.restaurant_seated_fees(p_months integer default 6)
returns table (
  business_id uuid,
  business_name text,
  month date,
  seated_tables integer,
  seated_guests integer,
  fee_minor bigint,
  bills_paid integer,
  bill_commission_minor bigint
)
language plpgsql stable security definer set search_path to '' as $$
declare
  fee bigint;
begin
  if not (private.has_role(auth.uid(), 'admin'::public.app_role)
          or private.has_role(auth.uid(), 'super_admin'::public.app_role)) then
    return;
  end if;
  select s.seated_fee_minor into fee from public.restaurant_money_settings s where s.id;
  return query
  with seated as (
    select s.business_id,
           date_trunc('month', s.outcome_at at time zone 'Africa/Lagos')::date as month,
           count(*)::integer as tables,
           coalesce(sum(s.seated_guests), 0)::integer as guests
      from public.reservation_seatings s
     where s.outcome = 'SEATED'
       and s.business_id is not null
       and (s.disputed_at is null or s.dispute_resolved_at is not null)
       and s.outcome_at >= date_trunc('month', now() at time zone 'Africa/Lagos') - make_interval(months => greatest(p_months, 1) - 1)
     group by 1, 2
  ), bills as (
    select b.business_id,
           date_trunc('month', b.paid_at at time zone 'Africa/Lagos')::date as month,
           count(*)::integer as paid,
           coalesce(sum(b.commission_minor), 0)::bigint as commission
      from public.restaurant_bills b
     where b.status = 'paid' and b.business_id is not null
     group by 1, 2
  )
  select coalesce(se.business_id, bi.business_id),
         bz.name,
         coalesce(se.month, bi.month),
         coalesce(se.tables, 0),
         coalesce(se.guests, 0),
         coalesce(se.tables, 0)::bigint * coalesce(fee, 0),
         coalesce(bi.paid, 0),
         coalesce(bi.commission, 0)
    from seated se
    full join bills bi on bi.business_id = se.business_id and bi.month = se.month
    left join public.businesses bz on bz.id = coalesce(se.business_id, bi.business_id)
   order by 3 desc, 2;
end $$;
revoke all on function public.restaurant_seated_fees(integer) from public, anon;
grant execute on function public.restaurant_seated_fees(integer) to authenticated;
