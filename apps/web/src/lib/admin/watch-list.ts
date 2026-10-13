/**
 * D68d: the agreement queue becomes a WATCH LIST over live deals, riskiest
 * first. Pure parsing and words here; the rows come from
 * `public.admin_agreement_watch_list()` (migration d68d), read as the signed-in
 * reviewer so the database decides who may see them.
 */

export type WatchRow = {
  agreementId: string;
  kind: "rent" | "stay";
  agreementStatus: string;
  amountMinor: number;
  rail: "escrow" | "direct" | null;
  reasons: string[];
  riskScore: number;
  needsDecision: boolean;
  since: string;
  arrangementId: string | null;
  heldStatus: string | null;
  releasePaused: boolean;
};

/** The words a reviewer reads for each signal. */
export const SIGNAL_WORDS: Record<string, string> = {
  first_deal: "First deal, and the business unverified or the amount above the threshold",
  amount_over: "Above the review threshold",
  recent_change: "Price or facts changed in the last few days",
  payout_name: "Payout account name does not match the verified name",
  fraud_radar: "Flagged by the fraud radar",
  kill_switch: "Review forced for every deal (incident switch)",
  no_rail: "No payment rail resolves",
};

export function signalWords(reason: string): string {
  return SIGNAL_WORDS[reason] ?? reason;
}

export function parseWatchList(data: unknown): WatchRow[] | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { status?: unknown; rows?: unknown };
  if (d.status !== "ok" || !Array.isArray(d.rows)) return null;
  return d.rows.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as Record<string, unknown>;
    if (typeof r.agreement_id !== "string") return [];
    const reasons = Array.isArray(r.reasons) ? r.reasons.filter((x): x is string => typeof x === "string") : [];
    return [
      {
        agreementId: r.agreement_id,
        kind: r.kind === "stay" ? "stay" : "rent",
        agreementStatus: String(r.agreement_status ?? ""),
        amountMinor: Number(r.amount_minor ?? 0),
        rail: r.rail === "escrow" || r.rail === "direct" ? r.rail : null,
        reasons,
        riskScore: Number(r.risk_score ?? reasons.length),
        needsDecision: r.needs_decision === true,
        since: String(r.since ?? ""),
        arrangementId: typeof r.arrangement_id === "string" ? r.arrangement_id : null,
        heldStatus: typeof r.held_status === "string" ? r.held_status : null,
        releasePaused: typeof r.release_paused_at === "string",
      } satisfies WatchRow,
    ];
  });
}
