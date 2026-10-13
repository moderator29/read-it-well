/**
 * The pure half of the call usage desk: the window a range names, and the
 * summary `public.call_usage_summary(from, to)` returns, parsed. A figure the
 * database did not send stays `null`; nothing here fills in a zero for it.
 */
export const CALL_USAGE_RANGES = ["7", "30", "90"] as const;
export type CallUsageRange = (typeof CALL_USAGE_RANGES)[number];
export const DEFAULT_CALL_USAGE_RANGE: CallUsageRange = "30";

export function readCallUsageRange(raw: unknown): CallUsageRange {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return CALL_USAGE_RANGES.find((r) => r === value) ?? DEFAULT_CALL_USAGE_RANGE;
}

/** The half-open window `[from, to)` ending now, `days` long. */
export function callUsageWindow(range: CallUsageRange, now: Date): { from: string; to: string } {
  const to = new Date(now.getTime());
  const from = new Date(to.getTime() - Number(range) * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export type CallUsage = {
  total: number;
  audio: number;
  video: number;
  reviewCalls: number;
  connected: number;
  accepted: number;
  estimatedMinutes: number | null;
  reconciledMinutes: number | null;
  averageDurationSeconds: number | null;
  averageSetupSeconds: number | null;
  withReconnects: number;
  byState: { state: string; count: number }[];
};

function int(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

export function parseCallUsage(raw: unknown): CallUsage | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const total = int(r["total"]);
  if (total === null) return null;
  const states = r["by_state"];
  const byState =
    states && typeof states === "object" && !Array.isArray(states)
      ? Object.entries(states as Record<string, unknown>)
          .map(([state, count]) => ({ state, count: int(count) ?? 0 }))
          .sort((a, b) => b.count - a.count || a.state.localeCompare(b.state))
      : [];
  return {
    total,
    audio: int(r["audio"]) ?? 0,
    video: int(r["video"]) ?? 0,
    reviewCalls: int(r["review_calls"]) ?? 0,
    connected: int(r["connected"]) ?? 0,
    accepted: int(r["accepted"]) ?? 0,
    estimatedMinutes: int(r["estimated_participant_minutes"]),
    reconciledMinutes: int(r["reconciled_participant_minutes"]),
    averageDurationSeconds: int(r["average_duration_seconds"]),
    averageSetupSeconds: int(r["average_setup_seconds"]),
    withReconnects: int(r["calls_with_reconnects"]) ?? 0,
    byState,
  };
}

/** Connected calls as a whole-number percentage of calls started; `null` with no calls. */
export function connectRate(usage: Pick<CallUsage, "total" | "connected">): number | null {
  if (usage.total <= 0) return null;
  return Math.round((usage.connected / usage.total) * 100);
}
