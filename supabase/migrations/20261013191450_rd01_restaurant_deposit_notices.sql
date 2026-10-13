-- Applied 13 October 2026. RESTAURANT DEPOSITS 1 of 1 (track/restaurant-deposits, 13 Oct 2026).
-- Apply BEFORE the founder switches feature_flags.restaurant_deposits on.
--
-- THE RULING. Founder, 13 October 2026: table deposits ON. Booking a table
-- stays free unless the restaurant sets a deposit for that time and party.
--
-- WHAT 20261013084935_restaurant_deposits_off CHANGED, READ ON LIVE. One
-- statement: `update public.feature_flags set enabled = false, note = ...
-- where key = 'restaurant_deposits'`. No function, trigger, policy, grant or
-- copy was touched, and every d75a function on live still hashes to what d75a
-- applied (`private.restaurant_deposits_on` reads the flag, fails closed on a
-- missing row). So nothing in the schema blocks deposits except the switch
-- itself, which is the founder's to flip and is NOT written here (no
-- feature_flags statement in this file, not even the note).
--
-- WHAT WAS MISSING: TWO OF THE THREE NOTICES. `reservation_deposit_settle`
-- already tells the guest "Deposit paid" and the venue "Deposit received"
-- (private.notify, which honours the Bookings switch). Nobody was told when
-- a deposit was refunded or kept: the restaurant's rule decides inside
-- `private.reservation_deposit_outcome` (guest cancelled in time, venue
-- cancelled or declined, no-show, late cancellation), a charge that cannot
-- be applied goes refund_due inside the settle, and the refund itself lands
-- through `reservation_deposit_refunded`. A guest whose money moved heard
-- nothing.
--
-- WHAT THIS ADDS, WITHOUT TOUCHING ANY PAYMENT FUNCTION: one AFTER UPDATE OF
-- status trigger on public.reservation_deposits, the nt02 pattern. Whatever
-- moved the row, the move is told once to each side:
--
--   refund_due   guest "Deposit coming back"       venue "Deposit going back"
--   refunded     guest "Deposit refunded"          venue "Deposit refunded"
--   forfeited    guest "Deposit kept"              venue "Deposit kept by you"
--
-- Each through private.notify_once (nt01, applied), keyed on the deposit id,
-- the state and the audience, so a replayed webhook, the hourly sweep and the
-- payer's return can never tell anybody twice; notify_once calls the existing
-- private.notify, which honours the person's Bookings switch. The trigger
-- catches its own errors (it runs in the transaction that moves the money and
-- may never be the reason it fails) and reports a swallowed one through
-- private.notice_failed (nt01): a log warning and one open medium risk alert.
-- Words follow lib/money/copy.ts: nothing says Vallo holds money (the venue
-- was paid at the charge through its own subaccount), no provider is named.
--
-- Additive only: one new function, one new trigger. No DROP, no DELETE.
-- Probe: supabase/tests/probes-pending/rd01-restaurant-deposit-notices.sql
-- Rollback: supabase/migrations/pending/rollback/rd01_restaurant_deposit_notices.sql
set lock_timeout = '5s';

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
      guest_body := venue || ': your ' || amount || ' deposit for ' || at_local
                    || ' is going back to the card you paid with.';
      venue_title := 'Deposit going back';
      venue_body := 'The ' || amount || ' deposit for the table on ' || at_local
                    || ' goes back to the guest''s card under your cancellation rule.';
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

create or replace trigger reservation_deposits_zz_notify
  after update of status on public.reservation_deposits
  for each row execute function private.notify_reservation_deposit();
