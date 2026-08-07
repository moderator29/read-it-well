import "server-only";

/**
 * The restaurant's side of the reservations loop, read.
 *
 * Shaped deliberately like `bookings-queries.ts` next door, because it is the
 * same job for a different product and a host should not have to learn two
 * consoles. The rows come back through the caller's own RLS-bound client:
 * `reservations_select_host` already says "the agent whose restaurant this is
 * may read it", so this file never restates that rule and cannot drift from it.
 *
 * The one thing the caller's own client cannot see is the guest's name.
 * `profiles` is select-own by policy, so it is resolved afterwards with the
 * service role and strictly for rows RLS has already handed us, which is the
 * same treatment the messaging surfaces and the bookings board give a
 * counterpart. Without the service key the cards read under a generic label
 * rather than failing.
 *
 * Nothing here writes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { createAdminClient } from "../supabase/admin";
import type { AgentContext } from "./listings-queries";

type Db = SupabaseClient<Database>;

export type ReservationStatus = Database["public"]["Enums"]["booking_status"];

/** One reservation as the restaurant needs to see it. */
export type HostReservation = {
  id: string;
  listingId: string;
  listingTitle: string;
  guestName: string;
  /** The instant the table is for, ISO. Rendered in Lagos by the component. */
  reservedFor: string;
  partySize: number;
  /** Allergies, a birthday, a wheelchair. Null when they said nothing. */
  note: string | null;
  status: ReservationStatus;
  createdAt: string;
  /** Whole hours since the request arrived, floored, never negative. */
  hoursWaiting: number;
  /** True once the table's own time has passed, whatever its status. */
  past: boolean;
};

export type HostReservationBoard = {
  /** PENDING and still ahead. The only group carrying a decision. Soonest first. */
  requests: HostReservation[];
  /** CONFIRMED and still ahead. Soonest first: this is tonight's list. */
  upcoming: HostReservation[];
  /**
   * Everything whose moment has passed, plus anything cancelled. Most recent
   * first. A PENDING request whose time went by belongs here rather than in
   * the decision queue, because there is nothing left to decide.
   */
  past: HostReservation[];
  total: number;
};

export const EMPTY_RESERVATION_BOARD: HostReservationBoard = {
  requests: [],
  upcoming: [],
  past: [],
  total: 0,
};

/** Enough of a name to address somebody by, when the service key is absent. */
const FALLBACK_GUEST_NAME = "RentMe guest";
const FALLBACK_LISTING_TITLE = "Your restaurant";

/** A console shows work, not an archive. */
const MAX_ROWS = 300;

const RESERVATION_SELECT =
  "id, listing_id, guest_id, party_size, reserved_for, note, status, created_at, " +
  "listings!inner(id, title, agent_id)";

type ReservationRow = {
  id: string;
  listing_id: string;
  guest_id: string;
  party_size: number;
  reserved_for: string;
  note: string | null;
  status: ReservationStatus;
  created_at: string;
  listings: { id: string; title: string; agent_id: string } | null;
};

/**
 * Display names for a set of guest ids, or an empty map.
 *
 * Service role, and only ever for ids that came back from a query RLS already
 * authorised. Absent key, unreachable database and a thrown query all resolve
 * to no names rather than to an error, because a board that lists tonight's
 * tables under a generic label is far better than a board that will not load.
 */
async function guestNames(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (ids.length === 0) return names;
  try {
    const admin = createAdminClient();
    if (!admin) return names;
    const { data } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", ids);
    for (const row of data ?? []) {
      const name = (row as { id: string; display_name: string | null }).display_name;
      if (name && name.length > 0) names.set((row as { id: string }).id, name);
    }
  } catch {
    // Nothing to do. The fallback label is the designed state.
  }
  return names;
}

function hoursSince(iso: string, now: number): number {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, Math.floor((now - then) / 3_600_000));
}

/**
 * Every reservation at this agent's restaurants, sorted into a board.
 *
 * A PENDING request whose moment has already passed is filed under `past`
 * rather than left in the decision queue. That is the point of the split: a
 * restaurant opening the console at nine in the evening should see the tables
 * still ahead of them, not last Tuesday's unanswered request sitting at the top
 * of a list of things to do.
 */
export async function readHostReservations(
  context: AgentContext,
): Promise<HostReservationBoard> {
  if (context.state !== "agent") return EMPTY_RESERVATION_BOARD;

  const supabase = context.supabase as Db;
  let rows: ReservationRow[] = [];
  try {
    const { data, error } = await supabase
      .from("reservations")
      .select(RESERVATION_SELECT)
      .order("reserved_for", { ascending: true })
      .limit(MAX_ROWS);
    if (error) return EMPTY_RESERVATION_BOARD;
    rows = (data ?? []) as unknown as ReservationRow[];
  } catch {
    return EMPTY_RESERVATION_BOARD;
  }
  if (rows.length === 0) return EMPTY_RESERVATION_BOARD;

  const names = await guestNames([...new Set(rows.map((row) => row.guest_id))]);
  const now = Date.now();

  const all: HostReservation[] = rows.map((row) => {
    const at = new Date(row.reserved_for).getTime();
    return {
      id: row.id,
      listingId: row.listing_id,
      listingTitle: row.listings?.title ?? FALLBACK_LISTING_TITLE,
      guestName: names.get(row.guest_id) ?? FALLBACK_GUEST_NAME,
      reservedFor: row.reserved_for,
      partySize: row.party_size,
      note: row.note,
      status: row.status,
      createdAt: row.created_at,
      hoursWaiting: hoursSince(row.created_at, now),
      past: Number.isFinite(at) ? at <= now : true,
    };
  });

  const requests = all.filter((r) => r.status === "PENDING" && !r.past);
  const upcoming = all.filter((r) => r.status === "CONFIRMED" && !r.past);
  const past = all
    .filter((r) => r.status === "CANCELLED" || r.past)
    .sort((a, b) => b.reservedFor.localeCompare(a.reservedFor));

  return { requests, upcoming, past, total: all.length };
}
