import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import { type Database } from "../supabase/database.types";
import { requireAdmin } from "./guard";
import {
  lagosDayEnd,
  lagosDayStart,
  pageRange,
  takePage,
  type AdminQueueFilter,
} from "./queue-filter";

/**
 * The money console's reads: what we charge, and where each refund is.
 *
 * Vallo holds no customer money (Track A, 25 September 2026). There is no
 * wallet, no ledger of balances and no escrow to show: a payment settles at
 * the processor straight to the lister, the Guarantee reserve and Vallo in
 * one transaction, and a refund goes back to the card. What an operator needs
 * is therefore the fee schedule, the refunds and where each one is at the
 * processor, and (in lib/admin/reads/agreements.ts) the Guarantee reserve.
 *
 * Money is integer kobo throughout. Nothing here divides by a hundred; the
 * formatter at the edge does that once.
 */

/** Every read answers one of these, so a page never renders a fake empty state. */
export type AdminRead<T> = { state: "ok"; data: T } | { state: "unavailable" };

const UNAVAILABLE = { state: "unavailable" } as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GUEST_FANOUT = 50;
export const SUMMARY_LIMIT = 2000;

/* -------------------------------------------------------------- fee rates */

export type FeeRateView = {
  id: string;
  kind: "commission" | "listing_fee";
  basisPoints: number;
  flatMinor: number;
  effectiveFrom: string;
  note: string | null;
  setByName: string | null;
  /** True for the row currently deciding what gets charged. */
  inForce: boolean;
  /** True for a rate dated ahead of now, announced and not yet biting. */
  scheduled: boolean;
};

export type FeeConsole = {
  commission: FeeRateView[];
  listingFee: FeeRateView[];
};

export async function getFeeConsole(): Promise<AdminRead<FeeConsole>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;

  try {
    const { data, error } = await access.supabase
      .from("fee_rates")
      .select("id, kind, basis_points, flat_minor, effective_from, note, created_by")
      .order("effective_from", { ascending: false })
      .limit(100);
    if (error) return UNAVAILABLE;

    const rows = data ?? [];
    const names = await displayNames(
      access.supabase,
      rows.map((r) => r.created_by).filter((id): id is string => Boolean(id)),
    );

    const now = Date.now();
    const byKind = (kind: "commission" | "listing_fee"): FeeRateView[] => {
      const of = rows.filter((r) => r.kind === kind);
      /* The one in force is the newest row not in the future. Computed here the
         same way public.fee_rate_at computes it, because a console that
         disagreed with the function about which rate is live would be worse
         than no console. */
      const live = of.find((r) => Date.parse(r.effective_from) <= now);
      return of.map((r) => ({
        id: r.id,
        kind,
        basisPoints: r.basis_points,
        flatMinor: r.flat_minor,
        effectiveFrom: r.effective_from,
        note: r.note,
        setByName: r.created_by ? (names.get(r.created_by) ?? null) : null,
        inForce: live !== undefined && live.id === r.id,
        scheduled: Date.parse(r.effective_from) > now,
      }));
    };

    return {
      state: "ok",
      data: { commission: byKind("commission"), listingFee: byKind("listing_fee") },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/* ------------------------------------------------------------------ shared */

/**
 * Names for a set of user ids, in one query.
 *
 * profiles carries no email, by design, so a display name is the most a console
 * can show without touching the auth admin API. A person with no display name
 * comes back absent rather than as "Unknown", and the page prints the id, which
 * is what an operator actually needs to search on.
 */
async function displayNames(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return out;
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", unique);
  for (const row of data ?? []) {
    if (row.display_name) out.set(row.id, row.display_name);
  }
  return out;
}

/* ---------------------------------------------------------- refund console */

/**
 * Where a refund's money actually is. Exported for its test.
 *
 * `booking_refunds` records the decision; the money goes back to the card
 * through the processor, and `processor_status` says whether the processor
 * has taken it. A refund of nothing (a cancellation inside the schedule's
 * last tier) is its own state rather than "failed", because nothing was owed.
 */
export type RefundState = "submitted" | "pending" | "failed" | "nothing_owed";

export function refundState(refundMinor: number, processorStatus: string | null): RefundState {
  if (refundMinor <= 0) return "nothing_owed";
  if (processorStatus === "submitted") return "submitted";
  if (processorStatus === "failed") return "failed";
  return "pending";
}

export type RefundView = {
  id: string;
  bookingId: string;
  guestId: string;
  guestName: string | null;
  listingTitle: string | null;
  paidMinor: number;
  refundMinor: number;
  retainedMinor: number;
  reason: string;
  note: string | null;
  reference: string | null;
  state: RefundState;
  decidedByName: string | null;
  createdAt: string;
};

export type RefundConsole = {
  rows: RefundView[];
  full: boolean;
  /** Over every refund on the platform up to `SUMMARY_LIMIT`, never the page. */
  totals: { refundedMinor: number; count: number; notSubmitted: number };
};

/** Every refund decided on the console, newest first, with where its money is. */
export async function getRefundConsole(filter?: AdminQueueFilter): Promise<AdminRead<RefundConsole>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;

  let admin: SupabaseClient<Database>;
  try {
    admin = createAdminClient();
  } catch {
    return UNAVAILABLE;
  }

  const term = (filter?.q ?? "").replace(/[,()*"\\]/g, "").trim();
  const looksLikeId = UUID_RE.test(term);
  const page = pageRange(filter);

  try {
    const everything = await admin
      .from("booking_refunds")
      .select("refund_minor, processor_status")
      .limit(SUMMARY_LIMIT);
    if (everything.error) return UNAVAILABLE;
    const all = everything.data ?? [];
    const totalsBase = {
      refundedMinor: all.reduce((sum, r) => sum + r.refund_minor, 0),
      count: all.length,
      notSubmitted: all.filter((r) => r.refund_minor > 0 && r.processor_status !== "submitted").length,
    };

    let guestIds: string[] | null = null;
    if (term.length > 0 && !looksLikeId) {
      const { data: people, error } = await admin
        .from("profiles")
        .select("id")
        .ilike("display_name", `%${term}%`)
        .limit(60);
      if (error) return UNAVAILABLE;
      guestIds = (people ?? []).map((row) => row.id);
    }

    let select = admin
      .from("booking_refunds")
      .select(
        "id, booking_id, guest_id, paid_minor, refund_minor, retained_minor, reason, note, wallet_reference, processor_status, decided_by, created_at",
      );
    if (term.length > 0) {
      const clauses: string[] = [];
      if (looksLikeId) {
        clauses.push(`booking_id.eq.${term}`, `id.eq.${term}`);
      } else {
        clauses.push(`wallet_reference.ilike.%${term}%`);
        const ids = (guestIds ?? []).slice(0, GUEST_FANOUT);
        if (ids.length > 0) clauses.push(`guest_id.in.(${ids.join(",")})`);
      }
      select = select.or(clauses.join(","));
    }
    if (filter?.from) select = select.gte("created_at", lagosDayStart(filter.from));
    if (filter?.to) select = select.lte("created_at", lagosDayEnd(filter.to));

    const { data, error } = await select.order("created_at", { ascending: false }).range(page.from, page.to);
    if (error) return UNAVAILABLE;

    const { rows, full } = takePage(data ?? []);
    const bookingIds = [...new Set(rows.map((r) => r.booking_id))];
    const [bookingsRes, names] = await Promise.all([
      bookingIds.length > 0
        ? admin.from("bookings").select("id, listing_id, listings ( title )").in("id", bookingIds)
        : Promise.resolve({ data: [] as { id: string; listing_id: string; listings: { title: string } | null }[] }),
      displayNames(admin, rows.flatMap((r) => [r.guest_id, r.decided_by ?? ""])),
    ]);
    const titles = new Map<string, string | null>();
    for (const booking of bookingsRes.data ?? []) titles.set(booking.id, booking.listings?.title ?? null);

    const views: RefundView[] = rows.map((r) => ({
      id: r.id,
      bookingId: r.booking_id,
      guestId: r.guest_id,
      guestName: names.get(r.guest_id) ?? null,
      listingTitle: titles.get(r.booking_id) ?? null,
      paidMinor: r.paid_minor,
      refundMinor: r.refund_minor,
      retainedMinor: r.retained_minor,
      reason: r.reason,
      note: r.note,
      reference: r.wallet_reference,
      state: refundState(r.refund_minor, r.processor_status ?? null),
      decidedByName: r.decided_by ? (names.get(r.decided_by) ?? null) : null,
      createdAt: r.created_at,
    }));

    return { state: "ok", data: { rows: views, full, totals: totalsBase } };
  } catch {
    return UNAVAILABLE;
  }
}
