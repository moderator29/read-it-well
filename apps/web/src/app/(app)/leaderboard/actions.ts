"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveWriteSession } from "@/lib/actions/session";

/**
 * The leaderboard opt-out (D76): hide or show the member, or one business
 * they own. The database function checks ownership; this only forwards the
 * member's own session. A "use server" module exports async functions only.
 */
export async function setLeaderboardHidden(hidden: boolean, businessId?: string): Promise<{ ok: boolean }> {
  const session = await resolveWriteSession();
  if (session.state !== "signed-in") return { ok: false };
  const db = session.supabase as unknown as SupabaseClient;
  const { error } = await db.rpc("leaderboard_set_hidden", {
    p_hidden: hidden === true,
    p_business: typeof businessId === "string" && businessId ? businessId : null,
  });
  if (error) return { ok: false };
  revalidatePath("/leaderboard");
  return { ok: true };
}
