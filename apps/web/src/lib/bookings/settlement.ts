import "server-only";

import type { AdminClient } from "../wallet/ledger";

/**
 * Booking settlement: the one place a card charge becomes a paid booking.
 *
 * Shared deliberately. The Paystack webhook and the return-from-Paystack
 * verify path both call `settleBookingCharge`, so whichever arrives first does
 * the work and the second is a no-op. Nothing here is duplicated between the
 * two callers, because two implementations of settlement is two chances to
 * disagree about money.
 *
 * WHAT MAKES IT IDEMPOTENT. Two keys, both in the database:
 *
 *  1. `transactions.provider_ref` is UNIQUE, and the flip to SUCCESSFUL is a
 *     conditional update guarded on the row not already being SUCCESSFUL. Only
 *     one caller can win that update, so only one caller writes the ledger.
 *     A replay reads back zero moved rows and stops.
 *  2. The booking transition is guarded on `status = 'PENDING'`, so a booking
 *     already CONFIRMED is never touched again and its state event, calendar
 *     write and confirmation email happen exactly once.
 *
 * THE COMMERCIAL RULE. The platform charges nothing (docs/MASTER_TODO.md
 * section 5b), so every ledger row reads: gross is the booking total,
 * platform_fee_minor is 0, processor_fee_minor is whatever the processor
 * actually took (0 when it did not say), and agent_share_minor is the rest.
 * That satisfies the ledger_balances_chk constraint exactly, in integer kobo:
 * gross = 0 + (gross - processor) + processor.
 */

/** Every calendar date in [checkIn, checkOut), ISO strings. Half-open nights. */
export function nightsOf(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  let cursor = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(cursor) || Number.isNaN(end)) return out;
  while (cursor < end) {
    out.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += 86_400_000;
  }
  return out;
}

/**
 * Hold the calendar for a stay's nights. Called at reserve, so the next guest
 * sees the dates closed on the calendar rather than meeting the database
 * refusal after filling in the whole form, and again on settlement, where it
 * is a harmless upsert over rows that already say the same thing.
 */
export async function writeBookedNights(
  admin: AdminClient,
  listingId: string,
  checkIn: string,
  checkOut: string,
): Promise<void> {
  const rows = nightsOf(checkIn, checkOut).map((date) => ({
    listing_id: listingId,
    date,
    status: "booked" as const,
  }));
  if (rows.length === 0) return;
  const { error } = await admin
    .from("availability")
    .upsert(rows, { onConflict: "listing_id,date" });
  if (error) throw new Error(error.message);
}

/**
 * Release a stay's nights back to the calendar. Only rows this platform marked
 * `booked` are removed, so a night an agent closed by hand stays closed.
 */
export async function releaseBookedNights(
  admin: AdminClient,
  listingId: string,
  checkIn: string,
  checkOut: string,
): Promise<void> {
  const { error } = await admin
    .from("availability")
    .delete()
    .eq("listing_id", listingId)
    .eq("status", "booked")
    .gte("date", checkIn)
    .lt("date", checkOut);
  if (error) throw new Error(error.message);
}

/** The four parts of a settled charge, in integer kobo, balanced by construction. */
export type ChargeDecomposition = {
  grossMinor: number;
  platformFeeMinor: number;
  agentShareMinor: number;
  processorFeeMinor: number;
  netSettlementMinor: number;
};

/**
 * Split a settled charge for the ledger.
 *
 * The platform take is zero and stays zero. The processor charge is clamped
 * into [0, gross] so a nonsense figure from the processor can never drive the
 * agent's share negative and break the constraint; whatever is left after the
 * processor is the agent's, which is also what actually settles to them.
 */
export function decomposeCharge(
  grossMinor: number,
  processorFeeMinor: number | null | undefined,
): ChargeDecomposition {
  const gross = Math.max(0, Math.trunc(grossMinor));
  const reported = Math.trunc(processorFeeMinor ?? 0);
  const processor = Math.min(gross, Math.max(0, Number.isFinite(reported) ? reported : 0));
  const platform = 0;
  const agent = gross - platform - processor;
  return {
    grossMinor: gross,
    platformFeeMinor: platform,
    agentShareMinor: agent,
    processorFeeMinor: processor,
    netSettlementMinor: agent,
  };
}

export type ChargeSettlement =
  | {
      outcome: "settled";
      bookingId: string;
      /** True only when THIS call moved the booking PENDING to CONFIRMED. */
      confirmed: boolean;
      amountMinor: number;
      ledger: ChargeDecomposition;
    }
  /** The reference was already settled. Nothing moved, nothing to announce. */
  | { outcome: "already-settled"; bookingId: string | null }
  /** No transaction carries this reference and no booking was named for it. */
  | { outcome: "unknown-reference" };

type TransactionRow = {
  id: string;
  booking_id: string;
  amount_minor: number;
};

/** Read the attempt this reference belongs to, or null when there is none. */
async function readAttempt(
  admin: AdminClient,
  reference: string,
): Promise<TransactionRow | null> {
  const { data, error } = await admin
    .from("transactions")
    .select("id, booking_id, amount_minor")
    .eq("provider_ref", reference)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

/**
 * Settle a successful charge against its booking. Safe to call any number of
 * times with the same reference: see the two keys documented at the top.
 *
 * `fallbackBookingId` heals the one case where the processor knows about a
 * charge this platform has no attempt row for (the row write landed but the
 * response was lost, or a delivery raced the insert). It comes from the
 * payment metadata the checkout action set, never from a request body a client
 * controls, and it only ever creates the PENDING row the settlement then
 * moves.
 */
export async function settleBookingCharge(
  admin: AdminClient,
  params: {
    reference: string;
    /** Kobo the processor actually charged, used only to heal a missing row. */
    amountMinor: number;
    /** Kobo the processor kept, when it said. Absent means zero. */
    processorFeeMinor?: number | null;
    fallbackBookingId?: string | null;
  },
): Promise<ChargeSettlement> {
  let attempt = await readAttempt(admin, params.reference);

  if (!attempt) {
    const bookingId = params.fallbackBookingId ?? null;
    if (!bookingId) return { outcome: "unknown-reference" };
    await admin.from("transactions").upsert(
      {
        booking_id: bookingId,
        provider: "paystack",
        provider_ref: params.reference,
        amount_minor: Math.max(0, Math.trunc(params.amountMinor)),
        status: "PENDING",
      },
      { onConflict: "provider_ref", ignoreDuplicates: true },
    );
    attempt = await readAttempt(admin, params.reference);
    if (!attempt) return { outcome: "unknown-reference" };
  }

  // Key 1. Exactly one caller wins this update; a replay moves no rows. FAILED
  // is included because a processor that first said no and then said yes has
  // moved real money, and the ledger must follow the money.
  const won = await admin
    .from("transactions")
    .update({ status: "SUCCESSFUL" })
    .eq("provider_ref", params.reference)
    .in("status", ["PENDING", "FAILED"])
    .select("id, booking_id, amount_minor");
  if (won.error) throw new Error(won.error.message);

  const row = won.data?.[0];
  if (!row) return { outcome: "already-settled", bookingId: attempt.booking_id };

  const ledger = decomposeCharge(row.amount_minor, params.processorFeeMinor);
  const ledgerWrite = await admin.from("ledger_entries").insert({
    booking_id: row.booking_id,
    transaction_id: row.id,
    gross_minor: ledger.grossMinor,
    platform_fee_minor: ledger.platformFeeMinor,
    agent_share_minor: ledger.agentShareMinor,
    processor_fee_minor: ledger.processorFeeMinor,
    net_settlement_minor: ledger.netSettlementMinor,
  });
  // A unique violation here means a concurrent caller wrote this entry first
  // (the one-entry-per-transaction index in the pending migration). The money
  // is accounted for either way, so that is a no-op, not an error.
  if (ledgerWrite.error && ledgerWrite.error.code !== "23505") {
    throw new Error(ledgerWrite.error.message);
  }

  // Key 2. Only a booking still PENDING transitions, so the state event, the
  // calendar write and the caller's confirmation email happen exactly once.
  const moved = await admin
    .from("bookings")
    .update({ status: "CONFIRMED" })
    .eq("id", row.booking_id)
    .eq("status", "PENDING")
    .select("id, listing_id, guest_id, check_in, check_out, nights, total_minor");
  if (moved.error) throw new Error(moved.error.message);

  const booking = moved.data?.[0] ?? null;
  if (booking) {
    await admin.from("booking_state_events").insert({
      booking_id: booking.id,
      from_status: "PENDING",
      to_status: "CONFIRMED",
      note: "Payment received, so the stay is confirmed.",
    });
    await writeBookedNights(admin, booking.listing_id, booking.check_in, booking.check_out);
  }

  return {
    outcome: "settled",
    bookingId: row.booking_id,
    confirmed: booking !== null,
    amountMinor: row.amount_minor,
    ledger,
  };
}

/**
 * Mark a payment attempt FAILED and leave the booking exactly as it was.
 *
 * A failed card attempt must not cancel the stay: the guest still holds their
 * dates and can try again, by card or from their wallet. Only a PENDING
 * attempt moves, so a delivery arriving after a successful settlement cannot
 * unpick it. Returns true when this call moved the row.
 */
export async function markChargeFailed(
  admin: AdminClient,
  reference: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("transactions")
    .update({ status: "FAILED" })
    .eq("provider_ref", reference)
    .eq("status", "PENDING")
    .select("id");
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

/** The booking a reference is attached to, for authorising a caller. */
export async function bookingForReference(
  admin: AdminClient,
  reference: string,
): Promise<{ bookingId: string; guestId: string } | null> {
  const { data, error } = await admin
    .from("transactions")
    .select("booking_id, bookings!inner(guest_id)")
    .eq("provider_ref", reference)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { bookingId: data.booking_id, guestId: data.bookings.guest_id };
}
