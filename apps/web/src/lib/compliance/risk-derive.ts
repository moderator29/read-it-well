import "server-only";

import { callServiceFunction, type AdminClient } from "../cron/rpc";
import { classifyRisk, readRiskFactors, reviewDueAt } from "./risk-rules";

/**
 * SCUML item 15: derive one person's risk class and store it, dated.
 *
 * Reads the documented factors through `risk_factors_for`, applies the one
 * rule set (`classifyRisk`), and writes through `record_derived_risk_class`,
 * which keeps the history append-only, lets a staff override stand unless the
 * derived class is higher, and opens an EDD review when the class is high.
 * Service role only: nothing here runs as, or is shown to, the person.
 */
export type DeriveOutcome = "written" | "unchanged" | "override_stands";

export async function deriveRiskFor(admin: AdminClient, userId: string, now = new Date()): Promise<DeriveOutcome> {
  const factors = readRiskFactors(await callServiceFunction(admin, "risk_factors_for", { p_user: userId }));
  if (!factors) throw new Error("risk_factors_for: unreadable factors");
  const verdict = classifyRisk(factors);
  const outcome = await callServiceFunction(admin, "record_derived_risk_class", {
    p_user: userId,
    p_class: verdict.riskClass,
    p_factors: {
      pep: factors.pep,
      sanctions_hit: factors.sanctionsHit,
      lister: factors.lister,
      identity_rung: factors.identityRung,
      volume_90d_minor: factors.volume90dMinor,
      open_reports: factors.openReports,
      upheld_fraud: factors.upheldFraud,
    },
    p_reasons: verdict.reasons,
    p_review_due_at: reviewDueAt(verdict.riskClass, now).toISOString(),
  });
  if (outcome === "written" || outcome === "unchanged" || outcome === "override_stands") return outcome;
  throw new Error("record_derived_risk_class: unexpected answer");
}

/** The people whose class is missing, due, or older than a new PEP record or report. */
export async function peopleDue(admin: AdminClient, limit: number): Promise<string[]> {
  const data = await callServiceFunction(admin, "risk_people_due", { p_limit: limit });
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => (row && typeof row === "object" ? (row as Record<string, unknown>).user_id : row))
    .filter((id): id is string => typeof id === "string");
}
