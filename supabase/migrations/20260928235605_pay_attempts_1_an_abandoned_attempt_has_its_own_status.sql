-- PAYSTACK agent, 28 September 2026. Payment attempts, part 1 of 2.
--
-- A card attempt the payer cancels or walks away from used to stay PENDING
-- forever: it blocked cancelling the agreement for two hours
-- (agreement_cancel_as -> payment_in_flight) and every retry opened another.
-- An attempt that Paystack itself says was never completed, after the payer
-- closed the window or after the abandonment window, now becomes ABANDONED.
--
-- ABANDONED is NOT terminal for money: private.settle_booking_charge settles
-- any attempt whose status is not SUCCESSFUL or REFUNDED, so a charge that
-- somehow completes on an abandoned attempt is still settled (or refunded)
-- through the one normal path, under its row lock, and
-- transactions_one_success_per_booking still forbids a second success.
--
-- ALTER TYPE ... ADD VALUE cannot be used in the transaction that adds it,
-- so everything that names the value is in part 2.
alter type public.transaction_status add value if not exists 'ABANDONED';

do $$
begin
  if not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                  where t.typname = 'transaction_status' and e.enumlabel = 'ABANDONED') then
    raise exception 'read-back: transaction_status has no ABANDONED value';
  end if;
end $$;
