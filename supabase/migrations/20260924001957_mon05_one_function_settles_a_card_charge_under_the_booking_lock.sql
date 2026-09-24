-- MON-05 (with OPS-01) and OPS-02 (a) and (c): one SQL function settles a card
-- charge against a booking, under the booking's lock.
--
-- Before: lib/bookings/settlement.ts flipped the attempt to SUCCESSFUL by
-- reference, wrote the ledger, and moved the booking, in separate calls with no
-- lock. A second successful charge on the same booking (two tabs, a reload, a
-- transfer landing after a card) was recorded as a second success. A charge
-- landing after the hold sweep cancelled the booking was kept, and the history
-- said "the host had already accepted this stay". Nothing refunded or alerted.
--
-- Now, under the guest's wallet lock and then the booking's (the same order the
-- wallet door takes, so the two cannot deadlock):
--   * the first successful charge that matches a live booking settles it: the
--     attempt becomes SUCCESSFUL, one balanced ledger row is written (which is
--     also what credits the lister for rent, V-33), and a PENDING booking is
--     confirmed;
--   * any other charge the processor has already taken (the booking is already
--     paid, is no longer PENDING or CONFIRMED, has a check-in that has passed
--     while still unconfirmed, or the amount is not the booking's price) is
--     RETURNED: the attempt is marked REFUNDED, the whole amount is credited to
--     the guest's wallet in the same transaction, and a high alert and an audit
--     row are written. The money moved, so this never raises. The webhook
--     answers 200 and nothing retries for 72 hours.
-- The partial unique index that backstops this (one SUCCESSFUL attempt per
-- booking) is m5b, applied only after the release that calls this function:
-- the deployed settlement.ts would turn a second success into a 23505, a 500
-- and 72 hours of Paystack retries.

create or replace function private.settle_booking_charge(
  p_reference text,
  p_amount_minor bigint,
  p_processor_fee_minor bigint default null,
  p_fallback_booking uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  tx           public.transactions%rowtype;
  bk           public.bookings%rowtype;
  guest        uuid;
  guest_wallet uuid;
  gross        bigint;
  fee          bigint;
  reason       text;
  was_pending  boolean;
  lagos_today  date := (now() at time zone 'Africa/Lagos')::date;
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
    insert into public.transactions (booking_id, provider, provider_ref, amount_minor, currency, status)
    values (p_fallback_booking, 'paystack', p_reference, greatest(0, coalesce(p_amount_minor, 0)), 'NGN', 'PENDING')
    on conflict (provider_ref) do nothing;
    select * into tx from public.transactions where provider_ref = p_reference;
    if tx.id is null then
      return jsonb_build_object('outcome', 'unknown-reference');
    end if;
  end if;

  -- Lock order: the guest's wallet, then the booking, then the attempt.
  select b.guest_id into guest from public.bookings b where b.id = tx.booking_id;
  insert into public.wallets (user_id) values (guest) on conflict (user_id) do nothing;
  select w.id into guest_wallet from public.wallets w where w.user_id = guest for update;
  select * into bk from public.bookings where id = tx.booking_id for update;
  select * into tx from public.transactions where id = tx.id for update;

  if tx.status in ('SUCCESSFUL', 'REFUNDED') then
    return jsonb_build_object('outcome', 'already-settled', 'booking_id', bk.id,
                              'transaction_status', tx.status);
  end if;

  gross := case when coalesce(p_amount_minor, 0) > 0 then p_amount_minor else tx.amount_minor end;

  reason := case
    when bk.status not in ('PENDING', 'CONFIRMED') then 'booking_' || lower(bk.status::text)
    when exists (select 1 from public.transactions t
                  where t.booking_id = bk.id and t.status = 'SUCCESSFUL' and t.id <> tx.id)
      then 'already_paid'
    when bk.status = 'PENDING' and bk.check_in < lagos_today then 'check_in_passed'
    -- The amount must be the booking's price. If the Paystack account is ever
    -- set to pass its fee to the customer, the charge is price + fee, which
    -- is accepted too (and the fee is then not taken from the lister's share).
    when gross <> bk.total_minor
         and gross - greatest(0, coalesce(p_processor_fee_minor, 0)) <> bk.total_minor
      then 'amount_mismatch'
    else null
  end;

  if reason is not null then
    update public.transactions set status = 'REFUNDED' where id = tx.id;
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (guest_wallet, 'refund', 'credit', gross, 'charge-returned:' || p_reference, 'COMPLETED',
       jsonb_build_object(
         'note', 'Returned to your wallet: this payment could not be applied to the booking',
         'booking_id', bk.id,
         'listing_id', bk.listing_id,
         'payment_reference', p_reference,
         'reason', reason,
         'booking_total_minor', bk.total_minor
       ))
    on conflict (reference) do nothing;
    insert into public.risk_alerts (severity, status, title, description, entity_type, entity_id)
    values ('high', 'open',
            'A card payment was returned to the guest''s wallet',
            format('Reference %s took %s kobo for booking %s (status %s, total %s kobo) and could not be applied (%s). '
                   || 'The whole amount is in the guest''s Vallo wallet; the processor''s fee was not recovered.',
                   p_reference, gross, bk.id, bk.status, bk.total_minor, reason),
            'booking', bk.id::text);
    insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (null, 'booking.charge_returned_to_wallet', 'booking', bk.id::text,
            jsonb_build_object('reference', p_reference, 'amount_minor', gross,
                               'reason', reason, 'booking_status', bk.status));
    return jsonb_build_object('outcome', 'returned-to-wallet', 'booking_id', bk.id,
                              'reason', reason, 'amount_minor', gross);
  end if;

  update public.transactions set status = 'SUCCESSFUL' where id = tx.id;

  fee := least(gross, greatest(0, coalesce(p_processor_fee_minor, 0)));
  -- A customer-borne fee: the booking's price is what settles to the lister.
  if gross <> bk.total_minor and gross - fee = bk.total_minor then
    gross := bk.total_minor;
    fee := 0;
  end if;
  insert into public.ledger_entries
    (booking_id, transaction_id, gross_minor, platform_fee_minor,
     agent_share_minor, processor_fee_minor, net_settlement_minor)
  values (bk.id, tx.id, gross, 0, gross - fee, fee, gross - fee)
  on conflict (transaction_id) where transaction_id is not null do nothing;

  was_pending := bk.status = 'PENDING';
  if was_pending then
    update public.bookings set status = 'CONFIRMED' where id = bk.id and status = 'PENDING';
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (bk.id, 'PENDING', 'CONFIRMED', 'Payment received, so the stay is confirmed.');
    insert into public.availability (listing_id, date, status)
    select bk.listing_id, d::date, 'booked'
      from generate_series(bk.check_in::timestamp, (bk.check_out - 1)::timestamp, interval '1 day') as d
    on conflict (listing_id, date) do update set status = 'booked';
  else
    insert into public.booking_state_events (booking_id, from_status, to_status, note)
    values (bk.id, 'CONFIRMED', 'CONFIRMED', 'Payment received. The host had already accepted this stay.');
  end if;

  return jsonb_build_object(
    'outcome', 'settled',
    'booking_id', bk.id,
    'confirmed', was_pending,
    'amount_minor', gross,
    'ledger', jsonb_build_object(
      'grossMinor', gross, 'platformFeeMinor', 0, 'agentShareMinor', gross - fee,
      'processorFeeMinor', fee, 'netSettlementMinor', gross - fee));
end;
$$;

revoke all on function private.settle_booking_charge(text, bigint, bigint, uuid) from public, anon, authenticated;

create or replace function public.settle_booking_charge(
  p_reference text,
  p_amount_minor bigint,
  p_processor_fee_minor bigint default null,
  p_fallback_booking uuid default null
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.settle_booking_charge(p_reference, p_amount_minor, p_processor_fee_minor, p_fallback_booking);
$$;

revoke all on function public.settle_booking_charge(text, bigint, bigint, uuid) from public, anon, authenticated;
grant execute on function public.settle_booking_charge(text, bigint, bigint, uuid) to service_role;
