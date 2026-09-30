import { REVIEW_REASONS } from "./review-reasons";

/** C8 (d): count reason codes off `listing.review` audit rows. Pure and tested. */
export function countReasons(rows: readonly { metadata: unknown }[]): { code: string; label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const m = row.metadata as { reasons?: unknown; decision?: unknown } | null;
    if (!m || (m.decision !== "reject" && m.decision !== "request_changes")) continue;
    const codes = typeof m.reasons === "string" ? m.reasons.split(",").filter(Boolean) : [];
    for (const code of codes) counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return REVIEW_REASONS.map((r) => ({ code: r.code, label: r.label, count: counts.get(r.code) ?? 0 })).sort((a, b) => b.count - a.count);
}
