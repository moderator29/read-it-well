import "server-only";

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import type { StateEvent } from "@/components/app/threads/booking-steps";

/**
 * A booking's step events, oldest first, for its status track.
 *
 * The same read the thread's booking face makes (`lib/messages/live.ts`), on
 * the signed-in reader's own RLS-bound client, so a booking detail page and
 * the thread about it date their steps from the same rows. A read that fails
 * answers an empty list: the track then shows the steps with no times, which
 * is true (we do not know them) rather than invented.
 */
export async function readBookingStateEvents(bookingId: string): Promise<StateEvent[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("booking_state_events")
      .select("created_at, to_status")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true })
      .limit(50);
    if (error || !data) return [];
    return data.map((row) => ({ at: row.created_at, to: row.to_status }));
  } catch {
    return [];
  }
}
