import "server-only";

import { requireAdmin } from "../admin/guard";
import { readEddReviews, type EddReview } from "./edd";
import { readRiskFactors, type RiskClass, type RiskFactors } from "./risk-rules";
import { callRpc } from "./rpc";

/**
 * SCUML item 15: the desk read, staff only through `risk_desk`. Never shown to
 * the person. A failed read is "unavailable", never an empty desk.
 */
export type RiskPerson = {
  userId: string;
  name: string;
  riskClass: RiskClass;
  source: "derived" | "override";
  reason: string | null;
  reasons: string[];
  factors: RiskFactors | null;
  setAt: string;
  setByName: string | null;
  reviewDueAt: string;
  eddClear: boolean;
};

export type RiskDesk =
  | { state: "unavailable" }
  | {
      state: "ready";
      viewerId: string;
      counts: { high: number; medium: number; low: number; due: number };
      people: RiskPerson[];
      open: EddReview[];
    };

const CLASSES = new Set(["high", "medium", "low"]);

function count(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function readPeople(v: unknown): RiskPerson[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as Record<string, unknown>;
    if (typeof r.user_id !== "string" || !CLASSES.has(String(r.class))) return [];
    if (typeof r.set_at !== "string" || typeof r.review_due_at !== "string") return [];
    return [
      {
        userId: r.user_id,
        name: typeof r.name === "string" ? r.name : "A member",
        riskClass: r.class as RiskClass,
        source: r.source === "override" ? "override" : "derived",
        reason: typeof r.reason === "string" ? r.reason : null,
        reasons: Array.isArray(r.reasons) ? r.reasons.filter((x): x is string => typeof x === "string") : [],
        factors: readRiskFactors(r.factors),
        setAt: r.set_at,
        setByName: typeof r.set_by_name === "string" ? r.set_by_name : null,
        reviewDueAt: r.review_due_at,
        eddClear: r.edd_clear === true,
      } satisfies RiskPerson,
    ];
  });
}

export async function readRiskDesk(): Promise<RiskDesk> {
  const access = await requireAdmin();
  if (access.state !== "admin") return { state: "unavailable" };
  const { data, error } = await callRpc(access.supabase, "risk_desk");
  if (error || !data || typeof data !== "object") return { state: "unavailable" };
  const d = data as Record<string, unknown>;
  if (!d.counts || typeof d.counts !== "object" || !Array.isArray(d.people) || !Array.isArray(d.open)) {
    return { state: "unavailable" };
  }
  const c = d.counts as Record<string, unknown>;
  return {
    state: "ready",
    viewerId: access.user.id,
    counts: { high: count(c.high), medium: count(c.medium), low: count(c.low), due: count(c.due) },
    people: readPeople(d.people),
    open: readEddReviews(d.open),
  };
}
