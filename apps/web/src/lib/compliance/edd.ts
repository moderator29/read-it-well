/**
 * SCUML items 20 and 15: an enhanced due diligence review as the lanes draw
 * it, narrowed from `private.edd_review_json`. Pure; shared by both lanes.
 */
export type EddDecision = {
  id: string;
  sourceOfFunds: string;
  outcome: "cleared" | "refer";
  note: string | null;
  decidedBy: string | null;
  decidedByName: string;
  decidedAt: string;
  approvedByName: string | null;
  approvedAt: string | null;
};

export type EddReview = {
  id: string;
  userId: string | null;
  name: string;
  item: 15 | 20;
  reason: "transaction" | "declaration" | "staff_flag" | "high_risk" | "reopened" | "member_account";
  sourceTable: string;
  amountMinor: number | null;
  raisedAt: string;
  decision: EddDecision | null;
};

const REASONS = new Set(["transaction", "declaration", "staff_flag", "high_risk", "reopened", "member_account"]);

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function readDecision(v: unknown): EddDecision | null {
  if (!v || typeof v !== "object") return null;
  const d = v as Record<string, unknown>;
  const id = str(d.id);
  const decidedAt = str(d.decided_at);
  if (!id || !decidedAt || (d.outcome !== "cleared" && d.outcome !== "refer")) return null;
  return {
    id,
    sourceOfFunds: str(d.source_of_funds) ?? "",
    outcome: d.outcome,
    note: str(d.note),
    decidedBy: str(d.decided_by),
    decidedByName: str(d.decided_by_name) ?? "A member of staff",
    decidedAt,
    approvedByName: str(d.approved_by_name),
    approvedAt: str(d.approved_at),
  };
}

export function readEddReviews(v: unknown): EddReview[] {
  if (!Array.isArray(v)) return [];
  const out: EddReview[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const id = str(r.id);
    const raisedAt = str(r.raised_at);
    if (!id || !raisedAt || !REASONS.has(String(r.reason)) || (r.item !== 15 && r.item !== 20)) continue;
    const amount = typeof r.amount_minor === "number" ? r.amount_minor : Number(r.amount_minor);
    out.push({
      id,
      userId: str(r.user_id),
      name: str(r.name) ?? "A member",
      item: r.item,
      reason: r.reason as EddReview["reason"],
      sourceTable: str(r.source_table) ?? "",
      amountMinor: r.amount_minor == null || !Number.isFinite(amount) ? null : amount,
      raisedAt,
      decision: readDecision(r.decision),
    });
  }
  return out;
}

/** Where a review stands for the operator looking at it. */
export type EddStage = "undecided" | "awaiting_second" | "own_decision" | "approved";

export function eddStage(review: EddReview, viewerId: string): EddStage {
  const d = review.decision;
  if (!d) return "undecided";
  if (d.approvedAt) return "approved";
  return d.decidedBy === viewerId ? "own_decision" : "awaiting_second";
}
