import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";

/**
 * Is this booking a rent charge rather than a stay?
 *
 * The b3 design puts the rent money on a `bookings` row so that every rail
 * (wallet, card, webhook, ledger, reconciliation, the agent's earnings) is
 * the one that already exists, and says in its header that "every reader in
 * the product branches on that row rather than on the night count". This is
 * the reader. The database notifier already speaks tenancy words on the row
 * ("Rent paid", never "Booking confirmed"); the application's own mail has to
 * make the same distinction, and it makes it here.
 *
 * Never throws. A read that fails answers false, so the caller behaves as it
 * always did for a stay: the safe failure for a confirmation is a mail that
 * goes, not one that is silently lost.
 */
export async function isRentBooking(
  admin: SupabaseClient<Database>,
  bookingId: string,
): Promise<boolean> {
  try {
    const { data, error } = await admin
      .from("rent_payments")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();
    if (error) return false;
    return data !== null;
  } catch {
    return false;
  }
}
