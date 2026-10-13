import "server-only";

import { requireAdmin } from "../guard";
import { parseFeeAcceptance, type FeeAcceptance } from "./fee-acceptance";
import { reportReadFault } from "@/lib/observability/read-error";

export type FeeAcceptanceRead =
  | { state: "ok"; acceptance: FeeAcceptance | null }
  | { state: "forbidden" }
  | { state: "unavailable" };

type Rpc = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

/**
 * `current_fee_acceptance(listing)` is a plain invoker function over
 * `listing_fee_acceptances`, whose policy lets staff read every row. The
 * reviewer's client (their own for an admin, the service client for scoped
 * staff, after the listing-approval door has let them in) is the right one.
 */
export async function readFeeAcceptance(listingId: string): Promise<FeeAcceptanceRead> {
  const access = await requireAdmin("listing_approval");
  if (access.state !== "admin") return { state: "forbidden" };
  try {
    const { data, error } = await (access.supabase as unknown as Rpc).rpc("current_fee_acceptance", { p_listing: listingId });
    await reportReadFault("read.admin.fee_acceptance", error);
    if (error) return { state: "unavailable" };
    const parsed = parseFeeAcceptance(data);
    return parsed === "unreadable" ? { state: "unavailable" } : { state: "ok", acceptance: parsed };
  } catch {
    return { state: "unavailable" };
  }
}
