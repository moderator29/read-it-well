/**
 * V-55. Receipt codes, the pure half.
 *
 * A code is ten Crockford base-32 characters, printed as VR-XXXXX-XXXXX.
 * `normaliseReceiptCode` is the twin of the normalisation inside
 * `public.verify_receipt`: strip a VR prefix, dashes and spaces, upper-case,
 * and read O as 0 and I or L as 1, the three misreadings a person copying a
 * code by hand actually makes. Anything that is then not ten characters of
 * the alphabet is not a code, and is answered before a lookup is spent.
 */

export const RECEIPT_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_RE = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{10}$/;

export function normaliseReceiptCode(raw: string): string | null {
  let value = raw.toUpperCase().replace(/^\s*VR/, "").replace(/[^0-9A-Z]/g, "");
  value = value.replace(/O/g, "0").replace(/[IL]/g, "1");
  return CODE_RE.test(value) ? value : null;
}

export function formatReceiptCode(code: string): string {
  return `VR-${code.slice(0, 5)}-${code.slice(5, 10)}`;
}

export type VerifiedReceipt = {
  paidMinor: number;
  paidAt: string;
  tenant: string | null;
  lister: string | null;
  rentPeriod: "year" | "quarter" | "month";
  area: string | null;
  city: string | null;
  stateCode: string | null;
  parts: Partial<Record<"rent" | "caution" | "service" | "agency" | "legal" | "agreement", number>>;
};

export type VerifyOutcome =
  | { state: "ok"; receipt: VerifiedReceipt }
  | { state: "not_found" }
  | { state: "rate_limited" }
  | { state: "unavailable" };

const PART_KEYS = ["rent", "caution", "service", "agency", "legal", "agreement"] as const;

/** Read `verify_receipt`'s answer. Anything malformed is "unavailable", never a half receipt. */
export function readVerifyAnswer(raw: unknown): VerifyOutcome {
  if (typeof raw !== "object" || raw === null) return { state: "unavailable" };
  const row = raw as Record<string, unknown>;
  if (row.status === "not_found") return { state: "not_found" };
  if (row.status === "rate_limited") return { state: "rate_limited" };
  if (row.status !== "ok") return { state: "unavailable" };
  const paid = typeof row.paid_minor === "number" ? row.paid_minor : Number(row.paid_minor);
  if (!Number.isSafeInteger(paid) || paid <= 0 || typeof row.paid_at !== "string") return { state: "unavailable" };
  const period = row.rent_period === "month" || row.rent_period === "quarter" ? row.rent_period : "year";
  const parts: VerifiedReceipt["parts"] = {};
  const rawParts = typeof row.parts === "object" && row.parts !== null ? (row.parts as Record<string, unknown>) : {};
  for (const key of PART_KEYS) {
    const value = rawParts[key];
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) parts[key] = value;
  }
  const text = (value: unknown) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : null);
  return {
    state: "ok",
    receipt: {
      paidMinor: paid,
      paidAt: row.paid_at,
      tenant: text(row.tenant),
      lister: text(row.lister),
      rentPeriod: period,
      area: text(row.area),
      city: text(row.city),
      stateCode: text(row.state_code),
      parts,
    },
  };
}
