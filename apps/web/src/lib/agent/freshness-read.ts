import "server-only";

import type { FreshnessRow } from "./freshness";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

/**
 * C5: this agent's live listings with when they were last said to be
 * available. Null when the column is not there yet (the migration is pending)
 * or the read failed, which draws no card rather than a wrong one.
 */
export async function readLiveFreshness(supabase: unknown, agentId: string): Promise<FreshnessRow[] | null> {
  try {
    const { data, error } = await (supabase as Loose)
      .from("listings")
      .select("id, title, published_at, lister_confirmed_at")
      .eq("agent_id", agentId)
      .eq("status", "PUBLISHED")
      .limit(500);
    if (error || !Array.isArray(data)) return null;
    return (data as { id: string; title: string | null; published_at: string | null; lister_confirmed_at: string | null }[]).map(
      (r) => ({ id: r.id, title: r.title ?? "Untitled listing", publishedAt: r.published_at, listerConfirmedAt: r.lister_confirmed_at }),
    );
  } catch {
    return null;
  }
}
