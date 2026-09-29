import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../supabase/database.types";
import { recordAlert } from "../alerts/record";

/**
 * The audit trail.
 *
 * public.audit_log has a select policy for admins and no insert, update or
 * delete policy at all, so the only writer is the service role: history cannot
 * be rewritten by anyone acting as a user, including an admin. Every privileged
 * mutation in the console pairs with one row here carrying who acted, what they
 * did, which record they touched, and the before and after state.
 *
 * The mutation it records has usually committed by the time we get here, so a
 * failed log line must not turn a real, completed decision into an error the
 * admin cannot act on: a rolled-back approval would be a lie.
 *
 * BUT A FAILED LINE IS NEVER SWALLOWED (29 September). supabase-js reports a
 * failed insert in `error` rather than throwing, and this used to discard it,
 * so a decision could vanish from the trail with nobody told. Now the write is
 * checked and retried once; if it still fails, a CRITICAL operations alert is
 * raised naming the action and the record (the pager fires on it), the failure
 * is logged, and the caller is told (`false`) so it can say so. Decisions that
 * can be made in one database transaction with their audit row (moderation,
 * staff grants, agreements) are made that way instead.
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
): Promise<boolean> {
  const metadata: Json = { ...(entry.detail ?? {}) };
  const row = {
    actor_id: entry.actorId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    metadata,
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { error } = await admin.from("audit_log").insert(row);
      if (!error) return true;
    } catch {
      /* fall through to the retry, then to the alert */
    }
  }
  console.error(`[audit] write failed action=${entry.action} entity=${entry.entityType}:${entry.entityId ?? "-"}`);
  try {
    await recordAlert({
      kind: "audit.write_failed",
      severity: "critical",
      detail: { action: entry.action, entity_type: entry.entityType },
      ...(entry.entityId ? { subjectId: entry.entityId, subjectKind: entry.entityType } : {}),
    });
  } catch {
    /* The console.error above is the last line of defence. */
  }
  return false;
}

/**
 * THE AUDIT ROW THAT MUST EXIST BEFORE THE THING IT RECORDS.
 *
 * An EXPORT is the other way round from a decision: nothing has left the
 * building until the file is sent, and a download of people's names and
 * payments with no trail is exactly the gap an audit log exists to close. So
 * this throws when the row was not written (after `writeAudit`'s retry and
 * alert), and the caller refuses to send the file.
 */
export async function writeAuditOrThrow(
  admin: SupabaseClient<Database>,
  entry: AuditEntry,
): Promise<void> {
  if (!(await writeAudit(admin, entry))) throw new Error("audit write failed");
}
