import "server-only";

import { RENT_PERIOD_LABEL, type RentPeriod } from "@/lib/listings/pricing";
import { resolveSession } from "@/lib/actions/session";
import { BOOKING_PREFIX } from "@/lib/payments/references";

/**
 * WHAT THIS PAYMENT WAS FOR, which is the question a receipt exists to answer.
 *
 * The receipt said how much, when, and under what reference, and then it
 * stopped. "What did I pay for" is the reason somebody opens a receipt at all,
 * usually while anxious, and the ledger already knows: a booking payment is
 * keyed `rm-book-<uuid>`, that key is the `transactions.provider_ref` the
 * webhook settles on, and that transaction names the booking, which names the
 * listing. Nothing new is stored and nothing is denormalised onto a money row.
 *
 * A TENANCY IS NOT A STAY HERE EITHER. A rent charge rides the same bookings
 * table and the same reference shape, so the same read would print a year's
 * rent as a one-night stay with a check-in and a check-out. `rent_payments` is
 * what says a booking is a tenancy (the same branch `getMyBookings` takes), and
 * a tenancy is described by its move-in day and its period.
 *
 * EVERY PART OF THIS RESOLVES OR THE ROW IS NOT DRAWN. A reference of another
 * shape, a transaction that is not this reader's, a booking that has gone, a
 * listing that has come down: each returns null and the receipt renders exactly
 * as it did before. Nothing here invents a title or a date.
 *
 * WHERE THIS BELONGS EVENTUALLY: `lib/wallet`, beside
 * `readPropertyNamesForReferences`, which resolves the escrow half of the same
 * question. That directory belongs to another worker in this build, so the read
 * sits beside its only caller and is reported rather than moved.
 */
export type PaidFor = {
  /** The listing this money bought something at. */
  listingId: string;
  title: string;
  /** "Fri 2 Oct to Mon 5 Oct" for a stay; a move-in day for a tenancy. */
  when: string;
  /** "Yearly rent" on a tenancy, so no reader mistakes it for a night. */
  period: string | null;
  kind: "stay" | "tenancy";
};

const DAY = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function label(iso: string): string {
  return DAY.format(new Date(`${iso}T12:00:00Z`));
}

export async function readPaidFor(reference: string): Promise<PaidFor | null> {
  if (!reference.startsWith(BOOKING_PREFIX)) return null;

  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return null;
    const db = session.supabase;

    /* The payer's own transaction, under their own RLS. A reference that is
       not theirs simply does not come back. */
    const { data: transaction } = await db
      .from("transactions")
      .select("booking_id")
      .eq("provider_ref", reference)
      .maybeSingle();
    const bookingId = transaction?.booking_id;
    if (!bookingId) return null;

    const { data: booking } = await db
      .from("bookings")
      .select("id, listing_id, check_in, check_out")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return null;

    const [{ data: charge }, { data: listing }] = await Promise.all([
      db
        .from("rent_payments")
        .select("move_in, rent_period")
        .eq("booking_id", booking.id)
        .maybeSingle(),
      db.from("listings").select("title").eq("id", booking.listing_id).maybeSingle(),
    ]);

    /* No title, no row. A listing that has come down leaves the receipt
       saying what it always said rather than linking to nothing. */
    if (!listing?.title) return null;

    if (charge) {
      return {
        listingId: booking.listing_id,
        title: listing.title,
        when: label(charge.move_in),
        period: RENT_PERIOD_LABEL[charge.rent_period as RentPeriod] ?? null,
        kind: "tenancy",
      };
    }

    return {
      listingId: booking.listing_id,
      title: listing.title,
      when: `${label(booking.check_in)} to ${label(booking.check_out)}`,
      period: null,
      kind: "stay",
    };
  } catch {
    /* A receipt without its context row is the receipt we already had. */
    return null;
  }
}
