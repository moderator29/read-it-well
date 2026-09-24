import "server-only";

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { callLandlordRpc } from "../landlord/rpc";
import { isShareToken, readSafetyShare, type SafetyShareView } from "./safety";

/**
 * V-61 and V-62 reads. Each fails soft: the surfaces that call them draw
 * nothing new, and what was on the page before stays exactly as it was.
 */

export type MyAgentLookup = {
  /** The agent's code, VA- and five characters. Null when it could not be read. */
  code: string | null;
  /** The last three digits of the registered business number, or null. */
  hint: string | null;
};

/** The signed-in agent's own code and registered number hint. Null on failure. */
export async function readMyAgentLookup(): Promise<MyAgentLookup | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const db = await createClient();
    const { data, error } = await callLandlordRpc(db, "my_agent_lookup", {});
    if (error || !data || typeof data !== "object") return null;
    const row = data as { code?: unknown; hint?: unknown };
    return {
      code: typeof row.code === "string" ? row.code : null,
      hint: typeof row.hint === "string" ? row.hint : null,
    };
  } catch {
    return null;
  }
}

/**
 * V-62: the page a renter's trusted contact opens. Open to anybody with the
 * link; the token is checked against its sha256 inside the database, and a
 * malformed one is never sent at all.
 */
export async function readSafetyShareByToken(token: string): Promise<SafetyShareView> {
  if (!isShareToken(token)) return { state: "unknown" };
  if (!isSupabaseConfigured()) return { state: "failed" };
  try {
    const db = await createClient();
    const { data, error } = await callLandlordRpc(db, "safety_share_read", { p_token: token });
    if (error) return { state: "failed" };
    return readSafetyShare(data);
  } catch {
    return { state: "failed" };
  }
}

/**
 * V-62: which of these inspections the caller has already shared, and whether
 * they have checked in, so "I'm done" survives a reload. Row-level security
 * returns only the caller's own shares. Empty on failure.
 */
export async function readMySafetyShares(
  inspectionIds: readonly string[],
): Promise<Record<string, { checkedIn: boolean }>> {
  if (!isSupabaseConfigured() || inspectionIds.length === 0) return {};
  try {
    const db = await createClient();
    const { data, error } = await (db.from("inspection_safety_shares" as never) as unknown as {
      select: (cols: string) => {
        in: (col: string, values: readonly string[]) => {
          is: (col: string, value: null) => PromiseLike<{ data: { inspection_id?: unknown; checked_in_at?: unknown }[] | null; error: unknown }>;
        };
      };
    })
      .select("inspection_id, checked_in_at")
      .in("inspection_id", inspectionIds.slice(0, 100))
      .is("revoked_at", null);
    if (error || !Array.isArray(data)) return {};
    const out: Record<string, { checkedIn: boolean }> = {};
    for (const row of data) {
      if (typeof row.inspection_id !== "string") continue;
      out[row.inspection_id] = { checkedIn: typeof row.checked_in_at === "string" };
    }
    return out;
  } catch {
    return {};
  }
}
