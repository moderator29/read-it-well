import "server-only";

import { formatMoney, type Locale } from "@naijafinds/i18n";
import { resolveSession } from "../actions/session";
import { getListingRepository } from "../listings/repository";
import type { Listing } from "../listings/types";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { lagosToday } from "./schema";

/**
 * Read side of the bookings loop.
 *
 * These queries feed server components, so failure must always degrade to
 * something renderable: no blocked dates rather than a crashed page, the
 * seeded trips rather than an error screen. Every read goes through the
 * user's RLS-bound client; nothing here needs the service role.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Dates a guest cannot pick for this listing: booked or blocked nights from
 * today forward. Empty when Supabase is not configured, when the id is a
 * catalogue entry rather than a platform listing, or on any read failure.
 */
export async function getBlockedDates(listingId: string): Promise<string[]> {
  if (!isSupabaseConfigured() || !UUID_RE.test(listingId)) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("availability")
      .select("date")
      .eq("listing_id", listingId)
      .gte("date", lagosToday())
      .in("status", ["booked", "unavailable"])
      .order("date", { ascending: true })
      .limit(400);
    if (error || !data) return [];
    return data.map((row) => row.date);
  } catch {
    return [];
  }
}

export type BookingView = {
  id: string;
  listingId: string;
  title: string;
  area: string;
  city: string;
  photo: string | null;
  checkIn: string;
  checkOut: string;
  /** e.g. "Fri 14 Aug to Sun 16 Aug". */
  dateRange: string;
  nights: number;
  guests: number;
  totalDisplay: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  /** True when the guest may still call the stay off. */
  cancellable: boolean;
  /** The person actually arriving, when the payer booked it for somebody else. */
  arrivingName: string | null;
  /** Their number, in the canonical +234 form the booking stores. */
  arrivingPhone: string | null;
  /** True once this stay carries a review by this guest. */
  reviewed: boolean;
  /**
   * True when a review can actually be written now. Mirrors the
   * reviews_insert_own policy, so the control never promises a write the
   * database would refuse.
   */
  reviewable: boolean;
};

export type BookingGroups = {
  upcoming: BookingView[];
  completed: BookingView[];
  cancelled: BookingView[];
};

const DAY_LABEL = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function labelDate(iso: string): string {
  return DAY_LABEL.format(new Date(`${iso}T12:00:00Z`));
}

/**
 * The signed-in user's real bookings, grouped for the trips hub tabs.
 * Resolves null when Supabase is unconfigured or nobody is signed in, so the
 * page can keep its seeded rendering for those states.
 */
export async function getMyBookings(
  locale: Locale,
): Promise<BookingGroups | null | "unavailable"> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;

  const { data: rows, error } = await session.supabase
    .from("bookings")
    .select(
      "id, listing_id, check_in, check_out, nights, adults, children, total_minor, currency, status, guest_name, guest_phone",
    )
    .eq("guest_id", session.user.id)
    .order("check_in", { ascending: false })
    .limit(100);
  /*
   * A DROPPED READ IS NOT AN EMPTY ACCOUNT.
   *
   * This returned three empty groups on `error`, so a query that failed
   * rendered the trips hub as "you have no trips". Somebody with a stay next
   * week, on a bad connection or during a database blip, was told their
   * booking did not exist. That is the same shape as a listing with no price
   * being reported as costing zero: an absence of data stated as a fact about
   * the world.
   *
   * It does NOT return null either, which was the obvious fix and is a second
   * bug wearing the first one's clothes: null already means signed out, and the
   * hub answers signed out by drawing example stays. A failed read would then
   * show a signed-in person a set of bookings that are not theirs and do not
   * exist, which is worse than the empty list it replaced.
   *
   * So the failure has its own value and the screen says the true thing: we
   * could not load your trips, rather than you have none, and rather than here
   * are some.
   */
  if (error || !rows) return "unavailable";

  // Display data: platform listing rows first, seed catalogue as the
  // fallback for titles and photography, a plain placeholder after that.
  const listingIds = [...new Set(rows.map((r) => r.listing_id))];
  const dbListings = new Map<string, { title: string; area: string | null; city: string | null }>();
  if (listingIds.length > 0) {
    const { data: listingRows } = await session.supabase
      .from("listings")
      .select("id, title, area, city")
      .in("id", listingIds);
    for (const l of listingRows ?? []) dbListings.set(l.id, l);
  }
  const repo = getListingRepository();
  const seedListings = new Map(
    (await Promise.all(listingIds.map(async (id) => [id, await repo.byId(id)] as const))).filter(
      (pair): pair is readonly [string, Listing] => pair[1] !== null,
    ),
  );

  // Which of these stays the guest has already reviewed, in one read. Their own
  // RLS client only ever returns their own reviews, so this cannot leak another
  // guest's writing.
  const reviewedBookingIds = new Set<string>();
  if (rows.length > 0) {
    const { data: reviewRows } = await session.supabase
      .from("reviews")
      .select("booking_id")
      .in(
        "booking_id",
        rows.map((r) => r.id),
      );
    for (const r of reviewRows ?? []) reviewedBookingIds.add(r.booking_id);
  }

  /*
   * Which of these stays has money settled against it, in one read, for the
   * `cancellable` decision below.
   *
   * Read through the guest's own client like everything else here, so it can
   * only ever see their own payments. A failed read leaves the set empty,
   * which offers the button on a paid stay and lands the guest on the action's
   * own honest refusal. That is the right way round: the failure mode of not
   * knowing is one clear sentence, and the alternative would hide the control
   * from people who are entitled to it every time the payments table blinked.
   */
  const paidBookingIds = new Set<string>();
  if (rows.length > 0) {
    const { data: paidRows } = await session.supabase
      .from("transactions")
      .select("booking_id")
      .eq("status", "SUCCESSFUL")
      .in(
        "booking_id",
        rows.map((r) => r.id),
      );
    for (const r of paidRows ?? []) {
      if (r.booking_id) paidBookingIds.add(r.booking_id);
    }
  }

  const today = lagosToday();
  const groups: BookingGroups = { upcoming: [], completed: [], cancelled: [] };

  for (const row of rows) {
    const db = dbListings.get(row.listing_id);
    const seed = seedListings.get(row.listing_id);
    const view: BookingView = {
      id: row.id,
      listingId: row.listing_id,
      title: db?.title ?? seed?.title ?? "Reserved stay",
      area: db?.area ?? seed?.area ?? "",
      city: db?.city ?? seed?.city ?? "",
      photo: seed?.photos[0] ?? null,
      checkIn: row.check_in,
      checkOut: row.check_out,
      dateRange: `${labelDate(row.check_in)} to ${labelDate(row.check_out)}`,
      nights: row.nights,
      guests: row.adults + row.children,
      totalDisplay: formatMoney(row.total_minor, locale, row.currency),
      status: row.status,
      /*
       * Cancellable means cancel() WILL take it, not that the status looks
       * right.
       *
       * This asked only about status and date. `cancel()` additionally refuses
       * any stay carrying a SUCCESSFUL transaction, and says so plainly, so
       * every guest who had actually paid was shown a Cancel button that then
       * turned them away. A control that refuses is worse than no control: it
       * reads as the platform breaking at the moment somebody is trying to get
       * their money back.
       *
       * Paid stays are settled by a person, which is what the action's own
       * refusal tells them, so the screen no longer offers the shortcut that
       * cannot work.
       */
      cancellable:
        (row.status === "PENDING" || row.status === "CONFIRMED") &&
        row.check_in > today &&
        !paidBookingIds.has(row.id),
      arrivingName: (row.guest_name ?? "").trim() || null,
      arrivingPhone: (row.guest_phone ?? "").trim() || null,
      reviewed: reviewedBookingIds.has(row.id),
      reviewable:
        row.status === "CONFIRMED" &&
        row.check_out <= today &&
        !reviewedBookingIds.has(row.id),
    };
    if (row.status === "CANCELLED") groups.cancelled.push(view);
    else if (row.check_out <= today) groups.completed.push(view);
    else groups.upcoming.push(view);
  }

  // Upcoming reads soonest first; history stays newest first.
  groups.upcoming.sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1));
  return groups;
}
