import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../supabase/database.types";
import { requireAdmin } from "../guard";
import type { AdminRead } from "../queries";
import { exactCount, readEvery } from "./money";

/**
 * THE BOOKINGS DESK'S READ. Select only, through the admin's RLS client
 * (`bookings_admin_all`, `listings_admin_all`, `transactions_admin_select`,
 * `booking_refunds_select_admin`, `profiles_select_admin`, checked live on 22
 * September). Every booking is read once, in chunks, and checked against an
 * exact count, so no figure is the total of a capped list.
 *
 * The cancel and refund decisions stay where they were (`cancelBookingAsAdmin`
 * and `previewCancellation` in `lib/admin/bookings-actions.ts`), on the stay's
 * own page, unchanged.
 */

type Client = SupabaseClient<Database>;
type BookingStatus = Database["public"]["Enums"]["booking_status"];
const UNAVAILABLE = { state: "unavailable" } as const;
const DAY_MS = 86_400_000;

export const BOOKING_STATES: readonly BookingStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"];

export type BookingRowView = {
  id: string;
  status: BookingStatus;
  listingTitle: string | null;
  place: string | null;
  guestName: string | null;
  /** For the badge slot. */
  guestId?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalMinor: number;
  paidMinor: number;
  refundedMinor: number;
  createdAt: string;
};

export type BookingsDesk = {
  counts: {
    /** PENDING: asked for, not yet answered by the host. */
    requested: number;
    confirmed: number;
    /** CONFIRMED and today is between check-in (inclusive) and check-out (exclusive), Lagos days. */
    inStay: number;
    completed: number;
    noShow: number;
    cancelled: number;
    /** Bookings with a refund of more than nothing recorded against them. */
    refunded: number;
    total: number;
    /** Created in the last 7 days. */
    createdThisWeek: number;
  };
  /** Bookings created per Lagos day, the last 30 days, oldest first, zero days included. */
  perDay: { day: string; count: number }[];
  table: { rows: BookingRowView[]; total: number; page: number; pageSize: number };
  complete: boolean;
};

export type BookingsFilter = {
  /** A listing title, a guest's name, or a booking id. */
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

export type BookingRaw = {
  id: string;
  status: BookingStatus;
  guest_id: string;
  guest_name: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  total_minor: number;
  created_at: string;
  listings: { title: string; area: string | null; city: string | null } | null;
};

/** `YYYY-MM-DD` in Lagos (UTC+1, no daylight saving). */
export function lagosDay(at: number): string {
  return new Date(at + 3_600_000).toISOString().slice(0, 10);
}

/** Pure: the desk from its rows, so the arithmetic is tested without a database. */
export function buildBookings(
  rows: readonly BookingRaw[],
  paid: ReadonlyMap<string, number>,
  refunded: ReadonlyMap<string, number>,
  names: ReadonlyMap<string, string>,
  filter: BookingsFilter,
  now: number,
): Omit<BookingsDesk, "complete"> {
  const today = lagosDay(now);
  const count = (s: BookingStatus) => rows.filter((r) => r.status === s).length;
  const weekAgo = now - 7 * DAY_MS;

  const days = Array.from({ length: 30 }, (_, i) => lagosDay(now - (29 - i) * DAY_MS));
  const perDay = new Map(days.map((d) => [d, 0]));
  for (const r of rows) {
    const d = lagosDay(Date.parse(r.created_at));
    if (perDay.has(d)) perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }

  const term = (filter.q ?? "").trim().toLowerCase();
  const state = BOOKING_STATES.find((s) => s === filter.status);
  const fromMs = filter.from ? Date.parse(`${filter.from}T00:00:00+01:00`) : null;
  const toMs = filter.to ? Date.parse(`${filter.to}T23:59:59.999+01:00`) : null;
  const narrowed = rows
    .filter((r) => {
      if (state && r.status !== state) return false;
      const at = Date.parse(r.created_at);
      if (fromMs !== null && at < fromMs) return false;
      if (toMs !== null && at > toMs) return false;
      if (!term) return true;
      const guest = (r.guest_name ?? names.get(r.guest_id) ?? "").toLowerCase();
      return (
        r.id.toLowerCase() === term ||
        (r.listings?.title ?? "").toLowerCase().includes(term) ||
        guest.includes(term)
      );
    })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const pages = Math.max(1, Math.ceil(narrowed.length / filter.pageSize));
  const page = Math.min(Math.max(1, filter.page), pages);

  return {
    counts: {
      requested: count("PENDING"),
      confirmed: count("CONFIRMED"),
      inStay: rows.filter((r) => r.status === "CONFIRMED" && r.check_in <= today && today < r.check_out).length,
      completed: count("COMPLETED"),
      noShow: count("NO_SHOW"),
      cancelled: count("CANCELLED"),
      refunded: rows.filter((r) => (refunded.get(r.id) ?? 0) > 0).length,
      total: rows.length,
      createdThisWeek: rows.filter((r) => Date.parse(r.created_at) >= weekAgo).length,
    },
    perDay: days.map((day) => ({ day, count: perDay.get(day) ?? 0 })),
    table: {
      rows: narrowed.slice((page - 1) * filter.pageSize, page * filter.pageSize).map((r) => ({
        id: r.id,
        status: r.status,
        listingTitle: r.listings?.title ?? null,
        place: [r.listings?.area, r.listings?.city].filter(Boolean).join(", ") || null,
        guestName: r.guest_name ?? names.get(r.guest_id) ?? null,
        guestId: r.guest_id,
        checkIn: r.check_in,
        checkOut: r.check_out,
        nights: r.nights,
        totalMinor: r.total_minor,
        paidMinor: paid.get(r.id) ?? 0,
        refundedMinor: refunded.get(r.id) ?? 0,
        createdAt: r.created_at,
      })),
      total: narrowed.length,
      page,
      pageSize: filter.pageSize,
    },
  };
}

export async function getBookingsDesk(filter: BookingsFilter, now = Date.now()): Promise<AdminRead<BookingsDesk>> {
  const access = await requireAdmin("operations");
  if (access.state !== "admin") return UNAVAILABLE;
  const db: Client = access.supabase;

  try {
    const [bookings, count, paid, refunds] = await Promise.all([
      readEvery<BookingRaw>((f, t) =>
        db
          .from("bookings")
          .select("id, status, guest_id, guest_name, check_in, check_out, nights, total_minor, created_at, listings ( title, area, city )")
          .order("id")
          .range(f, t),
      ),
      exactCount(db.from("bookings").select("id", { count: "exact", head: true })),
      readEvery<{ booking_id: string | null; amount_minor: number }>((f, t) =>
        db.from("transactions").select("booking_id, amount_minor").eq("status", "SUCCESSFUL").order("id").range(f, t),
      ),
      readEvery<{ booking_id: string; refund_minor: number }>((f, t) =>
        db.from("booking_refunds").select("booking_id, refund_minor").order("id").range(f, t),
      ),
    ]);
    if (!bookings || count === null || !paid || !refunds) return UNAVAILABLE;

    const paidBy = new Map<string, number>();
    for (const p of paid.rows) if (p.booking_id) paidBy.set(p.booking_id, (paidBy.get(p.booking_id) ?? 0) + p.amount_minor);
    const refundedBy = new Map<string, number>();
    for (const r of refunds.rows) refundedBy.set(r.booking_id, (refundedBy.get(r.booking_id) ?? 0) + r.refund_minor);

    const unnamed = [...new Set(bookings.rows.filter((b) => !b.guest_name).map((b) => b.guest_id))];
    const names = new Map<string, string>();
    for (let i = 0; i < unnamed.length; i += 200) {
      const { data, error } = await db.from("profiles").select("id, display_name").in("id", unnamed.slice(i, i + 200));
      if (error) return UNAVAILABLE;
      for (const row of data ?? []) if (row.display_name) names.set(row.id, row.display_name);
    }

    const built = buildBookings(bookings.rows, paidBy, refundedBy, names, filter, now);
    return {
      state: "ok",
      data: {
        ...built,
        complete: bookings.complete && paid.complete && refunds.complete && bookings.rows.length === count,
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}
