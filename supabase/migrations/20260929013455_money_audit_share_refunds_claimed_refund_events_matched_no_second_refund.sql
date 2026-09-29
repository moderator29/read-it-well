-- MONEY AUDIT FIXES (29 September 2026): A SHARE REFUND IS SENT ONCE, A
-- PAYSTACK REFUND EVENT CLOSES ONLY ITS OWN REFUND, AND A REFUND-DUE CHARGE
-- IS NEVER REFUNDED TWICE.
--
-- 1. rent_share_refunds is CLAIMED before it is sent to Paystack.
--    `claim_rent_share_refund` moves one row pending (or failed, under three
--    attempts) to `sending`, stamps `claimed_at`, counts the attempt, and
--    returns it; only the caller that got the row back calls Paystack. An
--    answer that never came back is recorded as `unknown`, which nothing
--    re-sends by itself: a person checks Paystack first. `sending` and
--    `unknown` are on the operator's refund clock as share_unsent.
--    `rent_share_refunds_due` returns pending rows and failed rows under the
--    cap. `record_rent_share_refund` writes only from `sending` (or from
--    `unknown`, when a person resolves it).
-- 2. `record_processor_refund_outcome` now takes the event's amount and
--    matches a refund by its processor id; the transaction-reference
--    fallback matches only a row with no processor id of its own when the
--    event carried one. An id that matches nothing answers not_found. The
--    amount must equal the row's, or it answers amount_mismatch and raises
--    an alert. The three-argument version is dropped.
-- 3. processed / failed are accepted from every state before them (pending,
--    sending, unknown, submitted), with processor_submitted_at =
--    coalesce(processor_submitted_at, now()), so a confirmation that arrives
--    before the submission is recorded is not lost. The forward-only guards
--    on both tables allow exactly these steps.
-- 4. `settle_booking_charge` on a replay after refund-due answers
--    already-settled (transaction_status 'REFUND_DUE') instead of refunding
--    again: the refund-due audit row for that reference is the record.
-- 5. The `settled` answer carries total_minor (the move-in total for a rent
--    charge, the gross otherwise).
--
-- Nothing here holds money or touches retired custody. Grants: the new and
-- changed doors are service_role only; admin_refund_clock stays as it was
-- (authenticated, deciding on the caller's own role).

/* ------------------------------------------------------------ 1. share refunds: claim, cap, unknown */
alter table public.rent_share_refunds
  add column if not exists claimed_at timestamptz,
  add column if not exists attempts integer not null default 0;
alter table public.rent_share_refunds drop constraint if exists rent_share_refunds_attempts_check;
alter table public.rent_share_refunds add constraint rent_share_refunds_attempts_check check (attempts between 0 and 10);
alter table public.rent_share_refunds drop constraint if exists rent_share_refunds_processor_status_check;
alter table public.rent_share_refunds add constraint rent_share_refunds_processor_status_check
  check (processor_status in ('pending', 'sending', 'unknown', 'submitted', 'processed', 'failed'));
drop index if exists public.rent_share_refunds_processor_idx;
create index if not exists rent_share_refunds_processor_idx on public.rent_share_refunds (processor_status, created_at)
  where processor_status in ('pending', 'sending', 'unknown', 'submitted', 'failed');

create or replace function private.rent_share_refunds_forward_only()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
declare
  processor_cols constant text[] := array['processor_status', 'processor_refund_id',
                                          'processor_submitted_at', 'processor_settled_at',
                                          'claimed_at', 'attempts'];
begin
  if tg_op = 'DELETE' then
    raise exception 'public.rent_share_refunds is append-only' using errcode = '42501';
  end if;
  if (to_jsonb(new) - processor_cols) = (to_jsonb(old) - processor_cols)
     and (
       -- the claim: one attempt more, stamped
       (old.processor_status in ('pending', 'failed') and new.processor_status = 'sending'
          and new.attempts = old.attempts + 1 and new.claimed_at is not null)
       -- what the sender heard back
       or (old.processor_status in ('sending', 'unknown') and new.processor_status in ('submitted', 'failed', 'unknown')
          and new.processor_status <> old.processor_status)
       -- Paystack's own word, whenever it arrives
       or (old.processor_status in ('pending', 'sending', 'unknown', 'submitted') and new.processor_status in ('processed', 'failed')))
     and (new.processor_status = 'sending' or (new.attempts = old.attempts and new.claimed_at is not distinct from old.claimed_at))
     and (old.processor_submitted_at is null or new.processor_submitted_at = old.processor_submitted_at)
     and (old.processor_settled_at is null or new.processor_settled_at = old.processor_settled_at) then
    return new;
  end if;
  raise exception 'public.rent_share_refunds is append-only' using errcode = '42501';
end;
$function$;

create or replace function public.claim_rent_share_refund(p_refund uuid)
returns table (refund_id uuid, reference text, amount_minor bigint, attempts integer)
language sql
security definer
set search_path to ''
as $function$
  with claimed as (
    update public.rent_share_refunds r
       set processor_status = 'sending', claimed_at = now(), attempts = r.attempts + 1
     where r.id = p_refund
       and (r.processor_status = 'pending' or (r.processor_status = 'failed' and r.attempts < 3))
    returning r.id, r.transaction_id, r.amount_minor, r.attempts)
  select c.id, t.provider_ref, c.amount_minor, c.attempts
    from claimed c join public.transactions t on t.id = c.transaction_id;
$function$;
comment on function public.claim_rent_share_refund(uuid) is
  'V-86 audit fix. Claims one share refund for sending to Paystack: pending, or failed under three attempts, becomes sending. Only a caller that gets the row back may call Paystack, so a share is never sent twice.';

create or replace function public.rent_share_refunds_due(p_limit integer default 25)
returns table (refund_id uuid, reference text, amount_minor bigint, processor_status text)
language sql
stable
security definer
set search_path to ''
as $function$
  select r.id, t.provider_ref, r.amount_minor, r.processor_status
    from public.rent_share_refunds r join public.transactions t on t.id = r.transaction_id
   where r.processor_status = 'pending' or (r.processor_status = 'failed' and r.attempts < 3)
   order by r.created_at
   limit greatest(1, least(coalesce(p_limit, 25), 100));
$function$;

create or replace function public.record_rent_share_refund(p_refund uuid, p_status text, p_processor_id text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if p_status not in ('submitted', 'failed', 'unknown') then
    return jsonb_build_object('status', 'bad_status');
  end if;
  update public.rent_share_refunds
     set processor_status = p_status,
         processor_refund_id = coalesce(nullif(btrim(p_processor_id), ''), processor_refund_id),
         processor_submitted_at = case when p_status = 'submitted' then coalesce(processor_submitted_at, now())
                                       else processor_submitted_at end
   where id = p_refund and processor_status in ('sending', 'unknown') and processor_status <> p_status;
  if not found then
    return jsonb_build_object('status', 'not_claimed');
  end if;
  if p_status = 'unknown' then
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('critical', 'open', 'A move-in share refund may or may not have reached Paystack',
            format('Share refund %s: Paystack did not answer. Check the Paystack dashboard before anything is retried; it is never re-sent automatically.', p_refund),
            'rent_share_refund', p_refund::text);
  end if;
  return jsonb_build_object('status', 'ok');
end;
$function$;

/* ------------------------------------------------------------ 3. booking refunds: early confirmation */
create or replace function private.booking_refunds_is_append_only()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public'
as $function$
declare
  processor_cols constant text[] := array['processor_status', 'processor_refund_id',
                                          'processor_submitted_at', 'processor_settled_at'];
begin
  if tg_op = 'UPDATE'
     and old.decided_by is not null
     and new.decided_by is null
     and (to_jsonb(new) - 'decided_by') = (to_jsonb(old) - 'decided_by') then
    return new;
  end if;
  -- V-24: the processor's answer is written forward, once per step, and
  -- nothing else on the row moves. Paystack's final word may arrive before
  -- the submission was recorded, so processed/failed follow pending too.
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - processor_cols) = (to_jsonb(old) - processor_cols)
     and ((old.processor_status = 'pending' and new.processor_status in ('submitted', 'failed', 'processed'))
          or (old.processor_status = 'failed' and new.processor_status = 'submitted')
          or (old.processor_status = 'submitted' and new.processor_status in ('processed', 'failed')))
     and (old.processor_submitted_at is null or new.processor_submitted_at = old.processor_submitted_at)
     and (old.processor_settled_at is null or new.processor_settled_at = old.processor_settled_at) then
    return new;
  end if;
  raise exception 'public.booking_refunds is append-only' using errcode = '42501';
end;
$function$;

/* ------------------------------------------------------------ 2 and 3. the refund event closes only its own refund */
drop function if exists public.record_processor_refund_outcome(text, text, text);
create or replace function public.record_processor_refund_outcome(
  p_processor_refund_id text, p_transaction_reference text, p_status text, p_amount_minor bigint)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r   public.booking_refunds%rowtype;
  s   public.rent_share_refunds%rowtype;
  pid text := nullif(btrim(p_processor_refund_id), '');
  ref text := nullif(btrim(p_transaction_reference), '');
begin
  if p_status not in ('processed', 'failed') then
    return jsonb_build_object('status', 'bad_status');
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    return jsonb_build_object('status', 'amount_missing');
  end if;

  -- A flatmate's share refund: by its processor id, else by the charge's
  -- reference but only a row that has no processor id of its own when the
  -- event named one.
  if pid is not null then
    select * into s from public.rent_share_refunds where processor_refund_id = pid for update;
  end if;
  if s.id is null and ref is not null then
    select sr.* into s from public.rent_share_refunds sr join public.transactions t on t.id = sr.transaction_id
     where t.provider_ref = ref and (pid is null or sr.processor_refund_id is null)
     for update of sr;
  end if;
  if s.id is not null then
    if s.processor_status = p_status then
      return jsonb_build_object('status', 'already', 'share_refund_id', s.id);
    end if;
    if s.amount_minor <> p_amount_minor then
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('high', 'open', 'A Paystack refund event did not match the share refund''s amount',
              format('Share refund %s is %s kobo; the event said %s kobo (%s). Nothing was recorded.', s.id, s.amount_minor, p_amount_minor, p_status),
              'rent_share_refund', s.id::text);
      return jsonb_build_object('status', 'amount_mismatch', 'share_refund_id', s.id);
    end if;
    if s.processor_status not in ('pending', 'sending', 'unknown', 'submitted') then
      return jsonb_build_object('status', 'not_submitted', 'share_refund_id', s.id, 'processor_status', s.processor_status);
    end if;
    update public.rent_share_refunds
       set processor_status = p_status,
           processor_refund_id = coalesce(processor_refund_id, pid),
           processor_submitted_at = coalesce(processor_submitted_at, now()),
           processor_settled_at = case when p_status = 'processed' then now() else processor_settled_at end
     where id = s.id;
    if p_status = 'failed' then
      insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
      values ('high', 'open', 'Paystack could not complete a move-in share refund',
              format('Share refund %s (%s kobo) failed at the processor. Contact the flatmate and retry.', s.id, s.amount_minor),
              'rent_share_refund', s.id::text);
    end if;
    return jsonb_build_object('status', 'ok', 'share_refund_id', s.id);
  end if;

  -- A booking refund, by the same rules.
  if pid is not null then
    select * into r from public.booking_refunds where processor_refund_id = pid
     order by created_at desc limit 1 for update;
  end if;
  if r.id is null and ref is not null then
    select br.* into r from public.booking_refunds br
      join public.transactions t on t.booking_id = br.booking_id and t.provider_ref = ref
     where br.processor_status in ('pending', 'submitted')
       and br.refund_minor = p_amount_minor
       and (pid is null or br.processor_refund_id is null)
     order by br.created_at desc limit 1 for update of br;
  end if;
  if r.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if r.processor_status = p_status then
    return jsonb_build_object('status', 'already', 'refund_id', r.id);
  end if;
  if r.refund_minor <> p_amount_minor then
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'A Paystack refund event did not match the refund''s amount',
            format('Refund %s is %s kobo; the event said %s kobo (%s). Nothing was recorded.', r.id, r.refund_minor, p_amount_minor, p_status),
            'booking_refund', r.id::text);
    return jsonb_build_object('status', 'amount_mismatch', 'refund_id', r.id);
  end if;
  if r.processor_status not in ('pending', 'submitted') then
    return jsonb_build_object('status', 'not_submitted', 'refund_id', r.id, 'processor_status', r.processor_status);
  end if;
  update public.booking_refunds
     set processor_status = p_status,
         processor_refund_id = coalesce(processor_refund_id, pid),
         processor_submitted_at = coalesce(processor_submitted_at, now()),
         processor_settled_at = case when p_status = 'processed' then now() else processor_settled_at end
   where id = r.id;
  if p_status = 'failed' then
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'Paystack could not complete a refund to the card',
            format('Refund %s on booking %s (%s kobo) failed at the processor. Contact the guest and retry.',
                   r.id, r.booking_id, r.refund_minor),
            'booking_refund', r.id::text);
  end if;
  return jsonb_build_object('status', 'ok', 'refund_id', r.id, 'booking_id', r.booking_id);
end;
$function$;

/* ------------------------------------------------------------ the clock sees sending and unknown */
create or replace function public.admin_refund_clock()
returns table (kind text, subject_id uuid, booking_id uuid, amount_minor bigint, due_by timestamptz)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
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

/* ------------------------------------------------------------ 4 and 5. settlement: no second refund, total on settled */
create or replace function private.settle_booking_charge(p_reference text, p_amount_minor bigint, p_processor_fee_minor bigint DEFAULT NULL::bigint, p_fallback_booking uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  tx          public.transactions%rowtype;
  bk          public.bookings%rowtype;
  ag          public.deal_agreements%rowtype;
  rp          public.rent_payments%rowtype;
  gross       bigint;
  fee         bigint;
  reason      text;
  was_pending boolean;
  is_rent     boolean;
  is_share    boolean;
  paid_before bigint;
  lagos_today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if p_reference is null or length(btrim(p_reference)) = 0 then
    return jsonb_build_object('outcome', 'bad_request');
  end if;
  select * into tx from public.transactions where provider_ref = p_reference;
  if tx.id is null then
    if p_fallback_booking is null
       or not exists (select 1 from public.bookings where id = p_fallback_booking) then
      return jsonb_build_object('outcome', 'unknown-reference');
    end if;
    perform set_config('vallo.recording_unknown_charge', 'on', true);
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status)
    values (p_fallback_booking, 'paystack', p_reference, greatest(0, coalesce(p_amount_minor, 0)), 'NGN', 'PENDING')
    on conflict (provider_ref) do nothing;
    perform set_config('vallo.recording_unknown_charge', '', true);
    select * into tx from public.transactions where provider_ref = p_reference;
    if tx.id is null then
      return jsonb_build_object('outcome', 'unknown-reference');
    end if;
  end if;
  select * into bk from public.bookings where id = tx.booking_id for update;
  select * into tx from public.transactions where id = tx.id for update;
  if tx.status in ('SUCCESSFUL', 'REFUNDED') then
    return jsonb_build_object('outcome', 'already-settled', 'booking_id', bk.id, 'transaction_status', tx.status);
  end if;
  -- Audit fix: a charge already found refund-due is not refunded again on a
  -- replay (webhook, return page, sweep). The refund-due audit row is the record.
  if tx.status = 'FAILED' and exists (
       select 1 from public.audit_log a
        where a.action = 'booking.charge_refund_due' and a.entity_type = 'booking'
          and a.entity_id = bk.id::text and a.metadata ->> 'reference' = p_reference) then
    return jsonb_build_object('outcome', 'already-settled', 'booking_id', bk.id, 'transaction_status', 'REFUND_DUE');
  end if;
  select * into ag from public.deal_agreements where id = tx.agreement_id for update;
  is_rent := exists (select 1 from public.rent_payments r where r.booking_id = bk.id);
  if is_rent then
    perform 1 from public.listings where id = bk.listing_id for update;
    select * into rp from public.rent_payments where booking_id = bk.id;
  end if;
  is_share := tx.share_payer_id is not null;
  select coalesce(sum(t.amount_minor), 0) into paid_before
    from public.transactions t where t.booking_id = bk.id and t.status = 'SUCCESSFUL' and t.id <> tx.id;
  gross := case when coalesce(p_amount_minor, 0) > 0 then p_amount_minor else tx.amount_minor end;
  reason := case
    when tx.lister_share_minor is null or ag.id is null then 'no_split'
    when ag.status <> 'approved' then 'agreement_' || ag.status::text
    when bk.status not in ('PENDING', 'CONFIRMED') then 'booking_' || lower(bk.status::text)
    when not is_share and exists (select 1 from public.transactions t
                                   where t.booking_id = bk.id and t.status = 'SUCCESSFUL' and t.id <> tx.id) then 'already_paid'
    when is_share and rp.id is null then 'no_split'
    when is_share and exists (select 1 from public.transactions t
                               where t.booking_id = bk.id and t.status = 'SUCCESSFUL' and t.id <> tx.id
                                 and (t.share_payer_id is null or t.share_payer_id = tx.share_payer_id)) then 'already_paid'
    when is_share and paid_before + tx.amount_minor > rp.total_minor then 'over_total'
    when is_rent and private.listing_is_let(bk.listing_id, bk.id) then 'already_let'
    when bk.status = 'PENDING' and bk.check_in < lagos_today then 'check_in_passed'
    when gross <> tx.amount_minor then 'amount_mismatch'
    else null
  end;
  if reason is not null then
    update public.transactions set status = 'FAILED', updated_at = now() where id = tx.id;
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open', 'A card payment could not be applied and must be refunded to the card',
            format('Reference %s took %s kobo for booking %s (status %s) and could not be applied (%s). '
                   || 'Refund the full amount to the card through Paystack.',
                   p_reference, gross, bk.id, bk.status, reason),
            'booking', bk.id::text);
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (null, 'booking.charge_refund_due', 'booking', bk.id::text,
            jsonb_build_object('reference', p_reference, 'amount_minor', gross, 'reason', reason,
                               'share_payer_id', tx.share_payer_id));
    return jsonb_build_object('outcome', 'refund-due', 'booking_id', bk.id, 'reason', reason,
                              'amount_minor', gross, 'reference', p_reference);
  end if;
  update public.transactions set status = 'SUCCESSFUL', updated_at = now() where id = tx.id;
  fee := least(tx.lister_share_minor, greatest(0, coalesce(p_processor_fee_minor, 0)));
  insert into public.ledger_entries
    (booking_id, transaction_id, gross_minor, platform_fee_minor, agent_share_minor,
     processor_fee_minor, guarantee_reserve_minor, net_settlement_minor)
  values (bk.id, tx.id, gross, tx.commission_minor, tx.lister_share_minor - fee, fee, tx.guarantee_minor,
          tx.lister_share_minor - fee)
  on conflict (transaction_id) where transaction_id is not null do nothing;
  if tx.guarantee_minor > 0 then
    insert into public.guarantee_reserve_entries (direction, kind, amount_minor, booking_id, transaction_id, note)
    values ('in', 'contribution', tx.guarantee_minor, bk.id, tx.id, 'Guarantee contribution settled with the charge')
    on conflict (transaction_id) do nothing;
  end if;
  -- V-86: a share that leaves the move-in short. It settled to the lister;
  -- the charge, the agreement and the booking wait for the rest.
  if is_share and paid_before + gross < rp.total_minor then
    begin
      perform private.notify(rp.tenant_id, 'booking'::public.notification_kind, 'A share of the move-in was paid',
        'Your tenancy file shows every share and what is still to pay.', '/tenancy/' || rp.id::text);
    exception when others then
      null;
    end;
    return jsonb_build_object(
      'outcome', 'share-settled', 'booking_id', bk.id, 'amount_minor', gross,
      'paid_minor', paid_before + gross, 'total_minor', rp.total_minor, 'share_payer_id', tx.share_payer_id,
      'ledger', jsonb_build_object(
        'grossMinor', gross, 'platformFeeMinor', tx.commission_minor, 'agentShareMinor', tx.lister_share_minor - fee,
        'processorFeeMinor', fee, 'guaranteeMinor', tx.guarantee_minor, 'netSettlementMinor', tx.lister_share_minor - fee));
  end if;
  update public.deal_agreements set status = 'paid', paid_at = now(), updated_at = now() where id = ag.id
  returning * into ag;
  perform private.agreement_log(ag, null, 'paid', 'approved',
    case when is_share then 'Paid in shares. The last share completed the move-in; each share settled to the lister and the Guarantee as it was paid.'
         else 'Paid. The lister''s share and the Guarantee settled with the charge.' end);
  was_pending := bk.status = 'PENDING';
  if was_pending then
    update public.bookings set status = 'CONFIRMED' where id = bk.id and status = 'PENDING';
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (bk.id, 'PENDING', 'CONFIRMED', 'Payment received, so the booking is confirmed.');
    insert into public.availability (listing_id, date, status)
    select bk.listing_id, d::date, 'booked'
      from generate_series(bk.check_in::timestamp, (bk.check_out - 1)::timestamp, interval '1 day') as d
    on conflict (listing_id, date) do update set status = 'booked';
  else
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (bk.id, 'CONFIRMED', 'CONFIRMED', 'Payment received. The host had already accepted this stay.');
  end if;
  return jsonb_build_object(
    'outcome', 'settled', 'booking_id', bk.id, 'confirmed', was_pending, 'amount_minor', gross,
    'total_minor', coalesce(rp.total_minor, gross),
    'ledger', jsonb_build_object(
      'grossMinor', gross, 'platformFeeMinor', tx.commission_minor, 'agentShareMinor', tx.lister_share_minor - fee,
      'processorFeeMinor', fee, 'guaranteeMinor', tx.guarantee_minor, 'netSettlementMinor', tx.lister_share_minor - fee));
end;
$function$;

/* ------------------------------------------------------------ grants */
revoke all on function public.claim_rent_share_refund(uuid) from public, anon, authenticated;
revoke all on function public.rent_share_refunds_due(integer) from public, anon, authenticated;
revoke all on function public.record_rent_share_refund(uuid, text, text) from public, anon, authenticated;
revoke all on function public.record_processor_refund_outcome(text, text, text, bigint) from public, anon, authenticated;
grant execute on function public.claim_rent_share_refund(uuid) to service_role;
grant execute on function public.rent_share_refunds_due(integer) to service_role;
grant execute on function public.record_rent_share_refund(uuid, text, text) to service_role;
grant execute on function public.record_processor_refund_outcome(text, text, text, bigint) to service_role;

/* ------------------------------------------------------------ read-back */
do $$
declare
  def text;
begin
  if to_regprocedure('public.record_processor_refund_outcome(text,text,text)') is not null then
    raise exception 'the three-argument refund outcome door still exists';
  end if;
  if has_function_privilege('authenticated', 'public.claim_rent_share_refund(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.record_processor_refund_outcome(text,text,text,bigint)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.record_rent_share_refund(uuid,text,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.claim_rent_share_refund(uuid)', 'EXECUTE') then
    raise exception 'refund doors are granted wrongly';
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'rent_share_refunds' and column_name = 'claimed_at')
     or not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'rent_share_refunds' and column_name = 'attempts') then
    raise exception 'rent_share_refunds claim columns missing';
  end if;
  def := pg_get_functiondef('private.settle_booking_charge(text,bigint,bigint,uuid)'::regprocedure);
  if position('REFUND_DUE' in def) = 0 or position('''total_minor'', coalesce(rp.total_minor, gross)' in def) = 0 then
    raise exception 'settle_booking_charge was not replaced';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.rent_share_refunds'::regclass) then
    raise exception 'rent_share_refunds lost RLS';
  end if;
end;
$$;
