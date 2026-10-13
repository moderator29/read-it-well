import "server-only";

import { requireAdmin } from "../guard";
import { callUsageWindow, parseCallUsage, type CallUsage, type CallUsageRange } from "./call-usage";

export type CallUsageRead =
  | { state: "ok"; usage: CallUsage; from: string; to: string }
  | { state: "forbidden" }
  | { state: "unavailable" };

type Rpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

/**
 * `public.call_usage_summary` decides on `auth.uid()` (the operations scope),
 * so it is asked on the operator's OWN client, never the service role's.
 */
export async function readCallUsage(range: CallUsageRange, now: Date = new Date()): Promise<CallUsageRead> {
  const access = await requireAdmin("operations");
  if (access.state !== "admin") return { state: "forbidden" };
  const { from, to } = callUsageWindow(range, now);
  try {
    const { data, error } = await (access.userClient as unknown as Rpc).rpc("call_usage_summary", {
      p_from: from,
      p_to: to,
    });
    if (error) return { state: "unavailable" };
    const usage = parseCallUsage(data);
    return usage ? { state: "ok", usage, from, to } : { state: "unavailable" };
  } catch {
    return { state: "unavailable" };
  }
}
