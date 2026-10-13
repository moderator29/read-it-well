-- Applied 13 October 2026, part of the restaurant seating migration (founder decision D).
-- Review notes: dependencies and grants were checked against the live database before applying.
set lock_timeout = '5s';

-- Service role only: called once Paystack has confirmed the charge.
create or replace function public.restaurant_bill_settle(p_reference text, p_amount_minor bigint, p_currency text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  b public.restaurant_bills%rowtype;
  r public.reservations%rowtype;
  s public.reservation_seatings%rowtype;
  venue text;
begin
  select * into b from public.restaurant_bills where provider_ref = p_reference for update;
  if b.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if b.status = 'paid' then
    return jsonb_build_object('outcome', 'duplicate');
  end if;
  if p_amount_minor is distinct from b.amount_minor or p_currency is distinct from b.currency then
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'A restaurant bill was paid with the wrong amount',
            format('Reference %s took %s kobo for a bill of %s kobo (reservation %s). Check and refund by hand.',
                   p_reference, p_amount_minor, b.amount_minor, b.reservation_id),
            'reservation', b.reservation_id::text);
    return jsonb_build_object('outcome', 'mismatch');
  end if;
  update public.restaurant_bills set status = 'paid', paid_at = now(), updated_at = now() where id = b.id;
  if coalesce(b.commission_minor, 0) > 0 then
    perform private.ledger_append(
      'vallo_revenue', 'restaurant_bill:' || b.id::text, 'FEE_CHARGED', 'in', b.commission_minor, b.currency,
      'paystack', p_reference, null, 'direct', 'confirmed',
      jsonb_build_object('kind', 'restaurant_bill', 'bill_id', b.id, 'reservation_id', b.reservation_id,
                         'commission_bps', b.commission_bps, 'gross_minor', b.amount_minor),
      null, b.guest_id);
  end if;
  select * into r from public.reservations where id = b.reservation_id;
  select * into s from public.reservation_seatings where reservation_id = b.reservation_id;
  if s.outcome is distinct from 'SEATED' then
    perform private.settle_seating(b.reservation_id, 'SEATED', 'bill');
  end if;
  select bz.name into venue from public.businesses bz where bz.id = b.business_id;
  begin
    perform private.notify(b.guest_id, 'booking'::public.notification_kind, 'Bill paid',
      'Your bill at ' || coalesce(venue, 'the restaurant') || ' is paid. Thank you.', '/bookings?side=stays');
    if b.payee_user_id is not null then
      perform private.notify(b.payee_user_id, 'booking'::public.notification_kind, 'A bill was paid through Vallo',
        'A table''s bill was paid and goes to your bank account.', '/host/reservations');
    end if;
  exception when others then
    null;
  end;
  return jsonb_build_object('outcome', 'settled');
end $$;
revoke all on function public.restaurant_bill_settle(text, bigint, text) from public, anon, authenticated;
grant execute on function public.restaurant_bill_settle(text, bigint, text) to service_role;

-- ============================================================ 8. what is owed
-- Staff only: per restaurant per Lagos month, the seated tables and guests,
-- the fee owed at the current fee per seated guest, and the bills paid
-- through Vallo with the commission they carried. A seating under an open
-- dispute is left out until it is decided.
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
         coalesce(se.guests, 0)::bigint * coalesce(fee, 0),
         coalesce(bi.paid, 0),
         coalesce(bi.commission, 0)
    from seated se
    full join bills bi on bi.business_id = se.business_id and bi.month = se.month
    left join public.businesses bz on bz.id = coalesce(se.business_id, bi.business_id)
   order by 3 desc, 2;
end $$;
revoke all on function public.restaurant_seated_fees(integer) from public, anon;
grant execute on function public.restaurant_seated_fees(integer) to authenticated;

-- The hourly job was scheduled separately (cron job vallo_ask_diners_unmarked_tables, minute 17 of every hour):
-- select cron.schedule('vallo_ask_diners_unmarked_tables', '17 * * * *', 'select private.ask_diners_about_unmarked_tables();');
