import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";

/**
 * Where a card payment comes back to.
 *
 * A stay pays on `/checkout/<bookingId>` and returns there with `?paid=1` and
 * the `rm-book-` reference, where `PaymentReturn` verifies and settles it. A
 * rent charge rides the very same booking rails (the b3 design: one money
 * spine, never two) but the person paying it has never seen a checkout page;
 * they are on `/rent/pay/<inspectionId>`, and a hosted card page that sent
 * them back to a stay checkout for a booking they cannot recognise would be
 * the one place the two journeys leaked into each other. So the callback is
 * decided here, once, from the only fact that tells the two apart: whether a
 * `rent_payments` row carries this booking.
 *
 * The lookup runs on the service-role client the checkout already holds, so
 * it costs one indexed read and no second session. It never throws: a read
 * that fails answers the stay path, which is the older, always-valid return,
 * rather than a payment page that cannot open.
 */

type AdminClient = SupabaseClient<Database>;

/** The path (no origin) a hosted checkout returns to. Pure. */
export function paymentReturnPath(args: {
  bookingId: string;
  inspectionId: string | null;
  reference: string;
}): string {
  const query = `?paid=1&reference=${encodeURIComponent(args.reference)}`;
  if (args.inspectionId) return `/rent/pay/${args.inspectionId}${query}`;
  return `/checkout/${args.bookingId}${query}`;
}

/** The inspection behind a booking when the booking is a rent charge, else null. */
export async function rentInspectionForBooking(
  admin: AdminClient,
  bookingId: string,
): Promise<string | null> {
  try {
    const { data, error } = await admin
      .from("rent_payments")
      .select("inspection_id")
      .eq("booking_id", bookingId)
      .maybeSingle();
    if (error || !data) return null;
    return data.inspection_id;
  } catch {
    return null;
  }
}

/** The return path for this booking, rent or stay, decided by the database. */
export async function checkoutReturnPath(
  admin: AdminClient,
  bookingId: string,
  reference: string,
): Promise<string> {
  const inspectionId = await rentInspectionForBooking(admin, bookingId);
  return paymentReturnPath({ bookingId, inspectionId, reference });
}
