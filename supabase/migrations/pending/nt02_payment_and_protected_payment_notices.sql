-- DRAFT, not applied. NOTIFICATIONS 2 of 6. Needs nt01. Apply BEFORE the app
-- of track/notifications is deployed: the two new email templates
-- (payment.host_received, payment.rent_receipt) are written here and built
-- there; a row the running code does not know is discarded by the drain for good.
--
-- GAP: when a stay is paid, nobody who matters was told in the app. The booking
-- notifier fires on a STATUS change, and a stay the host had already accepted
-- (or an instant booking) is CONFIRMED before the card is charged, so the
-- payment moves no status and settle_booking_charge notified nobody. The guest
-- got an email; the host, whose share it is, got nothing, for a shortlet or a
-- hotel room alike. The same for protected (partner-held) payments: no
-- notification anywhere when one is funded, released, refunded, split or
-- disputed.
--
-- WHAT THIS ADDS, WITHOUT TOUCHING ANY PAYMENT FUNCTION:
--   1. A trigger on public.transactions (the moment a charge becomes
--      SUCCESSFUL). The host is told "Payment received" with their share. The
--      guest is told only when the booking was ALREADY confirmed (otherwise the
--      existing "Booking confirmed" row follows in the same transaction and a
--      second row would be noise). A rent (tenancy) charge keeps its own words
--      ("Rent paid", "Rent received", share notices); it gets the payer an
--      email receipt and nothing more here. The host also gets an email
--      (payment.host_received): money reached them, and they may be away from
--      the app.
--   2. A trigger on public.provider_arrangements for the six states a member
--      needs to hear about (protected, release_requested, released, refunded,
--      split, disputed), to the renter and the lister in their own words.
--
-- Every notice goes through private.notify_once (nt01), so a replayed webhook,
-- a sweep and a return page cannot tell anybody twice. Both triggers swallow
-- their own errors: they run inside the transaction that moves money and may
-- never be the reason it fails. A swallowed error is reported through
-- private.notice_failed (nt01): a log warning with the message and one open
-- medium risk alert for the booking or agreement, so a lost notice is seen. Words follow lib/money/copy.ts: "protected
-- payment" for members, nothing says Vallo holds money, no provider is named.
--
-- Additive only, nothing is removed: new functions and two new triggers.
-- Probe: supabase/tests/probes-pending/nt02-payment-and-protected-payment-notices.sql
set lock_timeout = '5s';

/* ---- 1. A stay is paid ------------------------------------------------- */

create or replace function private.deliver_payment_received(
  p_tx uuid,
  p_booking uuid,
  p_guest uuid,
  p_host uuid,
  p_place text,
  p_check_in date,
  p_check_out date,
  p_paid_minor bigint,
  p_share_minor bigint,
  p_rail text,
  p_booking_confirmed boolean,
  p_via_agent boolean
)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  paid text := 'NGN ' || to_char(p_paid_minor::numeric / 100, 'FM999,999,999,990.00');
  share text;
  share_line text := '';
  host_href text := case when p_via_agent then '/agent/bookings' else '/host/bookings' end;
begin
  if p_share_minor is not null and p_share_minor > 0 then
    share := 'NGN ' || to_char(p_share_minor::numeric / 100, 'FM999,999,999,990.00');
    share_line := case
      when p_rail = 'protected'
        then ' Your share, ' || share || ', is held by Vallo''s licensed payment partner and released to you under the agreed terms.'
      else ' Your share, ' || share || ', goes straight to the bank account on your payout details.'
    end;
  end if;

  /* The guest: only when no status change is about to tell them. */
  if p_booking_confirmed then
    perform private.notify_once(
      'payment:' || p_tx::text || ':guest', p_guest, 'booking',
      'Payment received',
      p_place || ': ' || paid || ' is paid. Your booking is confirmed.',
      '/bookings/' || p_booking::text);
  end if;

  /* The host: always. */
  if private.notify_once(
       'payment:' || p_tx::text || ':host', p_host, 'booking',
       'Payment received',
       p_place || ' for ' || to_char(p_check_in, 'DD Mon') || ' to ' || to_char(p_check_out, 'DD Mon')
         || ' is paid.' || share_line,
       host_href) then
    perform private.email_outbox_enqueue(
      p_host, 'payment.host_received', 'payment:host:' || p_tx::text,
      jsonb_build_object(
        'transaction_id', p_tx, 'booking_id', p_booking, 'place', p_place,
        'check_in', p_check_in, 'check_out', p_check_out,
        'amount_minor', p_paid_minor, 'share_minor', p_share_minor,
        'rail', coalesce(p_rail, 'direct'),
        'side', case when p_via_agent then 'agent' else 'host' end));
  end if;
end;
$fn$;

create or replace function private.tell_payment_received(p_tx uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  t public.transactions%rowtype;
  bk public.bookings%rowtype;
  rp public.rent_payments%rowtype;
  place text;
begin
  select * into t from public.transactions where id = p_tx;
  if t.id is null or t.status::text <> 'SUCCESSFUL' then
    return;
  end if;
  select * into bk from public.bookings where id = t.booking_id;
  if bk.id is null then
    return;
  end if;

  place := coalesce(
    (select l.title from public.listings l where l.id = bk.listing_id),
    (select ac.name || coalesce(', ' || rt.name, '')
       from public.accommodations ac
       left join public.room_types rt on rt.id = bk.room_type_id
      where ac.id = bk.accommodation_id),
    'your booking');

  select * into rp from public.rent_payments r where r.booking_id = bk.id;
  if rp.id is not null then
    /* A tenancy charge: the in-app words are already written by
       notify_booking_change and settle_booking_charge. The payer gets a
       receipt by email, once per charge. */
    perform private.email_outbox_enqueue(
      coalesce(t.share_payer_id, bk.guest_id), 'payment.rent_receipt',
      'payment:rent:' || t.id::text,
      jsonb_build_object(
        'transaction_id', t.id, 'rent_payment_id', rp.id, 'place', place,
        'amount_minor', t.amount_minor, 'share', t.share_payer_id is not null));
    return;
  end if;

  perform private.deliver_payment_received(
    t.id, bk.id, bk.guest_id, private.booking_host(bk.id), place,
    bk.check_in, bk.check_out, t.amount_minor, t.lister_share_minor, t.rail,
    bk.status::text = 'CONFIRMED', bk.listing_id is not null);
end;
$fn$;

create or replace function private.notify_payment_received()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $fn$
begin
  begin
    if new.status::text = 'SUCCESSFUL'
       and (tg_op = 'INSERT' or old.status::text is distinct from 'SUCCESSFUL') then
      perform private.tell_payment_received(new.id);
    end if;
  exception when others then
    /* A notice may never be the reason a payment fails to record. The error is
       caught here and reported (a log warning and one open risk alert for the
       booking); reporting is itself caught, so nothing escapes this trigger. */
    declare
      v_state text := sqlstate;
      v_message text := sqlerrm;
    begin
      perform private.notice_failed('payment received notice', 'booking', new.booking_id::text, v_state, v_message);
    exception when others then
      raise warning '[notify] payment received notice failed: %', v_state;
    end;
  end;
  return new;
end;
$fn$;

create or replace trigger transactions_zz_notify_payment_received
  after insert or update of status on public.transactions
  for each row execute function private.notify_payment_received();

/* ---- 2. A protected payment moves -------------------------------------- */

create or replace function private.tell_arrangement(
  p_arrangement uuid,
  p_status text,
  p_buyer uuid,
  p_seller uuid,
  p_place text,
  p_amount_minor bigint,
  p_href text
)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  amt text := 'NGN ' || to_char(p_amount_minor::numeric / 100, 'FM999,999,999,990.00');
  key text := 'arrangement:' || p_arrangement::text || ':' || p_status;
begin
  if p_status = 'protected' then
    perform private.notify_once(key || ':buyer', p_buyer, 'booking', 'Your payment is protected',
      amt || ' for ' || p_place || ' is held by Vallo''s licensed payment partner until you confirm. Vallo does not hold it.', p_href);
    perform private.notify_once(key || ':seller', p_seller, 'booking', 'A protected payment is in',
      amt || ' for ' || p_place || ' is held by Vallo''s licensed payment partner. It is released to you when the renter confirms, or when the agreed release condition is met.', p_href);
  elsif p_status = 'release_requested' then
    perform private.notify_once(key || ':seller', p_seller, 'booking', 'The renter confirmed',
      p_place || ': the renter confirmed, so ' || amt || ' is being released to you.', p_href);
  elsif p_status = 'released' then
    perform private.notify_once(key || ':buyer', p_buyer, 'booking', 'Payment released',
      amt || ' for ' || p_place || ' was released to the owner or agent.', p_href);
    perform private.notify_once(key || ':seller', p_seller, 'booking', 'Payment released to you',
      amt || ' for ' || p_place || ' has been released to you.', p_href);
  elsif p_status = 'refunded' then
    perform private.notify_once(key || ':buyer', p_buyer, 'booking', 'Your payment is refunded',
      amt || ' for ' || p_place || ' is going back to you from the partner that holds it. Banks usually show it within 5 to 10 working days.', p_href);
    perform private.notify_once(key || ':seller', p_seller, 'booking', 'A payment went back to the renter',
      amt || ' for ' || p_place || ' was refunded to the renter. Open the agreement for the record.', p_href);
  elsif p_status = 'split' then
    perform private.notify_once(key || ':buyer', p_buyer, 'booking', 'Payment split',
      p_place || ': ' || amt || ' was split between the two of you as decided. Open the agreement to see the amounts.', p_href);
    perform private.notify_once(key || ':seller', p_seller, 'booking', 'Payment split',
      p_place || ': ' || amt || ' was split between the two of you as decided. Open the agreement to see the amounts.', p_href);
  elsif p_status = 'disputed' then
    perform private.notify_once(key || ':buyer', p_buyer, 'booking', 'Payment under dispute',
      p_place || ': ' || amt || ' stays with the payment partner while the dispute is looked at. Open the agreement for the next step.', p_href);
    perform private.notify_once(key || ':seller', p_seller, 'booking', 'Payment under dispute',
      p_place || ': ' || amt || ' stays with the payment partner while the dispute is looked at. Open the agreement for the next step.', p_href);
  end if;
end;
$fn$;

create or replace function private.notify_arrangement_change()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $fn$
declare
  ag public.deal_agreements%rowtype;
  place text;
begin
  begin
    if tg_op <> 'UPDATE' or new.status is not distinct from old.status then
      return new;
    end if;
    if new.status not in ('protected', 'release_requested', 'released', 'refunded', 'split', 'disputed') then
      return new;
    end if;
    /* The renter's confirm was undone: the money is where it was, not news. */
    if new.status = 'protected' and old.status = 'release_requested' then
      return new;
    end if;

    select * into ag from public.deal_agreements where id = new.agreement_id;
    place := coalesce(
      (select l.title from public.listings l where l.id = ag.listing_id),
      (select ac.name from public.accommodations ac where ac.id = ag.accommodation_id),
      'your agreement');

    perform private.tell_arrangement(
      new.id, new.status, new.buyer_user_id, new.seller_user_id, place,
      new.amount_minor, '/agreements/' || new.agreement_id::text);
  exception when others then
    declare
      v_state text := sqlstate;
      v_message text := sqlerrm;
    begin
      perform private.notice_failed('protected payment notice', 'deal_agreement', new.agreement_id::text, v_state, v_message);
    exception when others then
      raise warning '[notify] protected payment notice failed: %', v_state;
    end;
  end;
  return new;
end;
$fn$;

create or replace trigger provider_arrangements_zz_notify_change
  after update of status on public.provider_arrangements
  for each row execute function private.notify_arrangement_change();

revoke all on function
  private.deliver_payment_received(uuid, uuid, uuid, uuid, text, date, date, bigint, bigint, text, boolean, boolean),
  private.tell_payment_received(uuid),
  private.notify_payment_received(),
  private.tell_arrangement(uuid, text, uuid, uuid, text, bigint, text),
  private.notify_arrangement_change()
  from public, anon, authenticated, service_role;
