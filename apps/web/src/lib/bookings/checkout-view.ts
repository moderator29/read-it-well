import "server-only";

import { formatMoney, getDictionary, plural, type Locale } from "@vallo/i18n";
import { resolveSession } from "../actions/session";
import { isPaystackConfigured } from "../payments/paystack";
import type { Database } from "../supabase/database.types";
import { guestCharge } from "../money/guest-price";
import { instantPayBy } from "./instant-pay";

/**
 * Read side of checkout.
 *
 * Everything the checkout surface renders comes from here, read through the
 * guest's OWN RLS-bound client, so a booking that is not theirs simply does not
 * come back. The amount shown is the amount stored on the booking row, which is
 * also the amount both payment paths charge: there is no second arithmetic path
 * that could disagree with it.
 *
 * Every failure degrades into a renderable state rather than an exception. A
 * platform with no keys yet must show an honest screen, never a crash.
 */

/**
 * How long a PENDING booking holds its nights.
 *
 * 48 hours, matching private.release_stale_booking_holds exactly. If that
 * function's interval ever changes, this constant changes with it: a countdown
 * that disagrees with the job behind it is worse than no countdown.
 */
export const HOLD_WINDOW_HOURS = 48;

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
 * One row of the price breakdown. Never a charge the platform invented.
 *
 * `minor` is the row's integer kobo, carried alongside the formatted string so
 * the surface can set the figure itself through `<Amount>` rather than printing
 * a pre-baked string. `display` stays for callers that need plain text (the
 * support tools, anything writing prose).
 */
export type CheckoutLine = { label: string; display: string; minor: number };

export type CheckoutView = {
  bookingId: string;
  /** The listing a listing stay is for; null for a hotel room (ROOM BOOKINGS 1). */
  listingId: string | null;
  /** The hotel a room booking is at; null for a listing stay. */
  accommodationId: string | null;
  /** Where "back to the stay" goes: the listing, or the hotel's page. */
  stayHref: string;
  title: string;
  /** "Lekki, Lagos", or empty when the listing carries no locality. */
  location: string;
  checkIn: string;
  checkOut: string;
  /** e.g. "Fri 14 Aug to Sun 16 Aug". */
  dateRange: string;
  nights: number;
  guests: number;
  lines: CheckoutLine[];
  /**
   * Always true: a row with a guest-side fee never reaches a view (D51). Kept
   * for the fixtures that build a view by hand; nothing draws it any more.
   */
  platformTakesNothing: boolean;
  /** The booking's own currency, so every figure is set in the one it stores. */
  currency: string;
  /**
   * The reader's locale, carried on the view so a client component setting its
   * own figures formats them the same way the server formatted the rest. Two
   * locales on one checkout screen is how ₦ and ₦ with a space end up side by
   * side.
   */
  locale: Locale;
  totalMinor: number;
  totalDisplay: string;
  status: Database["public"]["Enums"]["booking_status"];
  /** True once a payment attempt has settled, whatever the status says. */
  paid: boolean;
  /** When the hold on these nights runs out, as an ISO instant. */
  holdExpiresAt: string;
  holdExpired: boolean;
  /**
   * D73: for a stay the system booked instantly at the published price, when
   * the unpaid hold ends (ISO); null for every other booking.
   */
  instantPayBy: string | null;
  /** False until the Paystack keys land, which the surface says out loud. */
  cardAvailable: boolean;
  /**
   * TRACK A. Payment is available only on an approved agreement. This is the
   * agreement's state as the guest reads it under their own RLS, or null when
   * there is none yet (a request the host has not accepted).
   */
  agreement: { id: string; status: string; reason: string | null } | null;
  /**
   * Who the payment is to: the owner's or agent's display name on the
   * agreement, read under the guest's own RLS, or null when there is no
   * agreement or the name could not be read (the screen then names the role).
   */
  payeeName?: string | null;
};

export type CheckoutRead =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "missing" }
  | { state: "unavailable" }
  | { state: "ready"; view: CheckoutView };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The booking row as this page reads it. A booking is for a listing OR, since
 * ROOM BOOKINGS 1, a room at a hotel (accommodation, room type, rooms); the
 * generated types predate the room columns, so the shape is named here.
 */
type CheckoutBookingRow = {
  id: string;
  listing_id: string | null;
  accommodation_id: string | null;
  room_type_id: string | null;
  rooms: number;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  price_per_night_minor: number;
  cleaning_fee_minor: number;
  service_fee_minor: number;
  subtotal_minor: number;
  total_minor: number;
  currency: string;
  status: Database["public"]["Enums"]["booking_status"];
  created_at: string;
};

/** The stay's name and place: the listing's, or the hotel's and the room's. */
async function readStayPlace(
  supabase: Awaited<ReturnType<typeof resolveSession>> extends infer S
    ? S extends { state: "signed-in"; supabase: infer C }
      ? C
      : never
    : never,
  booking: CheckoutBookingRow,
  locale: Locale,
): Promise<{ title: string | null; area: string | null; city: string | null } | null> {
  if (booking.listing_id) {
    const { data } = await supabase.from("listings").select("title, area, city").eq("id", booking.listing_id).maybeSingle();
    return data ?? null;
  }
  if (!booking.accommodation_id) return null;
  const [place, room] = await Promise.all([
    supabase.from("accommodations").select("name, area, city").eq("id", booking.accommodation_id).maybeSingle(),
    booking.room_type_id
      ? supabase.from("room_types").select("name").eq("id", booking.room_type_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!place.data) return null;
  const roomName = room.data?.name
    ? `, ${room.data.name} (${plural(booking.rooms, getDictionary(locale).counts.rooms, locale)})`
    : "";
  return { title: `${place.data.name}${roomName}`, area: place.data.area, city: place.data.city };
}

/**
 * Everything the checkout page needs for one booking, or an honest state
 * explaining why there is nothing to show.
 */
export async function getCheckoutView(
  bookingId: string,
  locale: Locale,
): Promise<CheckoutRead> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured" };
  if (session.state === "signed-out") return { state: "signed-out" };
  if (!UUID_RE.test(bookingId)) return { state: "missing" };

  try {
    const { data: booking, error } = await session.supabase
      .from("bookings")
      .select(
        "id, listing_id, accommodation_id, room_type_id, rooms, check_in, check_out, nights, adults, children, price_per_night_minor, cleaning_fee_minor, service_fee_minor, subtotal_minor, total_minor, currency, status, created_at",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (error) return { state: "unavailable" };
    if (!booking) return { state: "missing" };

    const [listingRead, settledRead, agreementRead] = await Promise.all([
      readStayPlace(session.supabase, booking, locale),
      session.supabase
        .from("transactions")
        .select("id")
        .eq("booking_id", booking.id)
        .eq("status", "SUCCESSFUL")
        .limit(1),
      session.supabase
        .from("deal_agreements")
        .select("id, status, decision_reason, owner_id, decided_by, decided_at, terms")
        .eq("booking_id", booking.id)
        .maybeSingle(),
    ]);

    const currency = booking.currency;
    const money = (minor: number) => formatMoney(minor, locale, currency);

    /* D51: the guest sees the lister's own figures and nothing of Vallo's.
       A row carrying a guest-side fee is refused, never drawn and never
       charged (lib/money/guest-price.ts). */
    const charge = guestCharge({
      /* The night count goes through the dictionary and picks its form from
         `Intl.PluralRules`, never a hand-inflected English plural. */
      subtotalLabel: `${money(booking.price_per_night_minor)} x ${plural(
        booking.nights,
        getDictionary(locale).counts.nights,
        locale,
      )}`,
      subtotalMinor: booking.subtotal_minor,
      cleaningLabel: "Cleaning",
      cleaningMinor: booking.cleaning_fee_minor,
      serviceFeeMinor: booking.service_fee_minor,
      totalMinor: booking.total_minor,
    });
    if (charge.state === "refused") return { state: "unavailable" };
    const lines: CheckoutLine[] = charge.lines.map((line) => ({
      label: line.label,
      display: money(line.minor),
      minor: line.minor,
    }));

    /* The payee, named for the checkout's "Paid to" (D50). One read, only when
       there is an agreement; a failure is a null, said as the role. */
    const ownerId = (agreementRead.data as { owner_id?: string | null } | null)?.owner_id ?? null;
    const payeeName = ownerId
      ? await session.supabase
          .from("profiles")
          .select("display_name")
          .eq("id", ownerId)
          .maybeSingle()
          .then(
            (r) => (r.data?.display_name ?? "").trim() || null,
            () => null,
          )
      : null;

    const holdExpiresAtMs =
      Date.parse(booking.created_at) + HOLD_WINDOW_HOURS * 3_600_000;
    const holdExpiresAt = new Date(holdExpiresAtMs).toISOString();

    const area = listingRead?.area ?? "";
    const city = listingRead?.city ?? "";
    const title = (listingRead?.title ?? "").trim();

    return {
      state: "ready",
      view: {
        bookingId: booking.id,
        listingId: booking.listing_id,
        accommodationId: booking.accommodation_id,
        stayHref: booking.listing_id ? `/listing/${booking.listing_id}` : `/stay/${booking.accommodation_id}`,
        title: title.length > 0 ? title : "Reserved stay",
        location: [area, city].filter((part) => part.length > 0).join(", "),
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        dateRange: `${labelDate(booking.check_in)} to ${labelDate(booking.check_out)}`,
        nights: booking.nights,
        guests: booking.adults + booking.children,
        lines,
        platformTakesNothing: true,
        currency,
        locale,
        totalMinor: booking.total_minor,
        totalDisplay: money(booking.total_minor),
        status: booking.status,
        // A settled payment attempt is the ONLY thing that means paid. This used
        // to also treat any CONFIRMED booking as paid, which was false and
        // costly: a host accepting a request-to-book stay confirms it without
        // any money arriving, so the guest was shown "This stay is paid for" and
        // the host was never paid. The status is reported separately, just below,
        // for surfaces that want to say who confirmed it.
        paid: (settledRead.data?.length ?? 0) > 0,
        holdExpiresAt,
        holdExpired: holdExpiresAtMs <= Date.now(),
        instantPayBy: instantPayBy(agreementRead.data ?? null),
        cardAvailable: isPaystackConfigured(),
        agreement: agreementRead.data
          ? {
              id: agreementRead.data.id,
              status: agreementRead.data.status,
              reason: agreementRead.data.decision_reason ?? null,
            }
          : null,
        payeeName,
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}
