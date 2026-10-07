import { resolveSession } from "@/lib/actions/session";
import { rangeFloor, type RangeRow } from "@/components/workspace/range-buckets";

/**
 * THE HOST CONSOLE FIGURE'S ROWS: every room booking made at this host's own
 * places in the last thirty days, by when it was made.
 *
 * Scoped by ownership, not by whatever the bookings policy lets the session
 * see: the businesses this member owns, their accommodations, then the
 * bookings at those. A member who has also booked a stay as a guest must not
 * see their own trip counted as business. One column over exactly the window
 * the figure shows.
 *
 * Null when any read fails, or when the window reaches the API's thousand-row
 * ceiling (a short count is a wrong number): the card is then not drawn.
 * An empty array is an honest nought, drawn as the empty range.
 */
const CEILING = 1000;

export async function readHostBookingSeries(now: Date): Promise<RangeRow[] | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const db = session.supabase;
  try {
    const owned = await db.from("businesses").select("id").eq("owner_id", session.user.id);
    if (owned.error) return null;
    const businessIds = (owned.data ?? []).map((row) => row.id as string);
    if (businessIds.length === 0) return [];
    const places = await db.from("accommodations").select("id").in("business_id", businessIds);
    if (places.error) return null;
    const placeIds = (places.data ?? []).map((row) => row.id as string);
    if (placeIds.length === 0) return [];
    const { data, error } = await db
      .from("bookings")
      .select("created_at")
      .in("accommodation_id", placeIds)
      .gte("created_at", rangeFloor(now))
      .limit(CEILING);
    if (error || (data?.length ?? 0) >= CEILING) return null;
    return ((data ?? []) as { created_at: string }[]).map((row) => ({ at: row.created_at }));
  } catch {
    return null;
  }
}
