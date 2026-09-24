/**
 * The rows the after-the-gate records add, read defensively.
 *
 * `move_in_quotes` (V-13), `booking_cancellation_terms` (V-20) and
 * `refund_requests` (V-24) arrive in migrations that apply when this
 * branch merges, so the generated `Database` type does not know them yet.
 * They are reached through the untyped view of the caller's own RLS-bound
 * client (the pattern `lib/admin/reads/shared.ts` uses) and every row is read
 * here before a screen sees it: a column the database shaped is still somebody
 * else's payload until it has been read. Anything malformed answers null and
 * the screen renders nothing, which is the claims rule applied to a jsonb.
 *
 * Pure, so the readers are tested without a database.
 */

import type { RentChargeColumns } from "../rent/ledger";

export type MoveInQuoteRow = RentChargeColumns & {
  inspection_id: string;
  listing_id: string;
  currency: string;
  quoted_at: string;
};

function kobo(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** One `move_in_quotes` row, or null. */
export function readMoveInQuote(raw: unknown): MoveInQuoteRow | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const inspection = text(row.inspection_id);
  const listing = text(row.listing_id);
  const quotedAt = text(row.quoted_at);
  const total = kobo(row.total_minor);
  if (!inspection || !listing || !quotedAt || total === null || total <= 0) return null;
  if (typeof row.total_stated !== "boolean") return null;
  const period = row.rent_period === "month" || row.rent_period === "quarter" ? row.rent_period : "year";
  return {
    inspection_id: inspection,
    listing_id: listing,
    quoted_at: quotedAt,
    currency: text(row.currency) ?? "NGN",
    rent_period: period,
    rent_minor: kobo(row.rent_minor),
    caution_minor: kobo(row.caution_minor),
    service_minor: kobo(row.service_minor),
    agency_minor: kobo(row.agency_minor),
    legal_minor: kobo(row.legal_minor),
    agreement_minor: kobo(row.agreement_minor),
    total_minor: total,
    total_stated: row.total_stated,
  };
}

export type RefundRow = {
  id: string;
  bookingId: string;
  paidMinor: number;
  refundMinor: number;
  retainedMinor: number;
  createdAt: string;
  walletEntryId: string | null;
};

/** One `booking_refunds` row as the refund clock needs it, or null. */
export function readRefundRow(raw: unknown): RefundRow | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const id = text(row.id);
  const booking = text(row.booking_id);
  const created = text(row.created_at);
  const paid = kobo(row.paid_minor);
  const refund = kobo(row.refund_minor);
  const retained = kobo(row.retained_minor);
  if (!id || !booking || !created || paid === null || refund === null || retained === null) return null;
  return {
    id,
    bookingId: booking,
    paidMinor: paid,
    refundMinor: refund,
    retainedMinor: retained,
    createdAt: created,
    walletEntryId: text(row.wallet_entry_id),
  };
}

export type RefundRequestRow = {
  id: string;
  bookingId: string;
  requestedAt: string;
  /** Null only if the stamp could not be computed; the screen then shows no date. */
  dueBy: string | null;
};

/** One `refund_requests` row (V-24), or null. */
export function readRefundRequest(raw: unknown): RefundRequestRow | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const id = text(row.id);
  const booking = text(row.booking_id);
  const requested = text(row.requested_at);
  if (!id || !booking || !requested) return null;
  return { id, bookingId: booking, requestedAt: requested, dueBy: text(row.due_by) };
}
