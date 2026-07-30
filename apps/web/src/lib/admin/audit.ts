import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../supabase/database.types";

/**
 * The audit trail.
 *
 * public.audit_log has a select policy for admins and no insert, update or
 * delete policy at all, so the only writer is the service role: history cannot
 * be rewritten by anyone acting as a user, including an admin. Every privileged
 * mutation in the console pairs with one row here carrying who acted, what they
 * did, which record they touched, and the before and after state.
 *
 * Writing the row is best effort by design. The mutation it records has already
 * committed by the time we get here, so a failed log line must not turn a real,
 * completed decision into an error message the admin cannot act on. A missed
 * line is visible as a gap; a rolled-back approval would be a lie.
 */
export type AuditDetail = Record<string, string | number | boolean | null>;

export type AuditEntry = {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  detail?: AuditDetail;
};

export async function writeAudit(
  admin: SupabaseClient<Database>,
  entry: AuditEntry,
): Promise<void> {
  try {
    const metadata: Json = { ...(entry.detail ?? {}) };
    await admin.from("audit_log").insert({
      actor_id: entry.actorId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      metadata,
    });
  } catch {
    // Best effort: see the note above.
  }
}
