import { formatMoney, type Locale } from "@naijafinds/i18n";
import type { Listing } from "@/lib/listings/types";

/**
 * Booking views for the trips hub.
 *
 * Until the reservations backend lands, bookings are assembled here from real
 * catalogue listings so the surface behaves exactly as it will in production:
 * live photography, real localities, naira totals computed in kobo, and dates
 * that always sit a believable distance from today. Everything exported is
 * plain serialisable data, safe to hand straight to a client component.
 */

export type BookingStatus = "confirmed" | "completed";

export type Booking = {
  id: string;
  listingId: string;
  title: string;
  area: string;
  city: string;
  /** Lead photo URL; the card paints a blue gradient underneath as fallback. */
  photo: string | null;
  /** e.g. "Fri 14 Aug to Sun 16 Aug", always computed relative to now. */
  dateRange: string;
  nights: number;
  guests: number;
  /** Stay total in MINOR UNITS (kobo): nightly rate times nights, integers only. */
  totalMinor: number;
  /** The total formatted for display, e.g. "₦190,000". */
  totalDisplay: string;
  status: BookingStatus;
};

const DAY_LABEL = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** The first Friday on or after the given date, so stays land on weekends. */
function toFriday(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7));
  return d;
}

/** "Fri 14 Aug to Sun 16 Aug" for a check-in date and a number of nights. */
function stayRange(checkIn: Date, nights: number): string {
  return `${DAY_LABEL.format(checkIn)} to ${DAY_LABEL.format(addDays(checkIn, nights))}`;
}

type Slot = {
  /** Days from now to anchor the stay; snapped forward to a Friday. */
  offsetDays: number;
  nights: number;
  guests: number;
  status: BookingStatus;
};

/** One weekend soon, one longer weekend next month, one finished stay. */
const SLOTS: Slot[] = [
  { offsetDays: 9, nights: 2, guests: 2, status: "confirmed" },
  { offsetDays: 30, nights: 3, guests: 4, status: "confirmed" },
  { offsetDays: -25, nights: 2, guests: 2, status: "completed" },
];

function toBooking(listing: Listing, slot: Slot, locale: Locale, now: Date): Booking {
  const checkIn = toFriday(addDays(now, slot.offsetDays));
  const totalMinor = listing.priceMinor * slot.nights;
  return {
    id: `bk-${listing.id}`,
    listingId: listing.id,
    title: listing.title,
    area: listing.area,
    city: listing.city,
    photo: listing.photos[0] ?? null,
    dateRange: stayRange(checkIn, slot.nights),
    nights: slot.nights,
    guests: slot.guests,
    totalMinor,
    totalDisplay: formatMoney(totalMinor, locale, listing.currency),
    status: slot.status,
  };
}

/**
 * Assemble the trips hub view from up to three stay listings: the first two
 * become upcoming weekends, the third a completed stay awaiting its review.
 */
export function buildBookings(
  stays: Listing[],
  locale: Locale,
  now: Date = new Date(),
): { upcoming: Booking[]; past: Booking[] } {
  const bookings: Booking[] = [];
  SLOTS.forEach((slot, i) => {
    const listing = stays[i];
    if (listing) bookings.push(toBooking(listing, slot, locale, now));
  });
  return {
    upcoming: bookings.filter((b) => b.status === "confirmed"),
    past: bookings.filter((b) => b.status === "completed"),
  };
}
