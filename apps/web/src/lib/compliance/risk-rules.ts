/**
 * SCUML item 15. THE RISK RULES, IN ONE PURE FUNCTION.
 *
 * SCUML-EFCC AML/CFT Compliance Checklist for DNFBPs, item 15: classify every
 * customer high, medium or low, and apply due diligence to match. These are
 * the only rules. The daily job (lib/compliance/risk-derive.ts) and the staff
 * actions read the factors from `public.risk_factors_for`, call
 * `classifyRisk`, and hand the answer to `public.record_derived_risk_class`,
 * which stores it dated in `public.risk_classes`. The database holds no copy
 * of these thresholds, so there is one place to change them and one test file
 * (risk-rules.test.ts) that pins them.
 *
 * THE DOCUMENTED FACTORS, AND WHAT EACH DOES.
 *
 *   HIGH when any of:
 *     pep                 the person, a family member or a close associate is
 *                         a politically exposed person (SCUML item 20)
 *     sanctions_hit       a sanctions match is open or confirmed (items 8, 9).
 *                         Unknown (not yet screened) never counts either way.
 *     upheld_fraud        a scam or off-platform payment report upheld against
 *                         them, or a stop upheld as fraud (V-90)
 *     volume_very_high    ₦50,000,000 or more moved in the last 90 days
 *   MEDIUM when any of:
 *     lister_unverified   they list homes and their identity rung is not
 *                         passed (an intermediary we have not identified)
 *     open_reports        a report against them is open or under review
 *     volume_reportable   ₦5,000,000 or more moved in the last 90 days, the
 *                         individual threshold of SCUML item 7
 *   LOW otherwise.
 *
 * THE REVIEW CLOCK. High is reviewed every 90 days, medium every year (the
 * longer clock the item asks for), low every three years (the policy review
 * cycle of item 23).
 *
 * NEVER SHOWN TO THE PERSON, NOT A PUBLIC SCORE (V-21). Nothing in this file
 * renders; it is read by the job and the compliance desk only.
 *
 * Founder sign-off: the thresholds above are the engineering reading of the
 * checklist. SCUML item 16 asks the Compliance Officer to domesticate the
 * National Risk Assessment and sign off the classification; these numbers are
 * what they sign or change.
 */

export type RiskClass = "high" | "medium" | "low";

export type RiskFactors = {
  pep: boolean;
  /** null: not screened yet. Never a hit, never clear. */
  sanctionsHit: boolean | null;
  lister: boolean;
  /** 0 to 4, the lister's verification tier; null when not a lister. */
  identityRung: number | null;
  /** Kobo moved in the last 90 days, both sides of every payment. */
  volume90dMinor: number;
  openReports: number;
  upheldFraud: number;
};

export type RiskReason =
  | "pep"
  | "sanctions_hit"
  | "upheld_fraud"
  | "volume_very_high"
  | "lister_unverified"
  | "open_reports"
  | "volume_reportable";

export type RiskVerdict = { riskClass: RiskClass; reasons: RiskReason[] };

/** ₦50,000,000 in kobo. */
export const VOLUME_HIGH_MINOR = 5_000_000_000;
/** ₦5,000,000 in kobo: SCUML item 7's individual threshold. */
export const VOLUME_REPORTABLE_MINOR = 500_000_000;
/** The identity rung of the verification ladder (identity, address, payout, in person). */
export const IDENTITY_RUNG = 1;

export const REVIEW_CLOCK_DAYS: Record<RiskClass, number> = {
  high: 90,
  medium: 365,
  low: 1095,
};

export function classifyRisk(f: RiskFactors): RiskVerdict {
  const high: RiskReason[] = [];
  if (f.pep) high.push("pep");
  if (f.sanctionsHit === true) high.push("sanctions_hit");
  if (f.upheldFraud > 0) high.push("upheld_fraud");
  if (f.volume90dMinor >= VOLUME_HIGH_MINOR) high.push("volume_very_high");
  if (high.length > 0) return { riskClass: "high", reasons: high };

  const medium: RiskReason[] = [];
  if (f.lister && (f.identityRung ?? 0) < IDENTITY_RUNG) medium.push("lister_unverified");
  if (f.openReports > 0) medium.push("open_reports");
  if (f.volume90dMinor >= VOLUME_REPORTABLE_MINOR) medium.push("volume_reportable");
  if (medium.length > 0) return { riskClass: "medium", reasons: medium };

  return { riskClass: "low", reasons: [] };
}

/** When a class set at `from` is next reviewed. */
export function reviewDueAt(riskClass: RiskClass, from: Date): Date {
  return new Date(from.getTime() + REVIEW_CLOCK_DAYS[riskClass] * 86_400_000);
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * `risk_factors_for`'s jsonb, narrowed. A missing or malformed answer is null,
 * never a set of zeroes: classifying on a failed read would write "low".
 */
export function readRiskFactors(data: unknown): RiskFactors | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const r = data as Record<string, unknown>;
  if (typeof r.pep !== "boolean" || typeof r.lister !== "boolean") return null;
  const rung = r.identity_rung;
  return {
    pep: r.pep,
    sanctionsHit: typeof r.sanctions_hit === "boolean" ? r.sanctions_hit : null,
    lister: r.lister,
    identityRung: typeof rung === "number" && Number.isFinite(rung) ? rung : null,
    volume90dMinor: num(r.volume_90d_minor),
    openReports: num(r.open_reports),
    upheldFraud: num(r.upheld_fraud),
  };
}
