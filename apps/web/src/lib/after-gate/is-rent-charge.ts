import "server-only";

import { resolveSession } from "../actions/session";

/**
 * True when a bookings row carries a rent charge (a `rent_payments` row points
 * at it). A tenancy is settled in its own agreement, so no stay cancellation
 * terms are ever printed against it. Read under the caller's own RLS; a read
 * that fails answers false, which prints the platform line exactly as before.
 */
export async function isRentChargeBooking(bookingId: string): Promise<boolean> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return false;
  try {
    const { data, error } = await session.supabase
      .from("rent_payments")
      .select("id")
      .eq("booking_id", bookingId)
      .limit(1);
    return !error && (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}
