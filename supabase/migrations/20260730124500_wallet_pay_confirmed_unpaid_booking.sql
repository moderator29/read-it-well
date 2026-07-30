-- A confirmed stay can still be unpaid, and it must be payable.
--
-- THE HOLE THIS CLOSES. There are two ways a booking reaches CONFIRMED, and
-- only one of them involves money:
--   * instant book: the guest pays, and paying is what confirms it.
--   * request to book: the HOST accepts, and that confirms it with no payment.
-- The first version of this function guarded on `status = 'PENDING'`, which is
-- correct for the first case and silently fatal for the second: once a host
-- accepted a request, the stay was CONFIRMED, this function answered
-- 'not_pending', and the guest was told "nothing further is needed" while the
-- host was never paid a kobo. A whole side of the supply model could not
-- transact.
--
-- So the payable test is no longer the status. It is "is there a settled
-- payment attempt against this booking", which is the only fact that actually
-- answers "has this been paid". CANCELLED is the one status still refused, and
-- it now says so in its own words ('not_payable') rather than borrowing the
-- confirmed message.
--
-- What changes for each case:
--   * PENDING  -> debit, record, ledger, CONFIRMED, state event, close nights.
--   * CONFIRMED -> debit, record, ledger, status untouched (the host already
--     confirmed it), a state event that reads CONFIRMED to CONFIRMED noting the
--     payment, and the calendar upsert repeated harmlessly.
--
-- Everything else is unchanged: the wallet row lock, pricing the spendable
-- balance inside that lock, the unique reference as the idempotency key, and
-- the zero-fee ledger split.
--
-- The application side of the same hole is fixed in three places, and all four
-- changes have to travel together:
--   * lib/bookings/checkout-view.ts stopped calling a booking paid merely
--     because it was CONFIRMED.
--   * lib/bookings/checkout.ts stopped refusing a CONFIRMED booking at the
--     guard, and understands the new 'not_payable' status.
--   * lib/bookings/settlement.ts records a state event when a card pays a stay
--     the host had already accepted, and the receipt is gated on money having
--     moved rather than on the status having changed.

create or replace function private.pay_booking_from_wallet(
  payer             uuid,
  target_booking    uuid,
  payment_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  payer_wallet   uuid;
  booking_row    public.bookings;
  settled        bigint;
  held           bigint;
  spendable      bigint;
  attempt_id     uuid;
  was_pending    boolean;
begin
  if payer is null or target_booking is null
     or payment_reference is null or length(payment_reference) = 0 then
    return jsonb_build_object('status', 'bad_request');
  end if;

  insert into public.wallets (user_id) values (payer)
    on conflict (user_id) do nothing;

  select id into payer_wallet from public.wallets
   where user_id = payer for update;

  if payer_wallet is null then
    return jsonb_build_object('status', 'no_wallet');
  end if;

  select * into booking_row from public.bookings
   where id = target_booking and guest_id = payer
   for update;

  if booking_row.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Payable means PENDING (nobody has confirmed it yet) or CONFIRMED (the host
  -- accepted it and it is still owed). Anything else, which today means
  -- CANCELLED, is refused in its own words.
  if booking_row.status not in ('PENDING', 'CONFIRMED') then
    return jsonb_build_object('status', 'not_payable', 'booking_status', booking_row.status);
  end if;
  was_pending := booking_row.status = 'PENDING';

  if booking_row.currency <> 'NGN' then
    return jsonb_build_object('status', 'not_naira');
  end if;
  if booking_row.total_minor <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;

  -- The real "already paid" test, and now the only one.
  if exists (
    select 1 from public.transactions t
     where t.booking_id = booking_row.id and t.status = 'SUCCESSFUL'
  ) then
    return jsonb_build_object('status', 'already_paid');
  end if;

  select coalesce(sum(case when direction = 'credit' then amount_minor else -amount_minor end), 0)
    into settled
    from public.wallet_entries
   where wallet_id = payer_wallet and status = 'COMPLETED';

  select coalesce(sum(amount_minor), 0)
    into held
    from public.wallet_entries
   where wallet_id = payer_wallet and status = 'PENDING' and direction = 'debit';

  spendable := settled - held;

  if spendable < booking_row.total_minor then
    return jsonb_build_object(
      'status', 'insufficient',
      'available_minor', spendable,
      'amount_minor', booking_row.total_minor
    );
  end if;

  begin
    insert into public.wallet_entries
      (wallet_id, kind, direction, amount_minor, reference, status, metadata)
    values
      (payer_wallet, 'payment', 'debit', booking_row.total_minor, payment_reference, 'COMPLETED',
       jsonb_build_object(
         'note', 'Payment for a RentMe stay',
         'booking_id', booking_row.id,
         'listing_id', booking_row.listing_id,
         'check_in', booking_row.check_in,
         'check_out', booking_row.check_out
       ));

    insert into public.transactions
      (booking_id, provider, provider_ref, amount_minor, currency, status)
    values
      (booking_row.id, 'wallet', payment_reference, booking_row.total_minor,
       booking_row.currency, 'SUCCESSFUL')
    returning id into attempt_id;
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate');
  end;

  insert into public.ledger_entries
    (booking_id, transaction_id, gross_minor, platform_fee_minor,
     agent_share_minor, processor_fee_minor, net_settlement_minor)
  values
    (booking_row.id, attempt_id, booking_row.total_minor, 0,
     booking_row.total_minor, 0, booking_row.total_minor);

  if was_pending then
    update public.bookings set status = 'CONFIRMED'
     where id = booking_row.id and status = 'PENDING';

    if not found then
      raise exception 'booking % could not be confirmed after payment', booking_row.id;
    end if;

    insert into public.booking_state_events (booking_id, from_status, to_status, actor_id, note)
    values (booking_row.id, 'PENDING', 'CONFIRMED', payer,
            'Paid in full from the guest wallet, so the stay is confirmed.');
  else
    -- The host already confirmed this stay. Payment does not change its status,
    -- it settles it, and the history says exactly that.
    insert into public.booking_state_events (booking_id, from_status, to_status, actor_id, note)
    values (booking_row.id, 'CONFIRMED', 'CONFIRMED', payer,
            'Paid in full from the guest wallet. The host had already accepted this stay.');
  end if;

  -- Idempotent either way: confirming already closed these nights, and a host
  -- acceptance closes them too, so this is a no-op in the CONFIRMED case.
  insert into public.availability (listing_id, date, status)
  select booking_row.listing_id, d::date, 'booked'
    from generate_series(booking_row.check_in::timestamp,
                         (booking_row.check_out - 1)::timestamp,
                         interval '1 day') as d
  on conflict (listing_id, date) do update set status = 'booked';

  return jsonb_build_object(
    'status', 'ok',
    'amount_minor', booking_row.total_minor,
    'reference', payment_reference,
    'transaction_id', attempt_id,
    'booking_id', booking_row.id,
    'confirmed_by_this_payment', was_pending
  );
end;
$$;

comment on function private.pay_booking_from_wallet(uuid, uuid, text) is
  'Atomic wallet payment for a booking that is PENDING or CONFIRMED-and-unpaid. Locks the payer wallet and the booking, prices the spendable balance inside the lock, then debits the wallet, records the attempt, writes the balanced zero-fee ledger row, confirms the booking if payment is what confirms it, appends the state event and closes the calendar nights. All or nothing.';
