import "server-only";

import { getAgentContext } from "../agent/listings-queries";
import { createShareLink } from "./actions";

/**
 * V-71: WHAT THE LISTER'S STATUS PAGE NEEDS. Ownership is proven the way the
 * calendar proves it (the listing read under the agent's own client and
 * matched to their agent row); the lister's own door is minted (or the live
 * one returned) through `create_share_link`, which records them as its
 * creator; and their counts come from `status_stats`, which answers only the
 * listing's own lister.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StatusRead =
  | { state: "ready"; token: string; path: string; stats: { opens: number; enquiries: number } | null }
  | { state: "signed-out" | "not-agent" | "missing" | "not-live" | "example" | "unavailable" };

type Rpc = (fn: "status_stats", args: { p_listing: string }) => PromiseLike<{ data: unknown; error: unknown }>;

export async function readStatusKit(listingId: string): Promise<StatusRead> {
  if (!UUID_RE.test(listingId)) return { state: "missing" };
  const context = await getAgentContext();
  if (context.state === "unconfigured") return { state: "unavailable" };
  if (context.state === "signed-out") return { state: "signed-out" };
  if (context.state === "not-agent") return { state: "not-agent" };
  try {
    const { data, error } = await context.supabase
      .from("listings")
      .select("id, agent_id, status, is_demo")
      .eq("id", listingId)
      .maybeSingle();
    if (error) return { state: "unavailable" };
    if (!data || data.agent_id !== context.agent.id) return { state: "missing" };
    if (data.is_demo) return { state: "example" };
    if (data.status !== "PUBLISHED") return { state: "not-live" };

    const door = await createShareLink({ kind: "listing", targetId: listingId });
    if (!door.ok) return { state: "unavailable" };
    const token = door.data.path.replace(/^\/s\//, "");

    const rpc = context.supabase.rpc.bind(context.supabase) as unknown as Rpc;
    const { data: stats, error: statsError } = await rpc("status_stats", { p_listing: listingId });
    const row = Array.isArray(stats) ? (stats[0] as { opens?: number; enquiries?: number } | undefined) : undefined;
    return {
      state: "ready",
      token,
      path: door.data.path,
      stats: statsError || !row ? null : { opens: Number(row.opens ?? 0), enquiries: Number(row.enquiries ?? 0) },
    };
  } catch {
    return { state: "unavailable" };
  }
}
