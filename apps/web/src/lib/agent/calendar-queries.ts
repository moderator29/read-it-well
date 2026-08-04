import "server-only";

import { getAgentContext } from "./listings-queries";
import { lagosToday } from "./calendar-schema";

/**
 * Read side of the agent calendar.
 *
 * Rows come back through the agent's own RLS-bound client. availability_select
 * is world-readable for a published listing, so the guard that matters is the
 * listing lookup: a listing that is not this agent's does not come back, and
 * without it the surface answers "missing" rather than showing another host's
 * calendar.
 */

export type CalendarNight = {
  date: string;
  /** `booked` comes from a real stay and cannot be edited here. */
  status: "booked" | "unavailable";
};

export type CalendarSubject = {
  listingId: string;
  title: string;
  /** Today in Lagos, so the grid and the server agree on what is past. */
  today: string;
};

export type CalendarRead =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "not-agent" }
  | { state: "missing" }
  | { state: "unavailable" }
  | { state: "ready"; subject: CalendarSubject; nights: CalendarNight[] };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getListingCalendar(listingId: string): Promise<CalendarRead> {
  if (!UUID_RE.test(listingId)) return { state: "missing" };

  const context = await getAgentContext();
  if (context.state === "unconfigured") return { state: "unconfigured" };
  if (context.state === "signed-out") return { state: "signed-out" };
  if (context.state === "not-agent") return { state: "not-agent" };

  try {
    // Ownership is proven by reading the listing under the agent's own client
    // and matching it to their agent row, never by trusting the URL.
    const { data: listing, error } = await context.supabase
      .from("listings")
      .select("id, title, agent_id")
      .eq("id", listingId)
      .maybeSingle();

    if (error) return { state: "unavailable" };
    if (!listing || listing.agent_id !== context.agent.id) return { state: "missing" };

    const today = lagosToday();
    const { data: rows, error: nightsError } = await context.supabase
      .from("availability")
      .select("date, status")
      .eq("listing_id", listingId)
      .gte("date", today)
      .in("status", ["booked", "unavailable"])
      .order("date", { ascending: true })
      .limit(800);

    if (nightsError) return { state: "unavailable" };

    const nights: CalendarNight[] = (rows ?? []).map((row) => ({
      date: row.date,
      status: row.status === "booked" ? "booked" : "unavailable",
    }));

    return {
      state: "ready",
      subject: { listingId: listing.id, title: listing.title, today },
      nights,
    };
  } catch {
    return { state: "unavailable" };
  }
}
