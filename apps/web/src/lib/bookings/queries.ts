import "server-only";

import { formatMoney, type Locale } from "@vallo/i18n";
import { resolveSession } from "../actions/session";
import { getListingRepository } from "../listings/repository";
import type { Listing } from "../listings/types";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { lagosToday } from "./schema";
import type { Database } from "../supabase/database.types";

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
 * The one column this module reads off `rent_payments`, typed by hand until
 * the lead regenerates `database.types.ts` for the b3 migration. The same
 * device `lib/rent/db.ts` uses; the cast is confined to this alias.
 */
type RentChargeReader = {
  from: (table: "rent_payments") => {
    select: (columns: "booking_id") => {
      in: (
        column: "booking_id",
        values: string[],
      ) => PromiseLike<{ data: { booking_id: string | null }[] | null; error: unknown }>;
    };
  };
};

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
  status: Database["public"]["Enums"]["booking_status"];
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

  /*
   * A RENT CHARGE IS NOT A STAY, AND IT RIDES THE SAME TABLE.
   *
   * The rent payment step (lib/rent, the b3 migration) opens its charge as a
   * one-night bookings row priced at the move-in total, because every money
   * rail hangs off a booking. Rendered here it would read as a stay of one
   * night at the price of a year, which is the yearly-rent-with-nightly-
   * pickers error in a list. The `rent_payments` row is what says a booking
   * is a tenancy charge, read under the tenant's own RLS, and those bookings
   * are left out of the stays groups; the rent surfaces read them through
   * `getMyRentCharges` instead.
   */
  const rentBookingIds = new Set<string>();
  if (rows.length > 0) {
    const { data: charges } = await (session.supabase as unknown as RentChargeReader)
      .from("rent_payments")
      .select("booking_id")
      .in(
        "booking_id",
        rows.map((r) => r.id),
      );
    for (const c of charges ?? []) if (c.booking_id) rentBookingIds.add(c.booking_id);
  }
  const stays = rows.filter((r) => !rentBookingIds.has(r.id));

  // Display data: platform listing rows first, seed catalogue as the
  // fallback for titles and photography, a plain placeholder after that.
  const listingIds = [...new Set(stays.map((r) => r.listing_id))];
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
  if (stays.length > 0) {
    const { data: reviewRows } = await session.supabase
      .from("reviews")
      .select("booking_id")
      .in(
        "booking_id",
        stays.map((r) => r.id),
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
  if (stays.length > 0) {
    const { data: paidRows } = await session.supabase
      .from("transactions")
      .select("booking_id")
      .eq("status", "SUCCESSFUL")
      .in(
        "booking_id",
        stays.map((r) => r.id),
      );
    for (const r of paidRows ?? []) {
      if (r.booking_id) paidBookingIds.add(r.booking_id);
    }
  }

  const today = lagosToday();
  const groups: BookingGroups = { upcoming: [], completed: [], cancelled: [] };

  for (const row of stays) {
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
      /*
       * COMPLETED COUNTS, AND IT DID NOT.
       *
       * This asked for CONFIRMED and a passed checkout, which was the only way
       * to say "the stay happened" while `booking_status` had no terminal good
       * value. It has one now, and an agent recording a stay as COMPLETED moved
       * the row out of CONFIRMED, so the guest SILENTLY LOST the ability to
       * review the stay at the exact moment the platform learned for certain
       * that it had happened. The date test stays for CONFIRMED, which is still
       * the ordinary path for a stay nobody has recorded either way.
       */
      reviewable:
        (row.status === "COMPLETED" ||
          (row.status === "CONFIRMED" && row.check_out <= today)) &&
        !reviewedBookingIds.has(row.id),
    };
    /*
     * STATUS DECIDES THE BUCKET. THE DATE ONLY BREAKS THE TIE.
     *
     * This was `CANCELLED ? cancelled : checkOut <= today ? completed :
     * upcoming`, so every status that was not CANCELLED was filed by its dates
     * alone. With three statuses that was very nearly right. With five it is
     * not: a stay the agent has recorded as COMPLETED or as a NO_SHOW is over,
     * whatever its dates say, and a NO_SHOW whose checkout has not passed yet
     * would have been filed under Upcoming - the platform telling somebody they
     * have a stay coming up that it has already recorded them as missing.
     *
     * So the three terminal statuses are placed by status and only PENDING and
     * CONFIRMED are placed by date.
     *
     * NO_SHOW GOES WITH THE PAST STAYS AND NOT WITH THE CANCELLED ONES, which
     * is the one judgement call here. Filing it under Cancelled would tell the
     * guest we cancelled their booking, which we did not; the tab is the record
     * of stays that are behind them and the row's own pill says "No show",
     * which is the accurate word and is the agent's, not ours. `reviewable`
     * above already refuses it a review control, so nothing invites them to
     * write about a stay they did not take.
     */
    if (row.status === "CANCELLED") groups.cancelled.push(view);
    else if (row.status === "COMPLETED" || row.status === "NO_SHOW") {
      groups.completed.push(view);
    } else if (row.check_out <= today) groups.completed.push(view);
    else groups.upcoming.push(view);
  }

  // Upcoming reads soonest first; history stays newest first.
  groups.upcoming.sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1));
  return groups;
}
