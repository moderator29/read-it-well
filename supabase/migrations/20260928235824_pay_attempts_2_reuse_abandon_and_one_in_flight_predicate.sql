-- PAYSTACK agent, 28 September 2026. Payment attempts, part 2 of 2.
--
-- THE AUDIT. A payer who cancels or abandons the Paystack window leaves the
-- attempt PENDING. That blocked cancelling the agreement for two hours
-- (payment_in_flight in agreement_cancel_as and in expire_booking_holds), and
-- every retry opened another pending attempt.
--
-- WHAT THIS ADDS.
--  1. Columns on public.transactions that let an attempt be REUSED and CLOSED
--     honestly:
--       access_code, authorization_url  Paystack's handle for the checkout this
--                                       attempt opened. Not a key: the hosted
--                                       URL is checkout.paystack.com/<code>
--                                       and the browser is already handed it.
--                                       Readable only by who could read the
--                                       row before (the guest and admins);
--                                       RLS and grants are unchanged.
--       checkout_opened_at              the last time the payer was handed it
--                                       (a retry that reuses it moves this).
--       paystack_mode                   'live' or 'test': which key opened it,
--                                       so a sweep running on one key never
--                                       judges an attempt made on the other.
--       processor_status,               what Paystack last said on verify,
--       processor_checked_at            and when.
--       closed_reason                   why an attempt left PENDING without
--                                       money: payer_closed, sweep_abandoned,
--                                       sweep_not_found, processor_failed.
--  2. private.payment_attempt_in_flight(...): the ONE predicate for "a payment
--     is genuinely in flight". PENDING, and either opened within the last 45
--     minutes, or Paystack itself said on a check in the last two hours that
--     it is still moving (ongoing, pending, processing, queued), within a
--     24-hour ceiling.
--     WHY 45 MINUTES. The longest ordinary way to finish a Paystack checkout is
--     Pay with Transfer, whose one-time account number lives for 30 minutes;
--     card OTP and 3-D Secure challenges expire well inside that. Fifteen
--     minutes on top covers a bank's late transfer notification. Anything
--     slower is still counted, because the processor says so on the sweep's
--     check rather than because the clock guesses.
--  3. agreement_cancel_as and expire_booking_holds ask that predicate instead
--     of "PENDING and younger than two hours".
--  4. public.payment_attempts_due_for_check(mode, limit), service_role only:
--     the stale PENDING attempts the attempt sweep verifies with Paystack.
--
-- MONEY SAFETY. Nothing here moves money or touches settlement.
-- private.settle_booking_charge still settles any attempt that is not
-- SUCCESSFUL or REFUNDED (so an ABANDONED attempt that is paid after all is
-- settled or refunded through the one path, under its row lock), and
-- transactions_one_success_per_booking still forbids two successes.

alter table public.transactions
  add column if not exists access_code text,
  add column if not exists authorization_url text,
  add column if not exists checkout_opened_at timestamptz,
  add column if not exists paystack_mode text,
  add column if not exists processor_status text,
  add column if not exists processor_checked_at timestamptz,
  add column if not exists closed_reason text;

alter table public.transactions
  drop constraint if exists transactions_paystack_mode_check,
  add constraint transactions_paystack_mode_check
    check (paystack_mode is null or paystack_mode in ('live', 'test')),
  drop constraint if exists transactions_closed_reason_check,
  add constraint transactions_closed_reason_check
    check (closed_reason is null
           or closed_reason in ('payer_closed', 'sweep_abandoned', 'sweep_not_found', 'processor_failed')),
  drop constraint if exists transactions_access_code_shape,
  add constraint transactions_access_code_shape
    check (access_code is null or (length(access_code) between 1 and 200 and access_code !~ '\s')),
  drop constraint if exists transactions_authorization_url_shape,
  add constraint transactions_authorization_url_shape
    check (authorization_url is null
           or (length(authorization_url) <= 500 and authorization_url like 'https://%'));

-- The sweep's read: PENDING attempts, oldest check first.
create index if not exists transactions_pending_check_idx
  on public.transactions (processor_checked_at nulls first, created_at)
  where status = 'PENDING';

-- 2. THE predicate.
create or replace function private.payment_attempt_in_flight(
  p_status public.transaction_status,
  p_created_at timestamptz,
  p_opened_at timestamptz,
  p_processor_status text,
  p_checked_at timestamptz
) returns boolean
language sql
stable
set search_path to ''
as $function$
  select p_status = 'PENDING'::public.transaction_status
     and (
       coalesce(p_opened_at, p_created_at) > now() - interval '45 minutes'
       or (lower(coalesce(p_processor_status, '')) in ('ongoing', 'pending', 'processing', 'queued')
           and p_checked_at > now() - interval '2 hours'
           and p_created_at > now() - interval '24 hours')
     );
$function$;

create or replace function private.agreement_payment_in_flight(p_agreement uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.transactions t
     where t.agreement_id = p_agreement
       and t.status = 'PENDING'
       and private.payment_attempt_in_flight(t.status, t.created_at, t.checkout_opened_at,
                                             t.processor_status, t.processor_checked_at));
$function$;

create or replace function private.booking_payment_in_flight(p_booking uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.transactions t
     where t.booking_id = p_booking
       and t.status = 'PENDING'
       and private.payment_attempt_in_flight(t.status, t.created_at, t.checkout_opened_at,
                                             t.processor_status, t.processor_checked_at));
$function$;

revoke all on function private.payment_attempt_in_flight(public.transaction_status, timestamptz, timestamptz, text, timestamptz)
  from public, anon, authenticated;
revoke all on function private.agreement_payment_in_flight(uuid) from public, anon, authenticated;
revoke all on function private.booking_payment_in_flight(uuid) from public, anon, authenticated;

-- 3a. The agreement cancellation guard. Unchanged except the predicate.
create or replace function public.agreement_cancel_as(p_actor uuid, p_agreement uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  ag public.deal_agreements%rowtype;
  before_status public.agreement_status;
begin
  select * into ag from public.deal_agreements where id = p_agreement for update;
  if ag.id is null or p_actor not in (ag.renter_id, ag.owner_id) then
    return jsonb_build_object('status', 'not_found');
  end if;
  if ag.status in ('paid', 'cancelled') then
    return jsonb_build_object('status', 'locked', 'agreement_status', ag.status);
  end if;
  if private.agreement_payment_in_flight(ag.id) then
    return jsonb_build_object('status', 'payment_in_flight');
  end if;
  before_status := ag.status;
  update public.deal_agreements set status = 'cancelled', updated_at = now() where id = ag.id returning * into ag;
  perform private.agreement_log(ag, p_actor, 'cancelled', before_status, nullif(btrim(coalesce(p_note, '')), ''));
  return jsonb_build_object('status', 'ok');
end;
$function$;

-- 3b. The hold sweep spares a booking only while a payment is genuinely in
-- flight. Unchanged except the two predicates.
create or replace function private.expire_booking_holds(p_ttl interval DEFAULT '48:00:00'::interval, p_limit integer DEFAULT 500)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  b             record;
  released      uuid[] := '{}';
  paid_pending  uuid[] := '{}';
  paying        uuid[] := '{}';
  unpaid        uuid[] := '{}';
  waiting       uuid[] := '{}';
  ttl_hours     integer;
  lagos_today   date := (now() at time zone 'Africa/Lagos')::date;
begin
  if p_ttl is null or p_ttl < interval '1 hour' then
    raise exception 'A hold lives for at least one hour before it can expire.' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'A sweep releases between 1 and 5000 holds per run.' using errcode = '22023';
  end if;
  ttl_hours := floor(extract(epoch from p_ttl) / 3600)::integer;
  for b in
    select bk.id, bk.listing_id, bk.check_in, bk.check_out, bk.created_at
      from public.bookings bk
     where bk.status = 'PENDING'
       and bk.created_at < now() - p_ttl
     order by bk.created_at
     limit p_limit
       for update of bk skip locked
  loop
    if exists (select 1 from public.transactions t where t.booking_id = b.id and t.status = 'SUCCESSFUL') then
      paid_pending := paid_pending || b.id;
      continue;
    end if;
    if b.created_at > now() - (p_ttl + interval '2 hours') and private.booking_payment_in_flight(b.id) then
      paying := paying || b.id;
      continue;
    end if;
    update public.bookings set status = 'CANCELLED' where id = b.id and status = 'PENDING';
    if not found then
      continue;
    end if;
    released := released || b.id;
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (b.id, 'PENDING', 'CANCELLED',
            format('Auto-released: the request was not confirmed within %s hours.', ttl_hours));
    update public.deal_agreements set status = 'cancelled', updated_at = now()
     where booking_id = b.id and status not in ('paid', 'cancelled');
    delete from public.availability av
     where av.listing_id = b.listing_id and av.status = 'booked'
       and av.date >= b.check_in and av.date < b.check_out;
  end loop;

  for b in
    select bk.id, bk.listing_id, bk.check_in, bk.check_out,
           coalesce((select max(e.created_at) from public.booking_state_events e
                      where e.booking_id = bk.id and e.to_status = 'CONFIRMED'), bk.updated_at) as accepted_at,
           ag.status as agreement_status, ag.decided_at as approved_at
      from public.bookings bk
      left join public.deal_agreements ag on ag.booking_id = bk.id
     where bk.status = 'CONFIRMED'
       and not exists (select 1 from public.transactions t where t.booking_id = bk.id and t.status = 'SUCCESSFUL')
       and not exists (select 1 from public.rent_payments rp where rp.booking_id = bk.id)
     order by bk.check_in
     limit p_limit
       for update of bk skip locked
  loop
    if b.agreement_status in ('awaiting_parties', 'in_review', 'rejected') then
      if b.accepted_at > now() - interval '72 hours' and b.check_in > lagos_today then
        waiting := waiting || b.id;
        continue;
      end if;
    elsif b.agreement_status = 'approved' then
      if not (b.approved_at < now() - interval '24 hours'
              or (b.check_in <= lagos_today and b.approved_at < now() - interval '2 hours')) then
        continue;
      end if;
    elsif not (b.accepted_at < now() - interval '24 hours'
               or (b.check_in <= lagos_today and b.accepted_at < now() - interval '2 hours')) then
      continue;
    end if;
    if private.booking_payment_in_flight(b.id) then
      paying := paying || b.id;
      continue;
    end if;
    update public.bookings set status = 'CANCELLED' where id = b.id and status = 'CONFIRMED';
    if not found then
      continue;
    end if;
    unpaid := unpaid || b.id;
    released := released || b.id;
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (b.id, 'CONFIRMED', 'CANCELLED',
            'Auto-released: the stay was accepted but not paid for in time.');
    update public.deal_agreements set status = 'cancelled', updated_at = now()
     where booking_id = b.id and status not in ('paid', 'cancelled');
    delete from public.availability av
     where av.listing_id = b.listing_id and av.status = 'booked'
       and av.date >= b.check_in and av.date < b.check_out;
  end loop;

  return jsonb_build_object('released', to_jsonb(released), 'paid_pending', to_jsonb(paid_pending),
                            'payment_in_flight', to_jsonb(paying), 'accepted_unpaid', to_jsonb(unpaid),
                            'agreement_pending', to_jsonb(waiting), 'ttl_hours', ttl_hours);
end;
$function$;

-- 4. What the attempt sweep verifies: booking-charge attempts still PENDING
-- that are no longer in flight by the clock (older than 45 minutes since they
-- were last opened), on this key's mode (a row with no mode predates this
-- migration and was opened live), least recently checked first. An attempt
-- checked in the last ten minutes is left alone so one slow attempt cannot
-- take every run.
create or replace function public.payment_attempts_due_for_check(p_mode text, p_limit integer default 25)
returns table (id uuid, provider_ref text, booking_id uuid, created_at timestamptz,
               checkout_opened_at timestamptz, processor_status text)
language sql
stable
security definer
set search_path to ''
as $function$
  select t.id, t.provider_ref, t.booking_id, t.created_at, t.checkout_opened_at, t.processor_status
    from public.transactions t
   where t.status = 'PENDING'
     and t.provider = 'paystack'
     and t.provider_ref like 'rm-book-%'
     and coalesce(t.paystack_mode, 'live') = p_mode
     and coalesce(t.checkout_opened_at, t.created_at) < now() - interval '45 minutes'
     and (t.processor_checked_at is null or t.processor_checked_at < now() - interval '10 minutes')
   order by t.processor_checked_at nulls first, t.created_at
   limit greatest(1, least(coalesce(p_limit, 25), 100));
$function$;

revoke all on function public.payment_attempts_due_for_check(text, integer) from public, anon, authenticated;
grant execute on function public.payment_attempts_due_for_check(text, integer) to service_role;

-- READ-BACK. Refuses the migration if any of it did not land as written.
do $$
declare
  missing text;
begin
  select string_agg(c, ', ') into missing
    from unnest(array['access_code', 'authorization_url', 'checkout_opened_at', 'paystack_mode',
                      'processor_status', 'processor_checked_at', 'closed_reason']) c
   where not exists (select 1 from information_schema.columns
                      where table_schema = 'public' and table_name = 'transactions' and column_name = c);
  if missing is not null then
    raise exception 'read-back: transactions is missing %', missing;
  end if;
  if position('private.agreement_payment_in_flight' in pg_get_functiondef('public.agreement_cancel_as(uuid,uuid,text)'::regprocedure)) = 0 then
    raise exception 'read-back: agreement_cancel_as does not ask the in-flight predicate';
  end if;
  if position('interval ''2 hours''' in pg_get_functiondef('public.agreement_cancel_as(uuid,uuid,text)'::regprocedure)) > 0 then
    raise exception 'read-back: agreement_cancel_as still carries the two-hour guess';
  end if;
  if (select count(*) from regexp_matches(pg_get_functiondef('private.expire_booking_holds(interval,integer)'::regprocedure),
                                          'private\.booking_payment_in_flight', 'g')) <> 2 then
    raise exception 'read-back: expire_booking_holds does not ask the in-flight predicate twice';
  end if;
  if position('t.status = ''PENDING'' and t.created_at' in pg_get_functiondef('private.expire_booking_holds(interval,integer)'::regprocedure)) > 0 then
    raise exception 'read-back: expire_booking_holds still carries the two-hour guess';
  end if;
  if has_function_privilege('anon', 'public.payment_attempts_due_for_check(text,integer)', 'execute')
     or has_function_privilege('authenticated', 'public.payment_attempts_due_for_check(text,integer)', 'execute') then
    raise exception 'read-back: payment_attempts_due_for_check is callable by an app role';
  end if;
  if not has_function_privilege('service_role', 'public.payment_attempts_due_for_check(text,integer)', 'execute') then
    raise exception 'read-back: payment_attempts_due_for_check is not callable by service_role';
  end if;
  if has_function_privilege('anon', 'private.agreement_payment_in_flight(uuid)', 'execute')
     or has_function_privilege('authenticated', 'private.agreement_payment_in_flight(uuid)', 'execute')
     or has_function_privilege('authenticated', 'private.booking_payment_in_flight(uuid)', 'execute')
     or has_function_privilege('authenticated', 'private.payment_attempt_in_flight(public.transaction_status,timestamptz,timestamptz,text,timestamptz)', 'execute') then
    raise exception 'read-back: an in-flight predicate is callable by an app role';
  end if;
  -- The predicate itself, on literal rows.
  if not private.payment_attempt_in_flight('PENDING', now() - interval '10 minutes', null, null, null) then
    raise exception 'read-back: a ten-minute-old PENDING attempt must be in flight';
  end if;
  if private.payment_attempt_in_flight('PENDING', now() - interval '50 minutes', null, 'abandoned', now()) then
    raise exception 'read-back: a fifty-minute-old abandoned attempt must not be in flight';
  end if;
  if not private.payment_attempt_in_flight('PENDING', now() - interval '3 hours', null, 'ongoing', now() - interval '5 minutes') then
    raise exception 'read-back: an attempt Paystack says is ongoing must be in flight';
  end if;
  if private.payment_attempt_in_flight('ABANDONED', now(), now(), null, null) then
    raise exception 'read-back: an ABANDONED attempt must never be in flight';
  end if;
  if not private.payment_attempt_in_flight('PENDING', now() - interval '90 minutes', now() - interval '5 minutes', null, null) then
    raise exception 'read-back: an attempt reopened five minutes ago must be in flight';
  end if;
end $$;
