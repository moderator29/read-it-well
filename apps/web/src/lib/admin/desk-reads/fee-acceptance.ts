/**
 * The pure half of the fee-acceptance panel on the listing review desk: the
 * row `public.current_fee_acceptance(listing, at)` returns, parsed. It is the
 * lister's latest acceptance of the fee terms for this listing, by the person
 * who owns it now (an acceptance by a previous owner is not returned).
 */
export type FeeAcceptance = {
  id: string;
  acceptedAt: string;
  termsVersion: string;
  policyVersion: string;
  rentMinor: number;
  commissionBps: number;
  protectionBps: number;
  feeLowMinor: number;
  feeHighMinor: number;
  receiveLowMinor: number;
  receiveHighMinor: number;
};

function whole(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) ? n : null;
}

/** `null` when there is no acceptance; `"unreadable"` when a row came back that does not parse. */
export function parseFeeAcceptance(raw: unknown): FeeAcceptance | null | "unreadable" {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return "unreadable";
  const r = raw as Record<string, unknown>;
  /* A composite-returning function with no match answers an object of nulls. */
  if (r["id"] === null || r["id"] === undefined) return null;
  const rent = whole(r["rent_minor"]);
  const low = whole(r["fee_low_minor"]);
  const high = whole(r["fee_high_minor"]);
  const rLow = whole(r["receive_low_minor"]);
  const rHigh = whole(r["receive_high_minor"]);
  const commission = whole(r["commission_bps"]);
  const protection = whole(r["protection_bps"]);
  if (
    typeof r["id"] !== "string" ||
    typeof r["accepted_at"] !== "string" ||
    typeof r["terms_version"] !== "string" ||
    rent === null ||
    low === null ||
    high === null ||
    rLow === null ||
    rHigh === null ||
    commission === null ||
    protection === null
  ) {
    return "unreadable";
  }
  return {
    id: r["id"],
    acceptedAt: r["accepted_at"],
    termsVersion: r["terms_version"],
    policyVersion: typeof r["policy_version"] === "string" ? r["policy_version"] : "",
    rentMinor: rent,
    commissionBps: commission,
    protectionBps: protection,
    feeLowMinor: low,
    feeHighMinor: high,
    receiveLowMinor: rLow,
    receiveHighMinor: rHigh,
  };
}
