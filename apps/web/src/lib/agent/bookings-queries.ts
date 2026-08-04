import "server-only";

/**
 * The host's side of the bookings loop, read.
 *
 * The bookings themselves come back through the caller's own RLS-bound client:
 * bookings_host_select already says "the agent whose listing this is may read
 * it", so this file never restates that rule and cannot drift from it. What the
 * caller's own client genuinely cannot see is resolved afterwards, with the
 * service role, strictly for rows RLS has already handed us:
 *
 *   - profiles is select-own by policy, so the guest's display name needs the
 *     same treatment the messaging surfaces give a counterpart (lib/messages/
 *     live.ts). Without the service key the cards read under a generic label.
 *   - transactions has a guest policy and an admin policy and no host policy,
 *     so "has this payment settled" is not a question a host's own client can
 *     ask. A settled charge does also write ledger_entries, which the host may
 *     read (ledger_host_select), so that is checked first and needs nothing
 *     privileged. When neither source can answer, the view says so rather than
 *     showing an unpaid stay as paid or a paid stay as unpaid.
 *
 * All money stays integer kobo. Nothing here writes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { createAdminClient } from "../supabase/admin";
import type { AgentContext } from "./listings-queries";
import { HOLD_WINDOW_HOURS } from "./bookings-schema";

type Db = SupabaseClient<Database>;

export type BookingStatus = Database["public"]["Enums"]["booking_status"];

/**
 * What we can honestly say about the money on a booking.
 *
 * "unknown" is a real answer, not a failure: it means neither the ledger nor
 * the processor record could be read, so the console must not claim either way.
 */
export type SettlementState = "settled" | "awaiting" | "unknown";

/** One booking as the host needs to see it. Money is integer kobo. */
export type HostBooking = {
  id: string;
  listingId: string;
  listingTitle: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  /** Adults plus children, the single number a host reads first. */
  guests: number;
  totalMinor: number;
  /**
   * The person who will actually turn up, when the booker paid for somebody
   * else. Null means the booker is the guest. The host needs this to let the
   * right person through a gate, and it is a safety fact before it is a
   * convenience one.
   */
  arrivingName: string | null;
  /** Their number, so the security desk has somebody to ring. */
  arrivingPhone: string | null;
  status: BookingStatus;
  settlement: SettlementState;
  createdAt: string;
  /** Whole hours since the request arrived, floored, never negative. */
  hoursWaiting: number;
  /**
   * Whole hours left on the 48 hour hold, floored at zero. Null for anything
   * that is no longer waiting on a decision.
   */
  holdHoursLeft: number | null;
};

export type HostBookingBoard = {
  /** PENDING: the only group that carries a decision. Longest wait first. */
  requests: HostBooking[];
  /** CONFIRMED and not yet checked out. Soonest arrival first. */
  upcoming: HostBooking[];
  /** CONFIRMED and checked out. Most recent first. */
  completed: HostBooking[];
  /** CANCELLED, whoever ended it. Most recent request first. */
  cancelled: HostBooking[];
  total: number;
};

/** Enough of a name to address someone by, when the service key is absent. */
const FALLBACK_GUEST_NAME = "RentMe guest";

/** A listing whose title we could not read alongside the booking. */
const FALLBACK_LISTING_TITLE = "Your listing";

/** Newest first, and bounded: a console shows work, not an archive. */
const MAX_ROWS = 300;

const BOOKING_SELECT =
  "id, listing_id, guest_id, check_in, check_out, nights, adults, children, " +
  "total_minor, status, created_at, guest_name, guest_phone, " +
  "listings!inner(id, title, agent_id)";

type BookingRow = {
  id: string;
  listing_id: string;
  guest_id: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  total_minor: number;
  status: BookingStatus;
  created_at: string;
  guest_name: string | null;
  guest_phone: string | null;
  listings: { id: string; title: string } | null;
};

/** Today in Lagos as an ISO date, so "upcoming" means the same to everyone. */
function lagosToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
}

/** Whole hours between an ISO timestamp and now, floored, never negative. */
function hoursSince(iso: string, now: number): number {
  const started = Date.parse(iso);
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((now - started) / 3_600_000));
}

/**
 * Guest display names for ids RLS has already cleared.
 *
 * Fails soft to an empty map: a missing service key costs the cards a name,
 * never the whole console.
 */
async function guestNames(userIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return names;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("profiles").select("id, display_name").in("id", ids);
    for (const row of data ?? []) {
      const name = (row.display_name ?? "").trim();
      if (name.length > 0) names.set(row.id, name);
    }
  } catch {
    // No service key yet: the generic label carries the surface.
  }
  return names;
}

/**
 * Which of these bookings have money that has actually settled.
 *
 * Two sources, in order of privilege. The ledger is readable by the host under
 * ledger_host_select and an entry only exists for a settled charge, so it is a
 * positive signal that costs nothing. The processor record is authoritative but
 * needs the service role. `authoritative` says whether the absence of a booking
 * from the set means "not settled" or only "we could not tell".
 */
async function settledBookings(
  supabase: Db,
  bookingIds: string[],
): Promise<{ settled: Set<string>; authoritative: boolean }> {
  const settled = new Set<string>();
  if (bookingIds.length === 0) return { settled, authoritative: true };

  const { data: ledger } = await supabase
    .from("ledger_entries")
    .select("booking_id")
    .in("booking_id", bookingIds);
  for (const row of ledger ?? []) settled.add(row.booking_id);

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("transactions")
      .select("booking_id")
      .in("booking_id", bookingIds)
      .eq("status", "SUCCESSFUL");
    if (error) return { settled, authoritative: false };
    for (const row of data ?? []) settled.add(row.booking_id);
    return { settled, authoritative: true };
  } catch {
    return { settled, authoritative: false };
  }
}

function group(bookings: HostBooking[]): HostBookingBoard {
  const today = lagosToday();

  const requests = bookings
    .filter((b) => b.status === "PENDING")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");

  const upcoming = confirmed
    .filter((b) => b.checkOut >= today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  const completed = confirmed
    .filter((b) => b.checkOut < today)
    .sort((a, b) => b.checkIn.localeCompare(a.checkIn));

  const cancelled = bookings
    .filter((b) => b.status === "CANCELLED")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    requests,
    upcoming,
    completed,
    cancelled,
    total: bookings.length,
  };
}

/**
 * Every booking against the caller's listings, grouped by what it needs.
 *
 * Null means the question does not apply to this visitor: Supabase is not
 * configured, nobody is signed in, or the signed-in person holds no agents row.
 * The page keeps its own designed rendering for those three, exactly as the
 * listings workspace does, rather than showing an empty console that reads as a
 * broken one.
 */
export async function readHostBookings(context: AgentContext): Promise<HostBookingBoard | null> {
  if (context.state !== "agent") return null;

  const { data, error } = await context.supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("listings.agent_id", context.agent.id)
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  if (error || !data) {
    return { requests: [], upcoming: [], completed: [], cancelled: [], total: 0 };
  }

  const rows = data as unknown as BookingRow[];
  if (rows.length === 0) {
    return { requests: [], upcoming: [], completed: [], cancelled: [], total: 0 };
  }

  const [names, settlement] = await Promise.all([
    guestNames(rows.map((row) => row.guest_id)),
    settledBookings(
      context.supabase,
      rows.map((row) => row.id),
    ),
  ]);

  const now = Date.now();

  const bookings: HostBooking[] = rows.map((row) => {
    const hoursWaiting = hoursSince(row.created_at, now);
    const title = (row.listings?.title ?? "").trim();
    return {
      id: row.id,
      listingId: row.listing_id,
      listingTitle: title.length > 0 ? title : FALLBACK_LISTING_TITLE,
      guestName: names.get(row.guest_id) ?? FALLBACK_GUEST_NAME,
      checkIn: row.check_in,
      checkOut: row.check_out,
      nights: row.nights,
      adults: row.adults,
      children: row.children,
      guests: row.adults + row.children,
      totalMinor: row.total_minor,
      arrivingName: (row.guest_name ?? "").trim() || null,
      arrivingPhone: (row.guest_phone ?? "").trim() || null,
      status: row.status,
      settlement: settlement.settled.has(row.id)
        ? "settled"
        : settlement.authoritative
          ? "awaiting"
          : "unknown",
      createdAt: row.created_at,
      hoursWaiting,
      holdHoursLeft:
        row.status === "PENDING" ? Math.max(0, HOLD_WINDOW_HOURS - hoursWaiting) : null,
    };
  });

  return group(bookings);
}
