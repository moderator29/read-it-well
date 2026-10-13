/**
 * The pure half of the withdrawal fee desk: the schedule in force, and the
 * answer `public.withdrawal_fee_quote(amount, at)` gives for one amount.
 * Nothing here computes a fee: the database does, and this only reads it.
 */
export type WithdrawalBand = {
  id: number;
  fromMinor: number;
  toMinor: number | null;
  flatFeeMinor: number | null;
  feeBps: number | null;
  feeCapMinor: number | null;
  confirmed: boolean;
};

export type WithdrawalSchedule = {
  policyVersion: string;
  effectiveFrom: string;
  minimumMinor: number;
  bands: WithdrawalBand[];
};

function whole(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) ? n : null;
}

export function parseSchedule(
  version: Record<string, unknown> | null,
  bands: readonly Record<string, unknown>[] | null,
): WithdrawalSchedule | null {
  if (!version || !bands) return null;
  const minimum = whole(version["withdrawal_min_minor"]);
  if (minimum === null || typeof version["version"] !== "string" || typeof version["effective_from"] !== "string") return null;
  const out: WithdrawalBand[] = [];
  for (const b of bands) {
    const id = whole(b["id"]);
    const from = whole(b["from_minor"]);
    if (id === null || from === null) return null;
    out.push({
      id,
      fromMinor: from,
      toMinor: whole(b["to_minor"]),
      flatFeeMinor: whole(b["flat_fee_minor"]),
      feeBps: whole(b["fee_bps"]),
      feeCapMinor: whole(b["fee_cap_minor"]),
      confirmed: b["confirmed"] === true,
    });
  }
  out.sort((a, b) => a.fromMinor - b.fromMinor);
  return { policyVersion: version["version"], effectiveFrom: version["effective_from"], minimumMinor: minimum, bands: out };
}

/**
 * "250,000" or "250000" or "250000.50" in naira to kobo; `null` for anything
 * else. Never rounds a half kobo: more than two decimals is not an amount.
 */
export function nairaToMinor(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/[,\s]/g, "").replace(/^₦/, "");
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole_, frac = ""] = cleaned.split(".");
  const minor = Number(whole_) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

export type WithdrawalQuote =
  | { status: "ok"; amountMinor: number; feeMinor: number }
  | { status: "below_minimum"; minimumMinor: number }
  | { status: "no_band" | "band_unconfirmed" | "no_policy" | "bad" | "unavailable" };

export function parseQuote(raw: unknown): WithdrawalQuote {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { status: "unavailable" };
  const r = raw as Record<string, unknown>;
  switch (r["status"]) {
    case "ok": {
      const amount = whole(r["amount_minor"]);
      const fee = whole(r["vallo_fee_minor"]);
      return amount !== null && fee !== null && fee >= 0 && fee <= amount
        ? { status: "ok", amountMinor: amount, feeMinor: fee }
        : { status: "unavailable" };
    }
    case "below_minimum": {
      const minimum = whole(r["minimum_minor"]);
      return minimum === null ? { status: "unavailable" } : { status: "below_minimum", minimumMinor: minimum };
    }
    case "no_band":
    case "band_unconfirmed":
    case "no_policy":
      return { status: r["status"] };
    default:
      return { status: "unavailable" };
  }
}
