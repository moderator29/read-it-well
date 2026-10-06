/**
 * THE RATE AGREEMENT (D51), the pure half: shapes, parsing and the refusal
 * the database raises. Safe to import anywhere.
 *
 * Every figure comes from the database (`public.quote_listing_rate`,
 * `public.accept_listing_rate`, migration b3_rate_agreement_gate). Nothing
 * here computes a fee: a rate in code would be a second source of truth.
 * The wording a lister reads about money is NOT written here; money sentences
 * belong to `lib/money/copy.ts` and need the founder and counsel (7.14).
 */

export type RateQuote = {
  listingId: string;
  policyVersionId: number;
  policyVersion: string;
  amountMinor: number;
  commissionBps: number;
  commissionMinor: number;
  netMinor: number;
  capApplied: boolean;
  /** True when the latest acceptance is on this version AND this price. */
  accepted: boolean;
};

export type RateRefusal =
  | "not_found"
  | "no_policy"
  | "no_price"
  | "rate_changed"
  | "price_changed"
  | "signed_out"
  | "bad_amount"
  | "unavailable";

const KNOWN: readonly RateRefusal[] = [
  "not_found",
  "no_policy",
  "no_price",
  "rate_changed",
  "price_changed",
  "signed_out",
  "bad_amount",
];

function int(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) ? n : null;
}

/** Read the database's answer. Anything malformed is `unavailable`, never a guess. */
export function parseRateQuote(raw: unknown): RateQuote | { refused: RateRefusal } {
  if (!raw || typeof raw !== "object") return { refused: "unavailable" };
  const r = raw as Record<string, unknown>;
  if (r.status !== "ok") {
    const s = r.status as RateRefusal;
    return { refused: KNOWN.includes(s) ? s : "unavailable" };
  }
  const policyVersionId = int(r.policy_version_id);
  const amountMinor = int(r.amount_minor);
  const commissionBps = int(r.commission_bps);
  const commissionMinor = int(r.commission_minor);
  const netMinor = int(r.net_minor);
  if (
    policyVersionId === null ||
    amountMinor === null ||
    commissionBps === null ||
    commissionMinor === null ||
    netMinor === null ||
    commissionMinor < 0 ||
    netMinor < 0 ||
    commissionMinor + netMinor !== amountMinor
  ) {
    return { refused: "unavailable" };
  }
  return {
    listingId: typeof r.listing_id === "string" ? r.listing_id : "",
    policyVersionId,
    policyVersion: typeof r.policy_version === "string" ? r.policy_version : "",
    amountMinor,
    commissionBps,
    commissionMinor,
    netMinor,
    capApplied: r.cap_applied === true,
    accepted: r.accepted === true,
  };
}

/**
 * The publish gate's refusal (`listings_zz_b3_rate_agreement_gate`): 42501
 * with a message starting `rate_agreement_required`. Mapped so the lister is
 * sent to the agreement step rather than told the service is down.
 */
export function isRateAgreementRefusal(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; message?: unknown };
  return e.code === "42501" && typeof e.message === "string" && /^rate_agreement_required\b/.test(e.message);
}

/** Operational sentence for that refusal (not money wording: it names a step). */
export const RATE_AGREEMENT_NEEDED_MESSAGE =
  "Review and accept the fee on this listing's price first, then send it for review.";
