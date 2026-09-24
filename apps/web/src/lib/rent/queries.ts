import "server-only";

import { formatMoney, type Locale } from "@vallo/i18n";
import { resolveSession } from "../actions/session";
import { HOLD_WINDOW_HOURS } from "../bookings/checkout-view";
import type { InspectionState } from "../inspections/types";
import { isPaystackConfigured } from "../payments/paystack";
import type { Database } from "../supabase/database.types";
import { ledgerFromCharge, ledgerFromListing, type RentLedger } from "./ledger";
import { lagosToday } from "./schema";

/**
 * Read side of the rent payment step.
 *
 * Everything `/rent/pay/[inspectionId]` renders comes from here, through the
 * tenant's OWN RLS-bound client: an inspection that is not theirs, a listing
 * they may not see, a charge that is not theirs, each simply does not come
 * back. The figure shown is the figure charged: once the charge is open it is
 * the frozen `rent_payments` total, and before that it is the listing's own
 * move-in arithmetic, which is exactly what `private.open_rent_charge` will
 * freeze. There is no second arithmetic path that could disagree with it.
 *
 * Every failure degrades into a renderable state. A platform with no keys
 * shows an honest screen, never a crash.
 */

export type RentLine = { label: string; display: string; minor: number };

export type RentPayView = {
  inspectionId: string;
  inspectionState: InspectionState;
  listingId: string;
  title: string;
  /** "Lekki Phase 1, Lagos", or empty. */
  location: string;
  /** The move-in day the charge carries, or the inspection's agreed day, or today. */
  moveIn: string;
  rentPeriod: "month" | "quarter" | "year";
  lines: RentLine[];
  /** True when the lister stated the total; false when it is the sum of the parts. */
  totalStated: boolean;
  totalMinor: number;
  totalDisplay: string;
  currency: string;
  locale: Locale;
  /** The bookings row carrying the money, once the charge is open. */
  bookingId: string | null;
  bookingStatus: Database["public"]["Enums"]["booking_status"] | null;
  /** True once a payment attempt has settled against the charge. */
  paid: boolean;
  /** True while an open charge is still payable: a PENDING booking inside its window. */
  chargeOpen: boolean;
  holdExpiresAt: string | null;
  holdExpired: boolean;
  cardAvailable: boolean;
  walletBalanceMinor: number;
  walletBalanceDisplay: string;
  walletCovers: boolean;
};

export type RentPayRead =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "missing" }
  | { state: "unavailable" }
  /** The lister opened the tenant's page. */
  | { state: "not-tenant"; listingId: string; title: string }
  /** The lister has not said yes yet, so nothing can be paid. */
  | { state: "not-accepted"; inspectionState: InspectionState; listingId: string; title: string }
  /** The listing is not let by the year or month, or names no figure. */
  | { state: "no-charge"; listingId: string; title: string }
  | { state: "ready"; view: RentPayView };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The inspection states in which the lister has said yes. */
export function inspectionAccepted(state: InspectionState, outcome: string | null): boolean {
  if (state === "CONFIRMED") return true;
  return state === "COMPLETED" && (outcome ?? "inspected") !== "no_deal";
}

export async function getRentPayView(inspectionId: string, locale: Locale): Promise<RentPayRead> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured" };
  if (session.state === "signed-out") return { state: "signed-out" };
  if (!UUID_RE.test(inspectionId)) return { state: "missing" };

  try {
    const { data: inspection, error } = await session.supabase
      .from("inspection_requests")
      .select("id, listing_id, requester_id, lister_id, state, outcome, slot_at")
      .eq("id", inspectionId)
      .maybeSingle();
    if (error) return { state: "unavailable" };
    if (!inspection) return { state: "missing" };

    const { data: listing } = await session.supabase
      .from("listings")
      .select(
        "id, title, area, city, listing_intent, status, rent_amount_minor, rent_period, caution_deposit_minor, service_charge_minor, service_charge_period, agency_fee_minor, legal_fee_minor, agreement_fee_minor, total_move_in_cost_minor",
      )
      .eq("id", inspection.listing_id)
      .maybeSingle();
    if (!listing) return { state: "missing" };

    const title = listing.title.trim().length > 0 ? listing.title.trim() : "This home";
    if (inspection.requester_id !== session.user.id) {
      return { state: "not-tenant", listingId: listing.id, title };
    }
    const inspectionState = inspection.state as InspectionState;
    if (!inspectionAccepted(inspectionState, inspection.outcome)) {
      return { state: "not-accepted", inspectionState, listingId: listing.id, title };
    }

    const { data: charge } = await session.supabase
      .from("rent_payments")
      .select("*")
      .eq("inspection_id", inspectionId)
      .maybeSingle();

    const ledger: RentLedger | null = charge ? ledgerFromCharge(charge) : ledgerFromListing(listing);
    if (!ledger || (!charge && (listing.listing_intent !== "rent" || listing.rent_amount_minor === null))) {
      return { state: "no-charge", listingId: listing.id, title };
    }

    let bookingStatus: Database["public"]["Enums"]["booking_status"] | null = null;
    let bookingCreatedAt: string | null = null;
    let paid = false;
    if (charge) {
      const [bookingRead, settledRead] = await Promise.all([
        session.supabase
          .from("bookings")
          .select("id, status, created_at")
          .eq("id", charge.booking_id)
          .maybeSingle(),
        session.supabase
          .from("transactions")
          .select("id")
          .eq("booking_id", charge.booking_id)
          .eq("status", "SUCCESSFUL")
          .limit(1),
      ]);
      bookingStatus = bookingRead.data?.status ?? null;
      bookingCreatedAt = bookingRead.data?.created_at ?? null;
      paid = (settledRead.data?.length ?? 0) > 0;
    }

    // Spendable, not settled: the derived balance minus every PENDING debit,
    // the same arithmetic the checkout view and the wallet ledger use.
    const [balanceRead, heldRead] = await Promise.all([
      session.supabase.from("wallet_balances").select("balance_minor").eq("user_id", session.user.id).maybeSingle(),
      /* SEC-02. The caller's own wallet: an admin reads every entry. */
      session.supabase
        .from("wallet_entries")
        .select("amount_minor, wallets!inner(user_id)")
        .eq("wallets.user_id", session.user.id)
        .eq("status", "PENDING")
        .eq("direction", "debit"),
    ]);
    const settledBalance = balanceRead.data?.balance_minor ?? 0;
    let held = 0;
    for (const row of heldRead.data ?? []) held += row.amount_minor;
    const walletBalanceMinor = Math.max(0, settledBalance - held);

    const currency = charge?.currency ?? "NGN";
    const money = (minor: number) => formatMoney(minor, locale, currency);

    const holdExpiresAtMs = bookingCreatedAt
      ? Date.parse(bookingCreatedAt) + HOLD_WINDOW_HOURS * 3_600_000
      : null;
    const holdExpired = holdExpiresAtMs !== null && holdExpiresAtMs <= Date.now();
    const chargeOpen =
      charge !== null &&
      !paid &&
      (bookingStatus === "PENDING" || bookingStatus === "CONFIRMED") &&
      !holdExpired;

    const rentPeriod = (charge?.rent_period ?? listing.rent_period ?? "year") as RentPayView["rentPeriod"];
    const moveIn = charge?.move_in ?? (inspection.slot_at ? inspection.slot_at.slice(0, 10) : lagosToday());

    return {
      state: "ready",
      view: {
        inspectionId,
        inspectionState,
        listingId: listing.id,
        title,
        location: [listing.area ?? "", listing.city ?? ""].filter((part) => part.length > 0).join(", "),
        moveIn: moveIn < lagosToday() ? lagosToday() : moveIn,
        rentPeriod,
        lines: ledger.lines.map((line) => ({ label: line.label, display: money(line.minor), minor: line.minor })),
        totalStated: ledger.stated,
        totalMinor: ledger.totalMinor,
        totalDisplay: money(ledger.totalMinor),
        currency,
        locale,
        bookingId: charge?.booking_id ?? null,
        bookingStatus,
        paid,
        chargeOpen,
        holdExpiresAt: holdExpiresAtMs !== null ? new Date(holdExpiresAtMs).toISOString() : null,
        holdExpired,
        cardAvailable: isPaystackConfigured(),
        walletBalanceMinor,
        walletBalanceDisplay: money(walletBalanceMinor),
        walletCovers: walletBalanceMinor >= ledger.totalMinor && ledger.totalMinor > 0,
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}

/**
 * A tenant's or lister's rent charges.
 *
 * NOTHING CALLS THIS, AND THE HEADER USED TO CLAIM OTHERWISE. It said "for
 * the trips and earnings surfaces", and neither is true: `/bookings` and
 * `/trips` read tenancies through `getMyBookings`, which branches on
 * `rent_payments` itself and returns them as `groups.rent` in tenancy words,
 * and `/agent/earnings` reads `ledger_entries` through `readAgentEarnings`,
 * which already carries rent money because a rent charge rides the booking
 * rails. So this is dead code rather than the earnings-side reader it was
 * written for, and the accurate sentence is worth more than the flattering
 * one until it is deleted or used.
 *
 * What it alone can still answer, if a surface ever wants it: WHICH tenancy a
 * settled figure belongs to, from the lister's side (`side: "lister"`, under
 * `rent_payments_select_lister`). The earnings page shows the money without
 * naming the inspection behind it.
 */
export type RentChargeSummary = {
  id: string;
  inspectionId: string;
  listingId: string;
  bookingId: string;
  moveIn: string;
  totalMinor: number;
  totalDisplay: string;
  /** "tenant" when the caller pays, "lister" when the caller is paid. */
  side: "tenant" | "lister";
  createdAt: string;
};

export async function getMyRentCharges(locale: Locale): Promise<RentChargeSummary[] | null | "unavailable"> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const { data, error } = await session.supabase
    .from("rent_payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error || !data) return "unavailable";
  return data.map((row) => ({
    id: row.id,
    inspectionId: row.inspection_id,
    listingId: row.listing_id,
    bookingId: row.booking_id,
    moveIn: row.move_in,
    totalMinor: row.total_minor,
    totalDisplay: formatMoney(row.total_minor, locale, row.currency),
    side: row.tenant_id === session.user.id ? "tenant" : "lister",
    createdAt: row.created_at,
  }));
}
