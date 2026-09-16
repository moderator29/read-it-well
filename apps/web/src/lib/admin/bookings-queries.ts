import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "../supabase/database.types";
import { lagosToday } from "../bookings/schema";
import { requireAdmin } from "./guard";
import type { AdminRead } from "./queries";

/**
 * The console's view of a stay.
 *
 * `bookings` has carried an admin write policy since the first RLS pass and had
 * no screen behind it, which meant /cancellations was publishing a promise the
 * platform could not keep: it told a guest that a person at support cancels a
 * paid stay and returns the money, and there was no surface on which any person
 * could do it. This module is the reading half of closing that.
 *
 * Reads go through the service role, but only after requireAdmin has passed
 * inside this module, exactly as `queries.ts` does it. Nothing here is a count
 * of rows a policy would have hidden: the console sees every stay, which is the
 * point of a support desk.
 *
 * Every figure is integer kobo and is read, never derived from a percentage.
 * `paidMinor` is the sum of SUCCESSFUL transactions, which is the same number
 * the refund function bounds itself against inside the database, so the screen
 * and the money agree by construction rather than by care.
 */

const UNAVAILABLE = { state: "unavailable" } as const;

/** How many stays one bucket shows before it stops. A support desk, not an export. */
const BUCKET_LIMIT = 40;

type Db = SupabaseClient<Database>;

async function adminClient(): Promise<Db | null> {
  const access = await requireAdmin();
  if (access.state !== "admin") return null;
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

export type BookingStatus = Database["public"]["Enums"]["booking_status"];

/**
 * `public.booking_status`, in lifecycle order, read from the generated enum.
 *
 * ---------------------------------------------------------------------------
 * ONE LIST, AND IT IS ORDERED BY THE LIFE OF A STAY RATHER THAN ALPHABETICALLY.
 *
 * The console's filter chips used to be a hand-written array of three literals
 * on the bookings page, with a comment asserting the enum had three values. The
 * enum now has five, and a hand-written list is exactly the thing that does not
 * find out. This is typed as `readonly BookingStatus[]`, so the day a sixth
 * value is added the compiler has nothing to say, but the list cannot hold a
 * value the column would refuse, which is the failure that actually reaches an
 * operator: a chip that returns nothing whatever they click.
 *
 * The order is PENDING, CONFIRMED, COMPLETED, NO_SHOW, CANCELLED, which is the
 * order the enum itself is declared in and the order a stay actually moves
 * through. Sorting these alphabetically would put CANCELLED first and COMPLETED
 * second, which reads as a ranking of outcomes rather than a sequence.
 */
export const BOOKING_STATUSES: readonly BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
];

/**
 * A status from a URL, or nothing.
 *
 * `?status=` is hand-editable, and the difference between an unrecognised value
 * and no value matters: passing an unknown string through to `.eq()` returns an
 * empty board, which an operator reads as "there are no stays" rather than as
 * "you typed something that is not a status". Dropped here instead, so the
 * queue answers with everything and the chip simply shows as unselected.
 */
export function asBookingStatus(value: string | undefined): BookingStatus | undefined {
  return BOOKING_STATUSES.find((status) => status === value);
}

/**
 * How a Lagos calendar day maps onto a `timestamptz`.
 *
 * `created_at` is an instant; the operator typed a date. A naive `.gte("2026-09-16")`
 * is read by Postgres as UTC midnight, which is 01:00 in Lagos, so a stay booked
 * at half past midnight Lagos time would silently fall out of the range the
 * operator asked for. Everything else in this console is anchored to Lagos, and
 * so is this.
 */
function lagosDayStart(day: string): string {
  return `${day}T00:00:00+01:00`;
}

function lagosDayEnd(day: string): string {
  return `${day}T23:59:59.999+01:00`;
}

/** One stay as the list shows it. */
export type AdminBookingRow = {
  id: string;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  currency: string;
  totalMinor: number;
  /** What actually settled, in kobo. Zero means nobody has paid yet. */
  paidMinor: number;
  /** What has already gone back to the guest across every refund on this stay. */
  refundedMinor: number;
  listingId: string;
  listingTitle: string;
  area: string | null;
  city: string | null;
  agentName: string | null;
  guestId: string;
  guestName: string | null;
  /** The person arriving, when the payer named somebody else. */
  arrivingName: string | null;
  createdAt: string;
};

export type AdminBookingBoard = {
  /** Not cancelled, and the last night has not passed. The stays support acts on. */
  live: AdminBookingRow[];
  /** Not cancelled, already over. */
  past: AdminBookingRow[];
  cancelled: AdminBookingRow[];
  /** True when a search term was applied, so an empty board reads correctly. */
  searched: boolean;
};

type BookingSelect = {
  id: string;
  listing_id: string;
  guest_id: string;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  currency: string;
  total_minor: number;
  status: BookingStatus;
  guest_name: string | null;
  created_at: string;
};

const BOOKING_COLUMNS =
  "id, listing_id, guest_id, check_in, check_out, nights, adults, children, currency, total_minor, status, guest_name, created_at";

/** Money already settled against each of these bookings, in kobo. */
async function paidByBooking(db: Db, bookingIds: string[]): Promise<Map<string, number>> {
  const paid = new Map<string, number>();
  if (bookingIds.length === 0) return paid;
  const { data } = await db
    .from("transactions")
    .select("booking_id, amount_minor")
    .in("booking_id", bookingIds)
    .eq("status", "SUCCESSFUL");
  for (const row of data ?? []) {
    paid.set(row.booking_id, (paid.get(row.booking_id) ?? 0) + row.amount_minor);
  }
  return paid;
}

/** Money already returned against each of these bookings, in kobo. */
async function refundedByBooking(db: Db, bookingIds: string[]): Promise<Map<string, number>> {
  const refunded = new Map<string, number>();
  if (bookingIds.length === 0) return refunded;
  const { data } = await db
    .from("booking_refunds")
    .select("booking_id, refund_minor")
    .in("booking_id", bookingIds);
  for (const row of data ?? []) {
    refunded.set(row.booking_id, (refunded.get(row.booking_id) ?? 0) + row.refund_minor);
  }
  return refunded;
}

/** Display names for a set of people, from profiles. Missing means unnamed. */
async function namesFor(db: Db, userIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const wanted = [...new Set(userIds.filter((id) => id.length > 0))];
  if (wanted.length === 0) return names;
  const { data } = await db.from("profiles").select("id, display_name").in("id", wanted);
  for (const row of data ?? []) {
    const name = (row.display_name ?? "").trim();
    if (name.length > 0) names.set(row.id, name);
  }
  return names;
}

type ListingFacts = {
  title: string;
  area: string | null;
  city: string | null;
  agentName: string | null;
};

async function listingsFor(db: Db, listingIds: string[]): Promise<Map<string, ListingFacts>> {
  const listings = new Map<string, ListingFacts>();
  const wanted = [...new Set(listingIds)];
  if (wanted.length === 0) return listings;
  const { data } = await db
    .from("listings")
    .select("id, title, area, city, agents(display_name)")
    .in("id", wanted);
  for (const row of data ?? []) {
    const agent = row.agents as { display_name?: string | null } | null;
    listings.set(row.id, {
      title: row.title,
      area: row.area,
      city: row.city,
      agentName: agent?.display_name ?? null,
    });
  }
  return listings;
}

/** Turn the raw rows into list rows, filling in listing, guest and money. */
async function decorate(db: Db, rows: BookingSelect[]): Promise<AdminBookingRow[]> {
  const [paid, refunded, listings, names] = await Promise.all([
    paidByBooking(db, rows.map((row) => row.id)),
    refundedByBooking(db, rows.map((row) => row.id)),
    listingsFor(db, rows.map((row) => row.listing_id)),
    namesFor(db, rows.map((row) => row.guest_id)),
  ]);

  return rows.map((row) => {
    const listing = listings.get(row.listing_id);
    return {
      id: row.id,
      status: row.status,
      checkIn: row.check_in,
      checkOut: row.check_out,
      nights: row.nights,
      adults: row.adults,
      children: row.children,
      currency: row.currency,
      totalMinor: row.total_minor,
      paidMinor: paid.get(row.id) ?? 0,
      refundedMinor: refunded.get(row.id) ?? 0,
      listingId: row.listing_id,
      listingTitle: listing?.title ?? "This listing is no longer there",
      area: listing?.area ?? null,
      city: listing?.city ?? null,
      agentName: listing?.agentName ?? null,
      guestId: row.guest_id,
      guestName: names.get(row.guest_id) ?? null,
      arrivingName: row.guest_name,
      createdAt: row.created_at,
    };
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Everything the console can narrow this board by. All of it optional. */
export type BookingBoardFilter = {
  /** A whole booking id, or part of a listing title. */
  q?: string;
  /** One value of `booking_status`. Anything else is ignored, not obeyed. */
  status?: string;
  /** Lagos calendar days, inclusive, against `created_at`. */
  from?: string;
  to?: string;
};

/**
 * The board, optionally narrowed.
 *
 * The search takes either a whole booking id, which is what a guest quotes in a
 * message, or part of a listing title. Anything else returns an empty board
 * rather than the unfiltered one, because a support desk that silently ignores
 * the thing you typed is worse than one that says it found nothing.
 *
 * ---------------------------------------------------------------------------
 * THE NARROWING IS IN THE QUERY NOW, NOT OVER THE ROWS IT RETURNED.
 *
 * The status chip and the date range were applied on the page, with
 * `rows.filter(...)`, over whatever the unfiltered read had already returned.
 * At zero rows that is indistinguishable from filtering properly, which is why
 * it survived. It is wrong in a way that gets worse exactly as the console gets
 * busier: the read is capped at `BUCKET_LIMIT * 3`, so once there are more
 * stays than the cap, filtering afterwards searches only the most recent 120
 * and quietly reports that the older ones do not exist. An operator asked
 * "show me every cancelled stay in August" would be shown some of them, with
 * nothing on screen saying so.
 *
 * `.eq()` and `.gte()`/`.lte()` push all of it into Postgres, so the cap now
 * applies to the rows that matched rather than to the rows that were read.
 * The bucketing by date stays in TypeScript, because "live" and "past" are a
 * comparison against today rather than a predicate on a column.
 */
export async function getBookingBoard(
  filter?: BookingBoardFilter,
): Promise<AdminRead<AdminBookingBoard>> {
  const db = await adminClient();
  if (!db) return UNAVAILABLE;

  const term = (filter?.q ?? "").trim();
  const status = asBookingStatus(filter?.status);
  const from = filter?.from;
  const to = filter?.to;
  /* `searched` drives the empty copy, and a date range or a status is just as
     much a narrowing as a term is: an empty board under a chip means "nothing
     matched", not "nothing has ever arrived". */
  const narrowed = term.length > 0 || Boolean(status) || Boolean(from) || Boolean(to);

  try {
    let listingMatches: string[] | null = null;
    if (term.length > 0 && !UUID_RE.test(term)) {
      const { data, error } = await db
        .from("listings")
        .select("id")
        .ilike("title", `%${term}%`)
        .limit(60);
      if (error) return UNAVAILABLE;
      listingMatches = (data ?? []).map((row) => row.id);
      if (listingMatches.length === 0) {
        return { state: "ok", data: { live: [], past: [], cancelled: [], searched: true } };
      }
    }

    let select = db.from("bookings").select(BOOKING_COLUMNS);
    if (term.length > 0 && UUID_RE.test(term)) select = select.eq("id", term);
    if (listingMatches) select = select.in("listing_id", listingMatches);
    if (status) select = select.eq("status", status);
    if (from) select = select.gte("created_at", lagosDayStart(from));
    if (to) select = select.lte("created_at", lagosDayEnd(to));

    const { data, error } = await select
      .order("check_in", { ascending: false })
      .limit(BUCKET_LIMIT * 3);
    if (error) return UNAVAILABLE;

    const rows = await decorate(db, (data ?? []) as BookingSelect[]);
    const today = lagosToday();

    /*
     * STATUS DECIDES THE BUCKET. THE DATE ONLY BREAKS THE TIE.
     *
     * This read `status !== "CANCELLED" && checkOut >= today` for live and the
     * same test inverted for past, so every status that was not CANCELLED was
     * filed by its dates alone. That was very nearly right while
     * `booking_status` had three values and is wrong now that it has five: a
     * stay an agent has recorded as COMPLETED or as a NO_SHOW is over, whatever
     * its dates say. A NO_SHOW whose checkout had not passed would have sat
     * under "Live and upcoming" on the operator's board, which is the console
     * telling a support desk a stay is still running that the agent has already
     * recorded the guest as missing.
     *
     * COMPLETED AND NO_SHOW BOTH GO TO "ALREADY OVER", which is what that
     * group's own heading says and is true of both. They keep their own chip on
     * the card, so the operator reads which of the two it was without the
     * grouping having to encode it. Splitting them into a fourth group was the
     * alternative and it buys nothing: an operator scanning this board is
     * asking "is this stay still running", and both answers to that are the
     * same.
     */
    const isOver = (row: AdminBookingRow): boolean =>
      row.status === "COMPLETED" || row.status === "NO_SHOW" || row.checkOut < today;

    const live = rows
      .filter((row) => row.status !== "CANCELLED" && !isOver(row))
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
      .slice(0, BUCKET_LIMIT);
    const past = rows
      .filter((row) => row.status !== "CANCELLED" && isOver(row))
      .slice(0, BUCKET_LIMIT);
    const cancelled = rows
      .filter((row) => row.status === "CANCELLED")
      .slice(0, BUCKET_LIMIT);

    return { state: "ok", data: { live, past, cancelled, searched: narrowed } };
  } catch {
    return UNAVAILABLE;
  }
}

/** One payment attempt against the stay. */
export type AdminBookingPayment = {
  id: string;
  provider: string;
  reference: string | null;
  amountMinor: number;
  status: Database["public"]["Enums"]["transaction_status"];
  createdAt: string;
};

/** One line of the stay's own history. */
export type AdminBookingEvent = {
  id: string;
  from: BookingStatus | null;
  to: BookingStatus;
  actorName: string | null;
  note: string | null;
  createdAt: string;
};

/** One refund decision already taken on this stay. */
export type AdminBookingRefund = {
  id: string;
  paidMinor: number;
  refundMinor: number;
  retainedMinor: number;
  reason: string;
  note: string | null;
  reference: string | null;
  decidedByName: string | null;
  createdAt: string;
};

export type AdminBookingDetail = AdminBookingRow & {
  pricePerNightMinor: number;
  cleaningFeeMinor: number;
  serviceFeeMinor: number;
  subtotalMinor: number;
  arrivingPhone: string | null;
  arrivingEmail: string | null;
  payments: AdminBookingPayment[];
  events: AdminBookingEvent[];
  refunds: AdminBookingRefund[];
};

/**
 * One stay in full: its money, its people, every payment attempt against it,
 * every refund already decided and the whole of its history.
 *
 * Returns "ok" with null data when the id is real but the row is not there, so
 * a page can tell "this stay is gone" apart from "the console cannot read the
 * database", which are two very different sentences to put in front of an
 * operator.
 */
export async function getBookingDetail(
  bookingId: string,
): Promise<AdminRead<AdminBookingDetail | null>> {
  const db = await adminClient();
  if (!db) return UNAVAILABLE;
  if (!UUID_RE.test(bookingId)) return { state: "ok", data: null };

  try {
    const { data: row, error } = await db
      .from("bookings")
      .select(
        `${BOOKING_COLUMNS}, price_per_night_minor, cleaning_fee_minor, service_fee_minor, subtotal_minor, guest_phone, guest_email`,
      )
      .eq("id", bookingId)
      .maybeSingle();
    if (error) return UNAVAILABLE;
    if (!row) return { state: "ok", data: null };

    const [base] = await decorate(db, [row as unknown as BookingSelect]);
    if (!base) return UNAVAILABLE;

    const [payments, events, refunds] = await Promise.all([
      db
        .from("transactions")
        .select("id, provider, provider_ref, amount_minor, status, created_at")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false }),
      db
        .from("booking_state_events")
        .select("id, from_status, to_status, actor_id, note, created_at")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true }),
      db
        .from("booking_refunds")
        .select(
          "id, paid_minor, refund_minor, retained_minor, reason, note, wallet_reference, decided_by, created_at",
        )
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false }),
    ]);

    const actorIds = [
      ...(events.data ?? []).map((event) => event.actor_id ?? ""),
      ...(refunds.data ?? []).map((refund) => refund.decided_by ?? ""),
    ];
    const actorNames = await namesFor(db, actorIds);

    return {
      state: "ok",
      data: {
        ...base,
        pricePerNightMinor: (row as { price_per_night_minor: number }).price_per_night_minor,
        cleaningFeeMinor: (row as { cleaning_fee_minor: number }).cleaning_fee_minor,
        serviceFeeMinor: (row as { service_fee_minor: number }).service_fee_minor,
        subtotalMinor: (row as { subtotal_minor: number }).subtotal_minor,
        arrivingPhone: (row as { guest_phone: string | null }).guest_phone,
        arrivingEmail: (row as { guest_email: string | null }).guest_email,
        payments: (payments.data ?? []).map((payment) => ({
          id: payment.id,
          provider: payment.provider,
          reference: payment.provider_ref,
          amountMinor: payment.amount_minor,
          status: payment.status,
          createdAt: payment.created_at,
        })),
        events: (events.data ?? []).map((event) => ({
          id: event.id,
          from: event.from_status,
          to: event.to_status,
          actorName: event.actor_id ? (actorNames.get(event.actor_id) ?? null) : null,
          note: event.note,
          createdAt: event.created_at,
        })),
        refunds: (refunds.data ?? []).map((refund) => ({
          id: refund.id,
          paidMinor: refund.paid_minor,
          refundMinor: refund.refund_minor,
          retainedMinor: refund.retained_minor,
          reason: refund.reason,
          note: refund.note,
          reference: refund.wallet_reference,
          decidedByName: refund.decided_by ? (actorNames.get(refund.decided_by) ?? null) : null,
          createdAt: refund.created_at,
        })),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}
