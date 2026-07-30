-- Paying a booking from the RentMe wallet, as one indivisible fact.
--
-- Why a database function rather than a sequence of service-layer writes. A
-- wallet payment is six writes that must all be true together: the wallet is
-- debited, the payment attempt is recorded, the ledger row that accounts for it
-- is written, the booking becomes CONFIRMED, its history gains a row, and the
-- calendar nights close. Done as six round trips, a process death between any
-- two of them leaves the worst state this platform could hold: money taken and
-- no booking, or a booking confirmed and no money. One transaction cannot land
-- half way.
--
-- The spendable balance is priced INSIDE a row lock on the payer's wallet, the
-- same discipline as private.transfer_between_wallets. Two taps racing each
-- other therefore queue, and the second one sees the first one's debit. Without
-- the lock both could pass the last naira.
--
-- Idempotency is the reference. The wallet ledger's `reference` is unique and
-- `transactions.provider_ref` is unique, both keyed on the same
-- rm-book-<uuid> string, so replaying one payment collides with itself and the
-- whole function reports 'duplicate' having moved nothing.
--
-- THE COMMERCIAL RULE, encoded. The platform charges nothing. A wallet payment
-- involves no processor either, so the ledger row reads: gross = the booking
-- total, platform_fee_minor = 0, processor_fee_minor = 0,
-- agent_share_minor = gross. That satisfies ledger_balances_chk exactly in
-- integer kobo: gross = 0 + gross + 0.

-- One accounting entry per settled payment attempt, enforced rather than
-- assumed. Both this function and the webhook settlement write ledger_entries
-- keyed to a transaction; this index makes a second write for the same attempt
-- impossible instead of merely unlikely.
create unique index if not exists ledger_entries_transaction_uniq
  on public.ledger_entries (transaction_id)
  where transaction_id is not null;

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
begin
  if payer is null or target_booking is null
     or payment_reference is null or length(payment_reference) = 0 then
    return jsonb_build_object('status', 'bad_request');
  end if;

  -- Lazily ensure the wallet exists, exactly as the wallet migration intends,
  -- then lock it. Every other spend for this wallet queues behind this line,
  -- which is what makes the balance check below trustworthy.
  insert into public.wallets (user_id) values (payer)
    on conflict (user_id) do nothing;

  select id into payer_wallet from public.wallets
   where user_id = payer for update;

  if payer_wallet is null then
    return jsonb_build_object('status', 'no_wallet');
  end if;

  -- Lock the booking too, so a concurrent cancel or confirm cannot slip
  -- between the status check and the transition.
  select * into booking_row from public.bookings
   where id = target_booking and guest_id = payer
   for update;

  if booking_row.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if booking_row.status <> 'PENDING' then
    return jsonb_build_object('status', 'not_pending');
  end if;
  if booking_row.currency <> 'NGN' then
    return jsonb_build_object('status', 'not_naira');
  end if;
  if booking_row.total_minor <= 0 then
    return jsonb_build_object('status', 'bad_amount');
  end if;

  -- Already settled by another path (a card charge that landed first). Say so
  -- rather than taking the money a second time.
  if exists (
    select 1 from public.transactions t
     where t.booking_id = booking_row.id and t.status = 'SUCCESSFUL'
  ) then
    return jsonb_build_object('status', 'already_paid');
  end if;

  -- Spendable means COMPLETED credits minus COMPLETED debits minus PENDING
  -- debits, so money already committed to an in-flight withdrawal cannot be
  -- spent on a stay while the bank settles.
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

  -- From here everything lands together or nothing does.
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
    -- This exact payment already happened. Nothing moved on this call.
    return jsonb_build_object('status', 'duplicate');
  end;

  -- The ledger row. gross = platform + agent + processor, in integer kobo:
  -- the platform takes nothing and there is no processor in a wallet payment,
  -- so the agent's share is the whole gross.
  insert into public.ledger_entries
    (booking_id, transaction_id, gross_minor, platform_fee_minor,
     agent_share_minor, processor_fee_minor, net_settlement_minor)
  values
    (booking_row.id, attempt_id, booking_row.total_minor, 0,
     booking_row.total_minor, 0, booking_row.total_minor);

  -- The booking itself. The PENDING guard is belt and braces on top of the row
  -- lock taken above.
  update public.bookings set status = 'CONFIRMED'
   where id = booking_row.id and status = 'PENDING';

  if not found then
    -- Cannot happen while the lock is held; if it ever does, refuse loudly
    -- rather than leave a debit with no confirmed stay behind it.
    raise exception 'booking % could not be confirmed after payment', booking_row.id;
  end if;

  insert into public.booking_state_events (booking_id, from_status, to_status, actor_id, note)
  values (booking_row.id, 'PENDING', 'CONFIRMED', payer,
          'Paid in full from the guest wallet, so the stay is confirmed.');

  -- Close the calendar for every night of the stay. Half-open range, so the
  -- checkout day stays open for the next guest.
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
    'booking_id', booking_row.id
  );
end;
$$;

comment on function private.pay_booking_from_wallet(uuid, uuid, text) is
  'Atomic wallet payment for a booking. Locks the payer wallet and the booking, prices the spendable balance inside the lock, then debits the wallet, records the attempt, writes the balanced ledger row, confirms the booking, appends the state event and closes the calendar nights. All or nothing.';

revoke execute on function private.pay_booking_from_wallet(uuid, uuid, text)
  from public, anon, authenticated;

-- The service-role door. PostgREST does not expose the private schema, which is
-- exactly why the implementation lives there; this thin wrapper is the only way
-- in and it is granted to service_role alone. An anon or authenticated caller
-- hitting /rest/v1/rpc/pay_booking_from_wallet gets a permission error, not a
-- way to move money.
create or replace function public.pay_booking_from_wallet(
  payer             uuid,
  target_booking    uuid,
  payment_reference text
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select private.pay_booking_from_wallet(payer, target_booking, payment_reference);
$$;

comment on function public.pay_booking_from_wallet(uuid, uuid, text) is
  'Service-role door to private.pay_booking_from_wallet.';

revoke execute on function public.pay_booking_from_wallet(uuid, uuid, text)
  from public, anon, authenticated;
grant  execute on function public.pay_booking_from_wallet(uuid, uuid, text) to service_role;
