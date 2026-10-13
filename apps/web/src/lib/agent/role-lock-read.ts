import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { reportReadError } from "@/lib/observability/read-error";
import { resolveSession } from "../actions/session";
import { HOLDING_STATUSES, heldOtherSide, type SupplySide } from "./role-lock";

/** The same answer for the signed-in caller, for the setup pages. */
export async function myOtherSideHeld(wanted: SupplySide): Promise<SupplySide | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  return otherSideHeld(session.supabase, session.user.id, wanted);
}

/**
 * Read, through the caller's own RLS-bound client, whether this account
 * already holds the other supply side (`role-lock.ts`). A read that fails
 * answers null: the database guard in the pending migration is the backstop,
 * and a failed read must not lock somebody out of their own form.
 */
export async function otherSideHeld(
  supabase: SupabaseClient<Database>,
  userId: string,
  wanted: SupplySide,
): Promise<SupplySide | null> {
  try {
    const [agent, applications] = await Promise.all([
      supabase.from("agents").select("role").eq("user_id", userId).maybeSingle(),
      supabase
        .from("agent_applications")
        .select("status, supply_role")
        .eq("user_id", userId)
        .in("status", [...HOLDING_STATUSES]),
    ]);
    await reportReadError("read.agent.role_lock", agent.error, applications.error);
    if (agent.error || applications.error) return null;
    const role = (agent.data as { role?: string | null } | null)?.role ?? null;
    return heldOtherSide(wanted, role, (applications.data ?? []) as { status: string; supply_role: string | null }[]);
  } catch {
    return null;
  }
}
