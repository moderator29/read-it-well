-- Applied 13 October 2026. FINAL MONEY 1 of 2 (track/final-money, 13 Oct 2026).
-- Needs d75a_restaurant_deposits, restaurant_seating_d/e/f and
-- rd01_restaurant_deposit_notices (all live).
--
-- THE RULING. Founder, 13 October 2026: a no-show that is overturned means
-- the deposit goes back.
--
-- WHAT HAPPENED BEFORE. The restaurant taps No-show (or the diner says they
-- did not dine), the reservation moves to NO_SHOW, and
-- `private.reservation_deposit_outcome` moves a paid deposit to `forfeited`
-- with outcome_reason 'no_show'. When the diner disputes it and Vallo decides
-- they were seated (`public.reservation_resolve_seating(.., 'SEATED')`, the
-- seating disputes on /admin/restaurant-fees), or the restaurant corrects its
-- own tap, `private.settle_seating` moves the reservation NO_SHOW -> COMPLETED.
-- The outcome trigger only looked for a `paid` deposit, so the forfeited one
-- stayed kept by the venue for a guest Vallo had just found was there.
--
-- WHAT THIS CHANGES, WITHOUT A NEW MONEY FLOW:
--  1. `private.reservation_deposit_outcome` (create or replace, the live body
--     plus one branch): on NO_SHOW -> COMPLETED, a deposit that is
--     `forfeited` for 'no_show' moves to `refund_due` with outcome_reason
--     'no_show_overturned', decided_at now, and one audit row
--     `reservation.deposit_refund_due` naming the reason and who decided it.
--     Idempotent: it only ever moves a row that is still forfeited for a
--     no-show, so a second resolve, a replay or the restaurant's own repeat
--     tap changes nothing. A deposit kept for a late cancellation is never
--     touched.
--  2. The existing hourly job (lib/cron/jobs/reservation-deposit-refunds.ts,
--     `sendDueDepositRefunds`) sends every `refund_due` deposit back to the
--     card through `refundChargeToCard`, one claim per charge, then records
--     it with `public.reservation_deposit_refunded`. The deposit was split at
--     the charge (the venue's share to its subaccount, Vallo's commission to
--     Vallo); a refund of it is the same whole-charge Paystack refund that a
--     venue cancellation already sends, so nothing new moves money here.
--  3. `private.notify_reservation_deposit` (rd01, create or replace): the
--     existing "Deposit coming back" / "Deposit going back" notices, told
--     once each through private.notify_once, now say WHY when the reason is
--     an overturned no-show; and the guest's "Deposit kept" notice for a
--     no-show says an overturned no-show is refunded.
--
-- Additive only: two functions by create or replace. No DROP, no DELETE.
-- Probe: supabase/tests/probes/fm01-no-show-overturned-refunds-deposit.sql
set lock_timeout = '5s';

create or replace function private.reservation_deposit_outcome()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  d public.reservation_deposits%rowtype;
  next_status text;
  why text;
begin
  if new.status is not distinct from old.status or new.status not in ('CANCELLED', 'NO_SHOW', 'COMPLETED') then
    return new;
  end if;
  -- An overturned no-show: the deposit kept for it goes back to the card.
  if old.status = 'NO_SHOW' and new.status = 'COMPLETED' then
    select * into d from public.reservation_deposits
     where reservation_id = new.id and status = 'forfeited' and outcome_reason = 'no_show'
     for update;
    if d.id is not null then
      update public.reservation_deposits
         set status = 'refund_due', decided_at = now(), outcome_reason = 'no_show_overturned'
       where id = d.id;
      insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
      values ((select auth.uid()), 'reservation.deposit_refund_due', 'reservation', new.id::text,
              jsonb_build_object('reference', d.provider_ref, 'amount_minor', d.amount_minor,
                                 'reason', 'no_show_overturned', 'from', 'forfeited',
                                 'seating_by', nullif(current_setting('vallo.seating_by', true), '')));
    end if;
    d := null;
  end if;
  update public.reservation_deposits set status = 'abandoned', decided_at = now(), outcome_reason = 'reservation_ended'
   where reservation_id = new.id and status = 'pending';
  select * into d from public.reservation_deposits where reservation_id = new.id and status = 'paid' for update;
  if d.id is null then
    return new;
  end if;
  if new.status = 'COMPLETED' then
    next_status := 'applied'; why := 'deducted_from_bill';
  elsif new.status = 'NO_SHOW' then
    next_status := 'forfeited'; why := 'no_show';
  elsif (select auth.uid()) = new.guest_id then
    if now() <= d.refund_until then
      next_status := 'refund_due'; why := 'guest_cancelled_in_time';
    else
      next_status := 'forfeited'; why := 'guest_cancelled_late';
    end if;
  else
    next_status := 'refund_due'; why := 'venue_cancelled';
  end if;
  update public.reservation_deposits set status = next_status, decided_at = now(), outcome_reason = why where id = d.id;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), 'reservation.deposit_' || next_status, 'reservation', new.id::text,
          jsonb_build_object('reference', d.provider_ref, 'amount_minor', d.amount_minor, 'reason', why));
  return new;
end $$;
revoke all on function private.reservation_deposit_outcome() from public, anon, authenticated;

create or replace function private.notify_reservation_deposit()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  r public.reservations%rowtype;
  venue text;
  amount text;
  at_local text;
  key_base text;
  guest_title text;
  guest_body text;
  venue_title text;
  venue_body text;
  guest_href text;
begin
  if new.status is not distinct from old.status
     or new.status not in ('refund_due', 'refunded', 'forfeited') then
    return new;
  end if;

  begin
    select * into r from public.reservations where id = new.reservation_id;
    select b.name into venue from public.businesses b where b.id = r.business_id;
    venue := coalesce(venue, 'The restaurant');
    amount := 'NGN ' || to_char(new.amount_minor::numeric / 100, 'FM999,999,999,990.00');
    at_local := coalesce(to_char(r.reserved_for at time zone 'Africa/Lagos', 'FMDay DD FMMon, HH24:MI'), 'your table');
    key_base := 'table_deposit:' || new.id::text || ':' || new.status;
    guest_href := '/pay/deposit/' || new.reservation_id::text;

    if new.status = 'refund_due' then
      guest_title := 'Deposit coming back';
      venue_title := 'Deposit going back';
      if new.outcome_reason = 'no_show_overturned' then
        guest_body := venue || ': the no-show on your table for ' || at_local || ' was overturned, so your '
                      || amount || ' deposit is going back to the card you paid with.';
        venue_body := 'The no-show on the table for ' || at_local || ' was overturned and the guest is recorded as seated, so the '
                      || amount || ' deposit goes back to the guest''s card.';
      else
        guest_body := venue || ': your ' || amount || ' deposit for ' || at_local
                      || ' is going back to the card you paid with.';
        venue_body := 'The ' || amount || ' deposit for the table on ' || at_local
                      || ' goes back to the guest''s card under your cancellation rule.';
      end if;
    elsif new.status = 'refunded' then
      guest_title := 'Deposit refunded';
      guest_body := venue || ': ' || amount || ' is on its way back to your card. Your bank may take a few working days to show it.';
      venue_title := 'Deposit refunded';
      venue_body := 'The ' || amount || ' deposit for the table on ' || at_local || ' went back to the guest''s card.';
    else
      guest_title := 'Deposit kept';
      guest_body := case new.outcome_reason
        when 'no_show' then
          venue || ' recorded that nobody came for the table on ' || at_local
          || ', so it keeps your ' || amount || ' deposit under its rule. If you were there, reply in the thread.'
          || ' If the no-show is overturned, the deposit goes back to your card.'
        else
          'You cancelled after ' || venue || '''s free cancellation time, so it keeps your '
          || amount || ' deposit under its rule.'
      end;
      venue_title := 'Deposit kept by you';
      venue_body := case new.outcome_reason
        when 'no_show' then 'Nobody came for the table on ' || at_local || ', so the ' || amount || ' deposit is yours.'
        else 'The guest cancelled the table on ' || at_local || ' after your free cancellation time, so the '
             || amount || ' deposit is yours.'
      end;
    end if;

    perform private.notify_once(key_base || ':guest', new.guest_id, 'booking'::public.notification_kind,
                                guest_title, guest_body, guest_href);
    perform private.notify_once(key_base || ':venue', new.payee_user_id, 'booking'::public.notification_kind,
                                venue_title, venue_body, '/host/reservations');
  exception when others then
    perform private.notice_failed('table deposit notice (' || new.status || ')', 'reservation',
                                  new.reservation_id::text, sqlstate, sqlerrm);
  end;
  return new;
end;
$fn$;

revoke all on function private.notify_reservation_deposit() from public, anon, authenticated, service_role;
