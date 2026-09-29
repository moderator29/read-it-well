-- PAYMENTS AND EARNINGS HISTORY (29 September 2026).
--
-- A read-only history of money that has ALREADY MOVED, for three readers:
--
--   my_payments_*   what a renter or guest paid, and what came back to their card
--   my_earnings_*   what a lister was paid by Paystack's split, and any refund
--                   that reversed part of it
--   admin_money_*   the same, platform-wide, for the finance scope
--
-- Nothing here stores a figure. Every row and every total is read, at the
-- moment of asking, from the records the payment and refund paths already
-- write: public.transactions (with its split columns), public.bookings,
-- public.booking_refunds, public.rent_share_refunds and public.ledger_entries.
-- There is no balance, and Vallo holds no money: a lister's share settled to
-- their bank account in the same Paystack transaction the renter paid.
--
-- Definer functions rather than new table policies, so a lister sees their
-- share of a charge without being granted the payer's row, and a payer sees
-- their refund without the lister's.

-- The payer's side ---------------------------------------------------------------
create or replace function public.my_payments_history(p_limit integer default 50, p_before timestamptz default null)
returns table (entry_id uuid, kind text, occurred_at timestamptz, amount_minor bigint, status text,
               reference text, title text, booking_id uuid)
language sql
stable security definer
set search_path to ''
as $function$
  with me as (select (select auth.uid()) as id)
  select * from (
    select t.id, 'payment'::text, t.created_at, t.amount_minor, t.status::text, t.provider_ref,
           l.title, t.booking_id
      from public.transactions t
      join public.bookings b on b.id = t.booking_id
      left join public.listings l on l.id = b.listing_id
     where t.status in ('SUCCESSFUL', 'REFUNDED')
       and ((t.share_payer_id is null and b.guest_id = (select id from me)) or t.share_payer_id = (select id from me))
    union all
    select r.id, 'refund'::text, coalesce(r.processor_settled_at, r.processor_submitted_at, r.created_at),
           r.refund_minor, r.processor_status, r.processor_refund_id, l.title, r.booking_id
      from public.booking_refunds r
      join public.bookings b on b.id = r.booking_id
      left join public.listings l on l.id = b.listing_id
     where r.guest_id = (select id from me) and r.refund_minor > 0
    union all
    select s.id, 'refund'::text, coalesce(s.processor_settled_at, s.processor_submitted_at, s.created_at),
           s.amount_minor, s.processor_status, s.processor_refund_id, l.title, t.booking_id
      from public.rent_share_refunds s
      join public.transactions t on t.id = s.transaction_id
      join public.bookings b on b.id = t.booking_id
      left join public.listings l on l.id = b.listing_id
     where s.payer_id = (select id from me) and s.amount_minor > 0
  ) x (entry_id, kind, occurred_at, amount_minor, status, reference, title, booking_id)
  where (select id from me) is not null
    and (p_before is null or x.occurred_at < p_before)
  order by x.occurred_at desc, x.entry_id
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$function$;

create or replace function public.my_payments_summary()
returns jsonb
language sql
stable security definer
set search_path to ''
as $function$
  with me as (select (select auth.uid()) as id),
  paid as (
    select coalesce(sum(t.amount_minor), 0) as minor, count(*) as n
      from public.transactions t join public.bookings b on b.id = t.booking_id
     where t.status in ('SUCCESSFUL', 'REFUNDED')
       and ((t.share_payer_id is null and b.guest_id = (select id from me)) or t.share_payer_id = (select id from me))),
  back as (
    select coalesce(sum(m), 0) as minor from (
      select r.refund_minor as m from public.booking_refunds r
       where r.guest_id = (select id from me) and r.processor_status = 'processed'
      union all
      select s.amount_minor from public.rent_share_refunds s
       where s.payer_id = (select id from me) and s.processor_status = 'processed') z)
  select case when (select id from me) is null then jsonb_build_object('status', 'signed_out')
    else jsonb_build_object('status', 'ok', 'paid_minor', (select minor from paid), 'payments', (select n from paid),
                            'refunded_minor', (select minor from back)) end;
$function$;

-- The payee's side --------------------------------------------------------------
create or replace function public.my_earnings_history(p_limit integer default 50, p_before timestamptz default null)
returns table (entry_id uuid, kind text, occurred_at timestamptz, amount_minor bigint, gross_minor bigint,
               guarantee_minor bigint, commission_minor bigint, status text, reference text, title text, booking_id uuid)
language sql
stable security definer
set search_path to ''
as $function$
  with me as (select (select auth.uid()) as id),
  mine as (
    select t.* from public.transactions t
     where t.payee_user_id = (select id from me) and t.status in ('SUCCESSFUL', 'REFUNDED'))
  select * from (
    select t.id, 'earning'::text, t.created_at, coalesce(t.lister_share_minor, 0)::bigint, t.amount_minor,
           coalesce(t.guarantee_minor, 0)::bigint, coalesce(t.commission_minor, 0)::bigint, t.status::text,
           t.provider_ref, l.title, t.booking_id
      from mine t
      join public.bookings b on b.id = t.booking_id
      left join public.listings l on l.id = b.listing_id
    union all
    select e.id, 'reversal'::text, e.created_at, e.agent_share_minor::bigint, e.gross_minor::bigint,
           e.guarantee_reserve_minor::bigint, e.platform_fee_minor::bigint, 'refunded'::text, null::text,
           l.title, e.booking_id
      from public.ledger_entries e
      join public.bookings b on b.id = e.booking_id
      left join public.listings l on l.id = b.listing_id
     where e.gross_minor < 0
       and e.booking_id in (select m.booking_id from mine m)
  ) x (entry_id, kind, occurred_at, amount_minor, gross_minor, guarantee_minor, commission_minor, status,
       reference, title, booking_id)
  where (select id from me) is not null
    and (p_before is null or x.occurred_at < p_before)
  order by x.occurred_at desc, x.entry_id
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$function$;

create or replace function public.my_earnings_summary()
returns jsonb
language sql
stable security definer
set search_path to ''
as $function$
  with me as (select (select auth.uid()) as id),
  mine as (
    select t.* from public.transactions t
     where t.payee_user_id = (select id from me) and t.status in ('SUCCESSFUL', 'REFUNDED')),
  rev as (
    select coalesce(sum(e.agent_share_minor), 0) as minor from public.ledger_entries e
     where e.gross_minor < 0 and e.booking_id in (select m.booking_id from mine m))
  select case when (select id from me) is null then jsonb_build_object('status', 'signed_out')
    else jsonb_build_object('status', 'ok',
      'earned_minor', (select coalesce(sum(lister_share_minor), 0) from mine),
      'gross_minor', (select coalesce(sum(amount_minor), 0) from mine),
      'payments', (select count(*) from mine),
      'reversed_minor', -(select minor from rev),
      'net_minor', (select coalesce(sum(lister_share_minor), 0) from mine) + (select minor from rev)) end;
$function$;

-- Platform-wide, for the finance scope -------------------------------------------
create or replace function public.admin_money_history(
  p_limit integer default 100, p_before timestamptz default null,
  p_from timestamptz default null, p_to timestamptz default null)
returns table (entry_id uuid, kind text, occurred_at timestamptz, amount_minor bigint, lister_share_minor bigint,
               guarantee_minor bigint, commission_minor bigint, status text, reference text, title text,
               booking_id uuid, payer_name text, payee_name text)
language plpgsql
stable security definer
set search_path to ''
as $function$
begin
  if not private.staff_can((select auth.uid()), 'finance') then
    return;
  end if;
  return query
  select * from (
    select t.id, 'payment'::text, t.created_at, t.amount_minor, coalesce(t.lister_share_minor, 0)::bigint,
           coalesce(t.guarantee_minor, 0)::bigint, coalesce(t.commission_minor, 0)::bigint, t.status::text,
           t.provider_ref, l.title, t.booking_id,
           (select p.display_name from public.profiles p where p.id = coalesce(t.share_payer_id, b.guest_id)),
           (select p.display_name from public.profiles p where p.id = t.payee_user_id)
      from public.transactions t
      join public.bookings b on b.id = t.booking_id
      left join public.listings l on l.id = b.listing_id
     where t.status in ('SUCCESSFUL', 'REFUNDED')
    union all
    select r.id, 'refund'::text, coalesce(r.processor_settled_at, r.processor_submitted_at, r.created_at),
           r.refund_minor, null::bigint, null::bigint, null::bigint, r.processor_status, r.processor_refund_id,
           l.title, r.booking_id,
           (select p.display_name from public.profiles p where p.id = r.guest_id), null::text
      from public.booking_refunds r
      join public.bookings b on b.id = r.booking_id
      left join public.listings l on l.id = b.listing_id
     where r.refund_minor > 0
    union all
    select s.id, 'refund'::text, coalesce(s.processor_settled_at, s.processor_submitted_at, s.created_at),
           s.amount_minor, null::bigint, null::bigint, null::bigint, s.processor_status, s.processor_refund_id,
           l.title, t.booking_id,
           (select p.display_name from public.profiles p where p.id = s.payer_id), null::text
      from public.rent_share_refunds s
      join public.transactions t on t.id = s.transaction_id
      join public.bookings b on b.id = t.booking_id
      left join public.listings l on l.id = b.listing_id
     where s.amount_minor > 0
  ) x
  where (p_before is null or x.created_at < p_before)
    and (p_from is null or x.created_at >= p_from)
    and (p_to is null or x.created_at < p_to)
  order by x.created_at desc, x.id
  limit least(greatest(coalesce(p_limit, 100), 1), 5000);
end;
$function$;

create or replace function public.admin_money_summary(p_from timestamptz default null, p_to timestamptz default null)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  out jsonb;
begin
  if not private.staff_can((select auth.uid()), 'finance') then
    return jsonb_build_object('status', 'forbidden');
  end if;
  select jsonb_build_object('status', 'ok',
    'gross_minor', coalesce(sum(t.amount_minor), 0),
    'lister_minor', coalesce(sum(t.lister_share_minor), 0),
    'guarantee_minor', coalesce(sum(t.guarantee_minor), 0),
    'commission_minor', coalesce(sum(t.commission_minor), 0),
    'payments', count(*),
    'refunded_minor', (select coalesce(sum(r.refund_minor), 0) from public.booking_refunds r
                        where r.processor_status = 'processed'
                          and (p_from is null or r.created_at >= p_from) and (p_to is null or r.created_at < p_to))
                    + (select coalesce(sum(s.amount_minor), 0) from public.rent_share_refunds s
                        where s.processor_status = 'processed'
                          and (p_from is null or s.created_at >= p_from) and (p_to is null or s.created_at < p_to)))
    into out
    from public.transactions t
   where t.status in ('SUCCESSFUL', 'REFUNDED')
     and (p_from is null or t.created_at >= p_from) and (p_to is null or t.created_at < p_to);
  return out;
end;
$function$;

revoke all on function public.my_payments_history(integer, timestamptz) from public, anon;
revoke all on function public.my_payments_summary() from public, anon;
revoke all on function public.my_earnings_history(integer, timestamptz) from public, anon;
revoke all on function public.my_earnings_summary() from public, anon;
revoke all on function public.admin_money_history(integer, timestamptz, timestamptz, timestamptz) from public, anon;
revoke all on function public.admin_money_summary(timestamptz, timestamptz) from public, anon;
grant execute on function public.my_payments_history(integer, timestamptz) to authenticated;
grant execute on function public.my_payments_summary() to authenticated;
grant execute on function public.my_earnings_history(integer, timestamptz) to authenticated;
grant execute on function public.my_earnings_summary() to authenticated;
grant execute on function public.admin_money_history(integer, timestamptz, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_money_summary(timestamptz, timestamptz) to authenticated;

do $$
begin
  if public.my_payments_summary() ->> 'status' <> 'signed_out' then raise exception 'payments summary must refuse no caller'; end if;
  if public.my_earnings_summary() ->> 'status' <> 'signed_out' then raise exception 'earnings summary must refuse no caller'; end if;
  if public.admin_money_summary() ->> 'status' <> 'forbidden' then raise exception 'admin summary must refuse no caller'; end if;
  if exists (select 1 from public.admin_money_history()) then raise exception 'admin history must refuse no caller'; end if;
end $$;

notify pgrst, 'reload schema';
