/**
 * PAYLUK PROTECTED PAYMENTS (escrow) for rentals: D73 Part B, phases 11
 * (standard) and 12 (milestone). Founder sections 15 to 17; ADR 0003.
 *
 * Every route, header and field below is in Payluk's own pages, vendored
 * verbatim in `docs/payments/payluk-source/` (fetched 7 October 2026):
 * concepts_how-it-works, concepts_escrow-lifecycle, concepts_milestone-escrows,
 * concepts_webhooks, api-reference_escrow_create-escrow, _verify-payment-token,
 * _list-escrow-transactions, api-reference_milestone-escrow_create-milestone-escrow,
 * _confirm-milestone, api-reference_payments_pay-escrow-buy and
 * api-reference_disputes_buyer-confirm-payment-standard. Where they are silent
 * the line says `UNVERIFIED against live docs:` and does the cautious thing.
 *
 * The facts that govern this file:
 *  - Amounts are naira at the boundary, kobo everywhere else (`koboToNaira`,
 *    `nairaToKobo`, the same pair the member rail uses).
 *  - Creating an escrow takes NO reference of ours, so an unanswered create is
 *    UNKNOWN and is found again by listing the seller's escrows and matching
 *    Vallo's reference, which is written into `description`. It is never
 *    created a second time on a guess.
 *  - Funding takes Vallo's `reference`; an unanswered funding is read back by
 *    that reference (payment history) or by the escrow's own state.
 *  - Nothing is true because a call returned 200: the webhook (or a read-back)
 *    moves Vallo's record. A 200 here only says the provider accepted the ask.
 */

import { koboToNaira, nairaToKobo, paylukRequest, type PaylukContext } from "./payluk-client";
import type { RailFailure, RailFailureKind, RailResult } from "../provider";

export type PaylukMilestone = {
  id: string;
  title: string;
  amountMinor: number;
  /** PENDING, RELEASED, REFUNDED or SPLIT (create-milestone-escrow). */
  status: string;
  releasedAt: string | null;
};

export type PaylukArrangement = {
  id: string;
  paymentToken: string;
  amountMinor: number;
  feeMinor: number;
  additionalFeeMinor: number;
  whoPays: "buyer" | "seller" | "both" | null;
  /** AWAITING_PAYMENT, OPENED or CLOSED. */
  state: string;
  /** PENDING, ONGOING, COMPLETED, REFUNDED, SPLIT, CLAIMED, DISPUTED or INVESTIGATING. */
  status: string;
  description: string;
  settlementType: string;
  milestones: PaylukMilestone[];
};

const str = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

function fail(kind: RailFailureKind, httpStatus: number | null, detail: string): RailFailure {
  return { ok: false, kind, httpStatus, detail: detail.slice(0, 200), retryAfterSeconds: null };
}

const kobo = (v: unknown): number | null => nairaToKobo(v);

/** The `EscrowResponse` shape (create, verify-payment-token, list, webhooks). Null when a load-bearing field is missing. */
export function parseArrangement(data: unknown): PaylukArrangement | null {
  const d = obj(data);
  const id = str(d.id);
  const amountMinor = kobo(d.amount);
  if (!id || amountMinor === null) return null;
  const who = str(d.whoPays);
  const milestones: PaylukMilestone[] = [];
  if (Array.isArray(d.milestones)) {
    for (const raw of d.milestones) {
      const m = obj(raw);
      const amount = kobo(m.amount);
      if (!str(m.id) || amount === null) return null;
      milestones.push({
        id: str(m.id),
        title: str(m.title),
        amountMinor: amount,
        status: str(m.status).toUpperCase(),
        releasedAt: str(m.releasedAt) || null,
      });
    }
  }
  return {
    id,
    paymentToken: str(d.paymentToken),
    amountMinor,
    feeMinor: kobo(d.fee ?? 0) ?? 0,
    additionalFeeMinor: kobo(d.additionalFee ?? 0) ?? 0,
    whoPays: who === "buyer" || who === "seller" || who === "both" ? who : null,
    state: str(d.state).toUpperCase(),
    status: str(d.status).toUpperCase(),
    description: str(d.description),
    settlementType: str(d.settlementType).toUpperCase(),
    milestones,
  };
}

export type ArrangementTerms = {
  /** Vallo's reference, written into `description` so a read-back can find it. */
  reference: string;
  amountMinor: number;
  /** What the renter reads at Payluk. */
  purpose: string;
  whoPays: "buyer" | "seller" | "both";
  /** The delivery window in days (`deliveryWindowDays`). */
  windowDays: number;
};

/** The description carries the reference in one fixed shape, so matching it is exact. */
export function referenceLine(reference: string): string {
  return `Vallo reference ${reference}`;
}

function checkTerms(t: ArrangementTerms): string | null {
  if (!Number.isSafeInteger(t.amountMinor) || t.amountMinor < 100_000) return "The amount is below the provider's minimum of 1000 naira.";
  if (!Number.isInteger(t.windowDays) || t.windowDays < 1 || t.windowDays > 365) return "The delivery window must be 1 to 365 days.";
  if (!t.purpose.trim()) return "A purpose is required.";
  return null;
}

/** Was this the arrangement Vallo asked for? The amount and reference must both match. */
function matches(a: PaylukArrangement, t: { reference: string; amountMinor: number }): boolean {
  return a.amountMinor === t.amountMinor && a.description.includes(referenceLine(t.reference));
}

/**
 * `POST /v1/escrow/create` as the seller (`customer-id`), `multipart/form-data`.
 * `amount`, `purpose`, `whoPays`, `maxDelivery`, `deliveryTimeline` are required.
 */
export async function createStandardArrangement(
  ctx: PaylukContext,
  sellerCustomerId: string,
  terms: ArrangementTerms,
): Promise<RailResult<PaylukArrangement>> {
  const bad = checkTerms(terms);
  if (bad) return fail("refused", null, bad);
  const r = await paylukRequest(ctx, {
    method: "POST",
    path: "/v1/escrow/create",
    customerId: sellerCustomerId,
    form: {
      amount: String(koboToNaira(terms.amountMinor)),
      purpose: terms.purpose.slice(0, 120),
      description: referenceLine(terms.reference),
      whoPays: terms.whoPays,
      maxDelivery: String(terms.windowDays),
      deliveryTimeline: "days",
      totalQuantity: "1",
    },
    mutates: true,
  });
  if (!r.ok) return r;
  const a = parseArrangement(r.data);
  if (!a) return fail("unknown", 200, "Created, but the answer was unreadable.");
  /* UNVERIFIED against live docs: that `description` is echoed on the create
     response. When it is absent only the amount is compared here; the
     read-back match still requires it. */
  if (a.amountMinor !== terms.amountMinor || (a.description && !matches(a, terms))) {
    return fail("unknown", 200, "The created escrow does not match the request (amount or reference).");
  }
  return { ok: true, value: a };
}

export type MilestoneTerms = ArrangementTerms & {
  milestones: { title: string; description?: string | null; amountMinor: number }[];
};

/**
 * `POST /v1/escrow/milestone/create` as the seller, JSON. At least 2
 * milestones, each at least 1 naira, summing to `amount`.
 */
export async function createMilestoneArrangement(
  ctx: PaylukContext,
  sellerCustomerId: string,
  terms: MilestoneTerms,
): Promise<RailResult<PaylukArrangement>> {
  const bad = checkTerms(terms);
  if (bad) return fail("refused", null, bad);
  const ms = terms.milestones;
  if (ms.length < 2) return fail("refused", null, "At least two milestones.");
  if (ms.some((m) => !Number.isSafeInteger(m.amountMinor) || m.amountMinor < 100 || !m.title.trim())) {
    return fail("refused", null, "Every milestone needs a title and at least 1 naira.");
  }
  if (ms.reduce((sum, m) => sum + m.amountMinor, 0) !== terms.amountMinor) {
    return fail("refused", null, "The milestones must sum to the amount.");
  }
  const r = await paylukRequest(ctx, {
    method: "POST",
    path: "/v1/escrow/milestone/create",
    customerId: sellerCustomerId,
    body: {
      amount: koboToNaira(terms.amountMinor),
      purpose: terms.purpose.slice(0, 120),
      description: referenceLine(terms.reference),
      whoPays: terms.whoPays,
      maxDelivery: terms.windowDays,
      deliveryTimeline: "days",
      totalQuantity: 1,
      milestones: ms.map((m) => ({
        title: m.title.slice(0, 120),
        ...(m.description ? { description: m.description.slice(0, 500) } : {}),
        amount: koboToNaira(m.amountMinor),
      })),
    },
    mutates: true,
  });
  if (!r.ok) return r;
  const a = parseArrangement(r.data);
  if (!a) return fail("unknown", 200, "Created, but the answer was unreadable.");
  const sameMilestones =
    a.milestones.length === ms.length && a.milestones.every((m, i) => m.amountMinor === ms[i]!.amountMinor);
  if (a.amountMinor !== terms.amountMinor || !sameMilestones || (a.description && !matches(a, terms))) {
    return fail("unknown", 200, "The created milestone escrow does not match the request.");
  }
  return { ok: true, value: a };
}

/** `GET /v1/escrow/verify/{paymentToken}`: the escrow as the provider holds it now. */
export async function readArrangement(ctx: PaylukContext, paymentToken: string): Promise<RailResult<PaylukArrangement>> {
  const r = await paylukRequest(ctx, { method: "GET", path: `/v1/escrow/verify/${encodeURIComponent(paymentToken)}`, mutates: false });
  if (!r.ok) return r;
  const a = parseArrangement(r.data);
  return a ? { ok: true, value: a } : fail("unreadable", 200, "Unreadable escrow.");
}

/**
 * Find an escrow Vallo asked for whose create went unanswered:
 * `GET /v1/escrow/transactions?type=sales` as the seller, matched on the
 * amount and on Vallo's reference in the description. Null when it is not
 * there, which means nothing was created OR the list has not caught up: the
 * caller keeps the record UNKNOWN and asks again later, never creates again.
 * UNVERIFIED against live docs: the page and limit parameter names (the
 * schema names them only by `$ref`) and whether 50 is accepted; only the
 * first page is read, newest first.
 */
export async function findArrangement(
  ctx: PaylukContext,
  sellerCustomerId: string,
  wanted: { reference: string; amountMinor: number },
): Promise<RailResult<PaylukArrangement | null>> {
  const r = await paylukRequest(ctx, {
    method: "GET",
    path: "/v1/escrow/transactions",
    customerId: sellerCustomerId,
    query: { type: "sales", page: "1", limit: "50" },
    mutates: false,
  });
  if (!r.ok) return r;
  const rows = Array.isArray(obj(r.data).data) ? (obj(r.data).data as unknown[]) : Array.isArray(r.data) ? (r.data as unknown[]) : null;
  if (!rows) return fail("unreadable", 200, "Unreadable escrow list.");
  const found = rows.map(parseArrangement).filter((a): a is PaylukArrangement => a !== null && matches(a, wanted));
  /* Two escrows carrying one reference is a contradiction a person reads. */
  if (found.length > 1) return fail("unknown", 200, "More than one escrow carries this reference.");
  return { ok: true, value: found[0] ?? null };
}

/**
 * What the buyer must pay to fund it (pay-escrow-buy): the amount, plus the
 * buyer's share of the fee (all of it for `buyer`, half for `both`, none for
 * `seller`), plus `additionalFee`. Null when the share would be half a kobo or
 * `whoPays` is unreadable: the provider would answer `Amount mismatch` to a
 * guess, so Vallo does not guess.
 * UNVERIFIED against live docs: how Payluk rounds half of an odd-kobo fee.
 */
export function buyerOwesMinor(a: PaylukArrangement): number | null {
  if (a.whoPays === null) return null;
  let share = 0;
  if (a.whoPays === "buyer") share = a.feeMinor;
  if (a.whoPays === "both") {
    if (a.feeMinor % 2 !== 0) return null;
    share = a.feeMinor / 2;
  }
  return a.amountMinor + share + a.additionalFeeMinor;
}

/**
 * `POST /v1/payment/escrow` as the buyer, from the buyer's Payluk balance
 * (`gateway: wallet`; topped up beforehand through the member rail's
 * deposit). Vallo's `reference` is the idempotency key. A success means the
 * escrow is OPENED; Vallo still waits for `escrow.ongoing` (or a read-back).
 */
export async function fundArrangement(
  ctx: PaylukContext,
  buyerCustomerId: string,
  input: { arrangementId: string; reference: string; owedMinor: number },
): Promise<RailResult<{ reference: string }>> {
  const r = await paylukRequest(ctx, {
    method: "POST",
    path: "/v1/payment/escrow",
    customerId: buyerCustomerId,
    body: {
      amount: koboToNaira(input.owedMinor),
      reference: input.reference,
      transactionType: "escrow",
      gateway: "wallet",
      escrowDetails: { escrowId: input.arrangementId },
    },
    mutates: true,
  });
  if (!r.ok) return r;
  const d = obj(r.data);
  if (str(d.reference) !== input.reference) return fail("unknown", 200, "Funded, but the answer names another reference.");
  return { ok: true, value: { reference: input.reference } };
}

/** `POST /v1/escrow/confirm-payment/{escrowId}` as the buyer: release a standard escrow to the seller. */
export async function confirmRelease(
  ctx: PaylukContext,
  buyerCustomerId: string,
  arrangementId: string,
): Promise<RailResult<true>> {
  const r = await paylukRequest(ctx, {
    method: "POST",
    path: `/v1/escrow/confirm-payment/${encodeURIComponent(arrangementId)}`,
    customerId: buyerCustomerId,
    mutates: true,
  });
  return r.ok ? { ok: true, value: true } : r;
}

/** `POST /v1/escrow/milestone/confirm/{escrowId}/{milestoneId}` as the buyer: release one milestone. */
export async function confirmMilestone(
  ctx: PaylukContext,
  buyerCustomerId: string,
  arrangementId: string,
  milestoneId: string,
): Promise<RailResult<true>> {
  const r = await paylukRequest(ctx, {
    method: "POST",
    path: `/v1/escrow/milestone/confirm/${encodeURIComponent(arrangementId)}/${encodeURIComponent(milestoneId)}`,
    customerId: buyerCustomerId,
    mutates: true,
  });
  return r.ok ? { ok: true, value: true } : r;
}
