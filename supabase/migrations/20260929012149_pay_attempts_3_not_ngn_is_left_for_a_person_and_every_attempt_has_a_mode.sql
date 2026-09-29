-- PAYSTACK agent, 29 September 2026. Payment attempts, part 3: audit fixes.
--
-- 1. A charge Paystack reports as successful but NOT in naira is never settled
--    automatically (the app records processor_status = 'not_ngn' on the
--    attempt and raises one alert for a person). The attempt sweep stops
--    asking about it every hour: payment_attempts_due_for_check skips it.
-- 2. payment_attempts_due_for_check also returns each attempt's paystack_mode,
--    so the app can refuse to settle an attempt made on the other mode even if
--    the filter above it were ever loosened. Its return shape changes, so it is
--    dropped and recreated with the same grants.
-- 3. Backfill: every attempt written before paystack_mode existed was opened
--    on the only key there was, the live one. They are marked 'live', so no
--    reader has to remember that NULL means live. (Zero rows on live today;
--    the statement is for any environment restored from older data.) There is
--    no column default: private.settle_booking_charge's unknown-charge insert
--    cannot know the mode, and a default would guess.

update public.transactions set paystack_mode = 'live' where paystack_mode is null and provider = 'paystack';

drop function if exists public.payment_attempts_due_for_check(text, integer);

create function public.payment_attempts_due_for_check(p_mode text, p_limit integer default 25)
returns table (id uuid, provider_ref text, booking_id uuid, created_at timestamptz,
               checkout_opened_at timestamptz, processor_status text, paystack_mode text)
language sql
stable
security definer
set search_path to ''
as $function$
  select t.id, t.provider_ref, t.booking_id, t.created_at, t.checkout_opened_at, t.processor_status,
         coalesce(t.paystack_mode, 'live')
    from public.transactions t
   where t.status = 'PENDING'
     and t.provider = 'paystack'
     and t.provider_ref like 'rm-book-%'
     and coalesce(t.paystack_mode, 'live') = p_mode
     and coalesce(t.processor_status, '') <> 'not_ngn'
     and coalesce(t.checkout_opened_at, t.created_at) < now() - interval '45 minutes'
     and (t.processor_checked_at is null or t.processor_checked_at < now() - interval '10 minutes')
   order by t.processor_checked_at nulls first, t.created_at
   limit greatest(1, least(coalesce(p_limit, 25), 100));
$function$;

revoke all on function public.payment_attempts_due_for_check(text, integer) from public, anon, authenticated;
grant execute on function public.payment_attempts_due_for_check(text, integer) to service_role;

-- READ-BACK.
do $$
begin
  if exists (select 1 from public.transactions where paystack_mode is null and provider = 'paystack') then
    raise exception 'read-back: a paystack attempt still has no mode';
  end if;
  if position('not_ngn' in pg_get_functiondef('public.payment_attempts_due_for_check(text,integer)'::regprocedure)) = 0 then
    raise exception 'read-back: the due list does not skip not_ngn';
  end if;
  if has_function_privilege('anon', 'public.payment_attempts_due_for_check(text,integer)', 'execute')
     or has_function_privilege('authenticated', 'public.payment_attempts_due_for_check(text,integer)', 'execute') then
    raise exception 'read-back: payment_attempts_due_for_check is callable by an app role';
  end if;
  if not has_function_privilege('service_role', 'public.payment_attempts_due_for_check(text,integer)', 'execute') then
    raise exception 'read-back: payment_attempts_due_for_check is not callable by service_role';
  end if;
end $$;
