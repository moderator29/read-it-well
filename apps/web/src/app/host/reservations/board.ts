import "server-only";

/**
 * The venue owner's table board, read.
 *
 * `getHostReservations` in `lib/reservations/queries.ts` is the reader this
 * surface needs and it had no caller at all: it leans on RLS alone and handles
 * BOTH spines, the listing-agent one and the business-owner one, which is
 * exactly what a restaurant owner onboarded through the host wizard needs. A
 * host like that has a `businesses` row and no `agents` row, so `/agent/bookings`
 * (behind `getAgentContext`) is shut to them and they could be sent a table
 * with nowhere to accept it. This file adds two things to that reader and
 * nothing else: the guest's name, and the three groups a service is worked in.
 *
 * ---------------------------------------------------------------------------
 * THE GUEST'S NAME, AND WHY IT IS RESOLVED WITH THE SERVICE ROLE.
 *
 * The reader's author left the choice open with a note: `profiles` is
 * select-own by policy, so a name read through the caller's own client comes
 * back empty and every card would read "A guest" unless the surface resolves
 * it the way `lib/agent/reservations-queries.ts` does. It is resolved.
 *
 * A venue owner needs the name. It is what they greet somebody with at the
 * door, what they match a telephone call against, and what they write on the
 * book beside the table. A board that says "A guest" six times for tonight is
 * not a reservations desk, it is a list of numbers, and the same person on the
 * agent spine already sees the name for the identical row.
 *
 * It is not a widening of who may see what, and the shape is what keeps it
 * honest:
 *
 *   1. The reservations come back through the CALLER'S OWN RLS-bound client.
 *      The policy has already decided that this person may see these rows.
 *   2. The service role is then asked ONLY for the ids on rows RLS handed
 *      back, never for a set this caller did not already hold.
 *   3. It reads `display_name` and nothing else. Not an email, not a phone
 *      number, not a date of birth. `display_name` is the public projection
 *      of a person and is already shown beside their messages.
 *   4. Without the service key, or if that read fails, every card falls back
 *      to a plain word. A board that loads under a generic label is far better
 *      than a board that will not load.
 *
 * Nothing here writes, and nothing here is logged.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getHostReservations,
  type HostReservationView,
  type ReservationsRead,
} from "@/lib/reservations/queries";

/** Enough of a name to address somebody by, when there is no other answer. */
const FALLBACK_GUEST_NAME = "Vallo guest";

export type HostTableBoard = {
  /** PENDING and still ahead. The only group carrying a decision. */
  requests: HostReservationView[];
  /** CONFIRMED and still ahead, soonest first. Tonight's list. */
  upcoming: HostReservationView[];
  /** Everything whose moment has gone, plus anything cancelled. */
  past: HostReservationView[];
  total: number;
};

export const EMPTY_TABLE_BOARD: HostTableBoard = {
  requests: [],
  upcoming: [],
  past: [],
  total: 0,
};

/** Display names for ids RLS has already authorised. See the header. */
async function guestNames(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (ids.length === 0) return names;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("profiles").select("id, display_name").in("id", ids);
    for (const row of data ?? []) {
      const name = (row.display_name ?? "").trim();
      if (name.length > 0) names.set(row.id, name);
    }
  } catch {
    // The fallback label is the designed state, not an error.
  }
  return names;
}

export type HostBoardRead =
  | { state: "signed-out" }
  | { state: "unavailable" }
  | { state: "ok"; board: HostTableBoard };

/**
 * Every table at every venue this person hosts, in three groups.
 *
 * A PENDING request whose moment has already passed is filed under `past`
 * rather than left in the decision queue, which is the whole point of the
 * split: somebody opening this at nine in the evening should see the tables
 * still ahead of them, not last Tuesday's unanswered request at the top of a
 * list of things to do. The same rule the agent board follows, so a host who
 * has both surfaces is not asked to learn two consoles.
 */
export async function readHostTableBoard(now: Date = new Date()): Promise<HostBoardRead> {
  const rows: ReservationsRead<HostReservationView> = await getHostReservations(now);
  if (rows === null) return { state: "signed-out" };
  if (rows === "unavailable") return { state: "unavailable" };
  if (rows.length === 0) return { state: "ok", board: EMPTY_TABLE_BOARD };

  const names = await guestNames([...new Set(rows.map((row) => row.guestId))]);
  const named = rows.map((row) => ({
    ...row,
    guestName: names.get(row.guestId) ?? FALLBACK_GUEST_NAME,
  }));

  const instant = now.getTime();
  const past = (row: HostReservationView) => {
    const at = Date.parse(row.reservedFor);
    return Number.isFinite(at) ? at <= instant : true;
  };

  return {
    state: "ok",
    board: {
      requests: named.filter((row) => row.status === "PENDING" && !past(row)),
      upcoming: named.filter((row) => row.status === "CONFIRMED" && !past(row)),
      past: named
        .filter((row) => row.status === "CANCELLED" || past(row))
        .sort((a, b) => b.reservedFor.localeCompare(a.reservedFor)),
      total: named.length,
    },
  };
}
