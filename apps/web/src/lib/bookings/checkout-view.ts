import "server-only";

import { formatMoney, type Locale } from "@naijafinds/i18n";
import { resolveSession } from "../actions/session";
import { isPaystackConfigured } from "../payments/paystack";

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

/** One row of the price breakdown. Never a charge the platform invented. */
export type CheckoutLine = { label: string; display: string };

export type CheckoutView = {
  bookingId: string;
  listingId: string;
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
  /** True while the platform's own share is zero, which is the standing rule. */
  platformTakesNothing: boolean;
  totalMinor: number;
  totalDisplay: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  /** True once a payment attempt has settled, whatever the status says. */
  paid: boolean;
  /** When the hold on these nights runs out, as an ISO instant. */
  holdExpiresAt: string;
  holdExpired: boolean;
  /** False until the Paystack keys land, which the surface says out loud. */
  cardAvailable: boolean;
  walletBalanceMinor: number;
  walletBalanceDisplay: string;
  walletCovers: boolean;
};

export type CheckoutRead =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "missing" }
  | { state: "unavailable" }
  | { state: "ready"; view: CheckoutView };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
        "id, listing_id, check_in, check_out, nights, adults, children, price_per_night_minor, cleaning_fee_minor, service_fee_minor, subtotal_minor, total_minor, currency, status, created_at",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (error) return { state: "unavailable" };
    if (!booking) return { state: "missing" };

    const [listingRead, settledRead, balanceRead, heldRead] = await Promise.all([
      session.supabase
        .from("listings")
        .select("title, area, city")
        .eq("id", booking.listing_id)
        .maybeSingle(),
      session.supabase
        .from("transactions")
        .select("id")
        .eq("booking_id", booking.id)
        .eq("status", "SUCCESSFUL")
        .limit(1),
      session.supabase
        .from("wallet_balances")
        .select("balance_minor")
        .eq("user_id", session.user.id)
        .maybeSingle(),
      session.supabase
        .from("wallet_entries")
        .select("amount_minor")
        .eq("status", "PENDING")
        .eq("direction", "debit"),
    ]);

    // Spendable, not settled: the derived balance minus every PENDING debit, so
    // money already committed to an in-flight withdrawal is never offered
    // towards a stay. The same arithmetic the wallet ledger uses.
    const settledBalance = balanceRead.data?.balance_minor ?? 0;
    let held = 0;
    for (const row of heldRead.data ?? []) held += row.amount_minor;
    const walletBalanceMinor = Math.max(0, settledBalance - held);

    const currency = booking.currency;
    const money = (minor: number) => formatMoney(minor, locale, currency);

    const lines: CheckoutLine[] = [
      {
        label: `${money(booking.price_per_night_minor)} x ${booking.nights} ${
          booking.nights === 1 ? "night" : "nights"
        }`,
        display: money(booking.subtotal_minor),
      },
    ];
    if (booking.cleaning_fee_minor > 0) {
      lines.push({ label: "Cleaning", display: money(booking.cleaning_fee_minor) });
    }
    // The platform's own share is zero and stays zero (docs/MASTER_TODO.md
    // section 5b). The column exists for a future take rate, so if it is ever
    // non-zero it is shown plainly rather than hidden inside the total.
    if (booking.service_fee_minor > 0) {
      lines.push({ label: "Platform share", display: money(booking.service_fee_minor) });
    }

    const holdExpiresAtMs =
      Date.parse(booking.created_at) + HOLD_WINDOW_HOURS * 3_600_000;
    const holdExpiresAt = new Date(holdExpiresAtMs).toISOString();

    const area = listingRead.data?.area ?? "";
    const city = listingRead.data?.city ?? "";
    const title = (listingRead.data?.title ?? "").trim();

    return {
      state: "ready",
      view: {
        bookingId: booking.id,
        listingId: booking.listing_id,
        title: title.length > 0 ? title : "Reserved stay",
        location: [area, city].filter((part) => part.length > 0).join(", "),
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        dateRange: `${labelDate(booking.check_in)} to ${labelDate(booking.check_out)}`,
        nights: booking.nights,
        guests: booking.adults + booking.children,
        lines,
        platformTakesNothing: booking.service_fee_minor === 0,
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
        cardAvailable: isPaystackConfigured(),
        walletBalanceMinor,
        walletBalanceDisplay: money(walletBalanceMinor),
        walletCovers: walletBalanceMinor >= booking.total_minor && booking.total_minor > 0,
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}
