import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";

/**
 * ROOM BOOKINGS 1: the words for what a booking is for. A listing stay is
 * named by its listing; a hotel room by its hotel. Read with whichever client
 * the caller already holds; a failed read is the fallback, never an error.
 */
export async function stayTitle(
  db: SupabaseClient<Database>,
  booking: { listing_id: string | null; accommodation_id?: string | null },
  fallback = "your stay",
): Promise<string> {
  try {
    if (booking.listing_id) {
      const { data } = await db.from("listings").select("title").eq("id", booking.listing_id).maybeSingle();
      return (data?.title ?? "").trim() || fallback;
    }
    if (booking.accommodation_id) {
      const { data } = await db.from("accommodations").select("name").eq("id", booking.accommodation_id).maybeSingle();
      return (data?.name ?? "").trim() || fallback;
    }
  } catch {
    /* the fallback */
  }
  return fallback;
}
