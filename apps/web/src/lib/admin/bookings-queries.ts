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

/**
 * The board, optionally narrowed by a search.
 *
 * The search takes either a whole booking id, which is what a guest quotes in a
 * message, or part of a listing title. Anything else returns an empty board
 * rather than the unfiltered one, because a support desk that silently ignores
 * the thing you typed is worse than one that says it found nothing.
 */
export async function getBookingBoard(query?: string): Promise<AdminRead<AdminBookingBoard>> {
  const db = await adminClient();
  if (!db) return UNAVAILABLE;

  const term = (query ?? "").trim();

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

    const { data, error } = await select
      .order("check_in", { ascending: false })
      .limit(BUCKET_LIMIT * 3);
    if (error) return UNAVAILABLE;

    const rows = await decorate(db, (data ?? []) as BookingSelect[]);
    const today = lagosToday();

    const live = rows
      .filter((row) => row.status !== "CANCELLED" && row.checkOut >= today)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
      .slice(0, BUCKET_LIMIT);
    const past = rows
      .filter((row) => row.status !== "CANCELLED" && row.checkOut < today)
      .slice(0, BUCKET_LIMIT);
    const cancelled = rows
      .filter((row) => row.status === "CANCELLED")
      .slice(0, BUCKET_LIMIT);

    return { state: "ok", data: { live, past, cancelled, searched: term.length > 0 } };
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
