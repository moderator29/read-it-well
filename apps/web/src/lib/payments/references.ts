import "server-only";

import { randomUUID } from "node:crypto";

/**
 * The payment reference contract, in one place.
 *
 * A reference is not a cosmetic prefix. It is the key money moves on: the
 * wallet ledger's `reference` column is unique, `transactions.provider_ref` is
 * unique, and the Paystack webhook routes purely on these shapes. That is what
 * makes a replayed delivery collide with itself instead of posting twice. Never
 * invent a new shape without adding it here and teaching
 * app/api/paystack/webhook/route.ts to route it.
 *
 * The whole family this platform generates:
 *
 *  - `rm-fund-<uuid>`  Wallet funding. A hosted Paystack charge, settled by
 *    charge.success, which posts a COMPLETED deposit to wallet_entries. The
 *    verify-on-redirect fallback posts the identical row, so whichever arrives
 *    first wins and the second is a clean duplicate.
 *
 *  - `rm-wd-<uuid>`  Withdrawal. Posted first as a PENDING debit hold, then
 *    handed to Paystack as a transfer under the same reference;
 *    transfer.success / transfer.failed / transfer.reversed settle that one
 *    hold and nothing else.
 *
 *  - `rm-p2p-<uuid>-out` / `rm-p2p-<uuid>-in`  The paired legs of an internal
 *    transfer, written inside one database function so both land or neither.
 *
 *  - `rm-book-<uuid>`  A card payment against a booking. Written first as a
 *    PENDING `transactions` row whose `provider_ref` is the reference, then
 *    handed to Paystack. charge.success settles it (transaction to SUCCESSFUL,
 *    one balanced `ledger_entries` row, booking PENDING to CONFIRMED, state
 *    event, calendar nights) and charge.failed marks the transaction FAILED
 *    while leaving the booking PENDING so the guest can try again. The same
 *    shape carries a wallet payment: there it keys both the `payment` debit in
 *    wallet_entries and the `transactions` row written inside one atomic
 *    database function, so paying a booking from the wallet is idempotent on
 *    exactly the same key as paying it by card.
 *
 * The platform charges nothing, so a booking reference always moves the
 * booking total and nothing more (docs/MASTER_TODO.md section 5b).
 */

export const FUND_PREFIX = "rm-fund-";
export const WITHDRAW_PREFIX = "rm-wd-";
export const P2P_PREFIX = "rm-p2p-";
export const BOOKING_PREFIX = "rm-book-";

const REFERENCE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A fresh reference for one payment attempt against a booking. */
export function bookingReference(): string {
  return `${BOOKING_PREFIX}${randomUUID()}`;
}

/**
 * True when a string is a reference this platform generated for a booking
 * payment. Shape-checked, not merely prefix-checked, so a hand-typed value
 * cannot reach a settlement path.
 */
export function isBookingReference(value: string): boolean {
  if (!value.startsWith(BOOKING_PREFIX)) return false;
  return REFERENCE_UUID_RE.test(value.slice(BOOKING_PREFIX.length));
}
