import "server-only";

import { hasServiceRole } from "../security/service-rpc";
import { createAdminClient } from "../supabase/admin";

/**
 * THE REAL REASON, FOR STAFF ONLY (no-enumeration ruling, 13 October 2026).
 *
 * The member is told one neutral sentence whenever a number is refused. Staff
 * still need to know why, to help the person who writes in: so the
 * database's own word is written to the audit trail, against the member's
 * own account, as `phone.number_refused`. The person file
 * (`/admin/people/[id]`, Account) reads the latest one, and the shared-phone
 * match on the same page names the other account (compared inside the
 * database, never shown as digits).
 *
 * No digits of the number are written: the trail says why, not what. It runs
 * after the reply (`after()` at the caller), so the refusal takes the same
 * time whatever the reason, and a failed write costs only this line.
 */
export type NumberRefusedReason = "taken" | "invalid" | "taken_on_confirm";

export const NUMBER_REFUSED_ACTION = "phone.number_refused";

export async function recordNumberRefused(userId: string, reason: NumberRefusedReason): Promise<void> {
  if (!hasServiceRole()) return;
  try {
    await (createAdminClient() as unknown as {
      from(t: string): { insert(row: Record<string, unknown>): PromiseLike<{ error: unknown }> };
    })
      .from("audit_log")
      .insert({
        actor_id: userId,
        action: NUMBER_REFUSED_ACTION,
        entity_type: "user",
        entity_id: userId,
        metadata: { reason },
      });
  } catch {
    /* Best effort: the member's answer never depends on this line. */
  }
}
