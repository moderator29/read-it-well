/**
 * THE FEE ACCEPTANCE RECORD (D61), the pure half: shapes and parsing. Safe to
 * import anywhere.
 *
 * Every figure comes from the database (`public.fee_terms_quote`,
 * `public.accept_fee_terms`, migration b3_fee_acceptance_record). Nothing here
 * computes a fee: the range is anchored on the worst case (Vallo commission
 * plus escrow protection) and the server refuses any acceptance whose figures
 * differ from its own. The wording of money sentences belongs to
 * `lib/money/copy.ts`, not here.
 */

/**
 * The version of the fee terms text the lister is shown. A date, like
 * `TERMS_VERSION`. Bump it when what a lister agrees to changes; the next
 * acceptance writes a new row and the old one stays. The database only checks
 * its shape (YYYY-MM-DD or YYYY-MM-DD.N).
 */
export const FEE_TERMS_VERSION = "2026-10-06";

export type FeeTermsQuote = {
  listingId: string;
  policyVersionId: number;
  policyVersion: string;
  protectionRateId: number;
  commissionBps: number;
  protectionBps: number;
  rentMinor: number;
  /** Vallo's commission: the fee on the direct rail. */
  commissionMinor: number;
  /** Escrow protection, only when a buyer pays into escrow. */
  protectionMinor: number;
  feeLowMinor: number;
  feeHighMinor: number;
  /** Worst case: the headline. */
  receiveLowMinor: number;
  receiveHighMinor: number;
  capApplied: boolean;
  /** The latest record covers this policy, protection rate and rent (terms version checked separately). */
  accepted: boolean;
  acceptedTermsVersion: string | null;
  acceptanceId: string | null;
};

export type FeeTermsRefusal =
  | "not_found"
  | "no_policy"
  | "no_price"
  | "rate_changed"
  | "price_changed"
  | "figures_mismatch"
  | "bad_terms_version"
  | "signed_out"
  | "bad_amount"
  | "unavailable";

const KNOWN: readonly FeeTermsRefusal[] = [
  "not_found",
  "no_policy",
  "no_price",
  "rate_changed",
  "price_changed",
  "figures_mismatch",
  "bad_terms_version",
  "signed_out",
  "bad_amount",
];

function int(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) ? n : null;
}

/** Read the database's answer. Anything malformed or inconsistent is `unavailable`, never a guess. */
export function parseFeeTermsQuote(raw: unknown): FeeTermsQuote | { refused: FeeTermsRefusal } {
  if (!raw || typeof raw !== "object") return { refused: "unavailable" };
  const r = raw as Record<string, unknown>;
  if (r.status !== "ok") {
    const s = r.status as FeeTermsRefusal;
    return { refused: KNOWN.includes(s) ? s : "unavailable" };
  }
  const n = {
    policyVersionId: int(r.policy_version_id),
    protectionRateId: int(r.protection_rate_id),
    commissionBps: int(r.commission_bps),
    protectionBps: int(r.protection_bps),
    rentMinor: int(r.rent_minor),
    commissionMinor: int(r.commission_minor),
    protectionMinor: int(r.protection_minor),
    feeLowMinor: int(r.fee_low_minor),
    feeHighMinor: int(r.fee_high_minor),
    receiveLowMinor: int(r.receive_low_minor),
    receiveHighMinor: int(r.receive_high_minor),
  };
  if (Object.values(n).some((v) => v === null || v < 0)) return { refused: "unavailable" };
  const v = n as { [K in keyof typeof n]: number };
  const consistent =
    v.rentMinor > 0 &&
    v.feeLowMinor === v.commissionMinor &&
    v.feeHighMinor === v.commissionMinor + v.protectionMinor &&
    v.feeLowMinor + v.receiveHighMinor === v.rentMinor &&
    v.feeHighMinor + v.receiveLowMinor === v.rentMinor;
  if (!consistent) return { refused: "unavailable" };
  return {
    ...v,
    listingId: typeof r.listing_id === "string" ? r.listing_id : "",
    policyVersion: typeof r.policy_version === "string" ? r.policy_version : "",
    capApplied: r.cap_applied === true,
    accepted: r.accepted === true,
    acceptedTermsVersion: typeof r.accepted_terms_version === "string" ? r.accepted_terms_version : null,
    acceptanceId: typeof r.acceptance_id === "string" ? r.acceptance_id : null,
  };
}

/**
 * Whether the lister must be asked (again). D51: they keep the rate they
 * accepted until they accept a new one, so any change of policy, protection
 * rate, price or terms text re-prompts rather than applying silently.
 */
export function needsFeeAcceptance(q: FeeTermsQuote, termsVersion: string = FEE_TERMS_VERSION): boolean {
  return !q.accepted || q.acceptedTermsVersion !== termsVersion;
}

/** The arguments for `public.accept_fee_terms`: exactly the figures that were shown. */
export function acceptFeeTermsArgs(q: FeeTermsQuote, termsVersion: string = FEE_TERMS_VERSION) {
  return {
    p_listing: q.listingId,
    p_terms_version: termsVersion,
    p_policy_version: q.policyVersionId,
    p_protection_rate: q.protectionRateId,
    p_rent_minor: q.rentMinor,
    p_fee_low_minor: q.feeLowMinor,
    p_fee_high_minor: q.feeHighMinor,
    p_receive_low_minor: q.receiveLowMinor,
    p_receive_high_minor: q.receiveHighMinor,
  };
}
