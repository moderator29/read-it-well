-- MONEY RE-AUDIT FIXES: STUCK SHARE REFUNDS ARE SURFACED, AND THE REFUND
-- CLOCK RUNS WITH AN EMPTY SEARCH PATH.
--
-- 1. public.rent_share_refunds_stuck() (service_role only): the flatmate
--    share refunds a person must look at, because nothing automatic will move
--    them again: claimed (`sending`) more than 15 minutes ago and never
--    answered (the sender died between the claim and the record, or the card
--    refund claim could not be taken), or `failed` three times. The hourly
--    `rent-share-refunds` job raises a critical alert while any are returned.
-- 2. public.admin_refund_clock(): the same body, now `set search_path to ''`
--    (every name in it was already schema-qualified). Grant unchanged:
--    authenticated, deciding on the caller's own admin role.
--
-- Nothing here holds money or touches retired custody. No table is created.

create or replace function public.rent_share_refunds_stuck()
returns table (refund_id uuid, rent_payment_id uuid, amount_minor bigint, processor_status text,
               attempts integer, claimed_at timestamptz)
language sql
stable
security definer
set search_path to ''
as $function$
  select r.id, r.rent_payment_id, r.amount_minor, r.processor_status, r.attempts, r.claimed_at
    from public.rent_share_refunds r
   where (r.processor_status = 'sending' and r.claimed_at < now() - interval '15 minutes')
      or (r.processor_status = 'failed' and r.attempts >= 3)
   order by r.created_at
   limit 100;
$function$;
comment on function public.rent_share_refunds_stuck() is
  'V-86 re-audit fix. Share refunds nothing automatic will move again: sending for over 15 minutes, or failed three times. The hourly rent-share-refunds job alerts on any.';
revoke all on function public.rent_share_refunds_stuck() from public, anon, authenticated;
grant execute on function public.rent_share_refunds_stuck() to service_role;

create or replace function public.admin_refund_clock()
returns table (kind text, subject_id uuid, booking_id uuid, amount_minor bigint, due_by timestamptz)
language sql
stable
security definer
set search_path to ''
as $function$
  select * from (
    select 'request'::text, q.id, q.booking_id,
           coalesce((select sum(t.amount_minor) from public.transactions t
                      where t.booking_id = q.booking_id and t.status = 'SUCCESSFUL'), 0)::bigint,
           coalesce(q.due_by, private.business_days_after(q.requested_at, private.refund_ask_days()))
      from public.refund_requests q
     where private.refund_request_initiated_at(q.id) is null
       and not exists (select 1 from public.refund_request_decisions d where d.request_id = q.id)
    union all
    select 'unsent'::text, r.id, r.booking_id, r.refund_minor,
           private.business_days_after(r.created_at, private.refund_send_days())
      from public.booking_refunds r
     where r.processor_status in ('pending', 'failed') and r.refund_minor > 0
    union all
    select 'processor'::text, r.id, r.booking_id, r.refund_minor,
           private.business_days_after(r.processor_submitted_at, private.refund_processor_days())
      from public.booking_refunds r
     where r.processor_status = 'submitted'
    union all
    select 'share_unsent'::text, s.id, rp.booking_id, s.amount_minor,
           private.business_days_after(s.created_at, private.refund_send_days())
      from public.rent_share_refunds s join public.rent_payments rp on rp.id = s.rent_payment_id
     where s.processor_status in ('pending', 'sending', 'unknown', 'failed')
    union all
    select 'share_processor'::text, s.id, rp.booking_id, s.amount_minor,
           private.business_days_after(s.processor_submitted_at, private.refund_processor_days())
      from public.rent_share_refunds s join public.rent_payments rp on rp.id = s.rent_payment_id
     where s.processor_status = 'submitted'
    union all
    select 'rent_owed'::text, o.booking_id, o.booking_id, o.amount_minor,
           private.business_days_after(o.created_at, private.refund_ask_days())
      from public.rent_refunds_owed o
     where o.cleared_at is null
  ) clock (kind, subject_id, booking_id, amount_minor, due_by)
  where (private.has_role((select auth.uid()), 'admin'::public.app_role)
         or private.has_role((select auth.uid()), 'super_admin'::public.app_role))
    and clock.due_by < now() + interval '24 hours'
  order by clock.due_by asc
  limit 500;
$function$;
revoke all on function public.admin_refund_clock() from public, anon;
grant execute on function public.admin_refund_clock() to authenticated;

do $$
begin
  if has_function_privilege('authenticated', 'public.rent_share_refunds_stuck()', 'EXECUTE')
     or has_function_privilege('anon', 'public.rent_share_refunds_stuck()', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.rent_share_refunds_stuck()', 'EXECUTE') then
    raise exception 'rent_share_refunds_stuck is granted wrongly';
  end if;
  if not exists (select 1 from pg_proc where oid = 'public.admin_refund_clock()'::regprocedure
                  and proconfig @> array['search_path=""']) then
    raise exception 'admin_refund_clock does not run with an empty search path';
  end if;
  if has_function_privilege('anon', 'public.admin_refund_clock()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.admin_refund_clock()', 'EXECUTE') then
    raise exception 'admin_refund_clock is granted wrongly';
  end if;
end;
$$;
