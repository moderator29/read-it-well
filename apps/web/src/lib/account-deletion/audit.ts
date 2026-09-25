import "server-only";

import type { Json } from "../supabase/database.types";
import type { DeletionClient } from "./rpc";

/**
 * Every step of a deletion, written to `public.audit_log`.
 *
 * `audit_log` has a select policy for admins, no insert, update or delete
 * policy for anybody, and is append-only by trigger, so the only writer is the
 * service role. That makes it the right place for this: a deletion is the one
 * thing on the platform that leaves no other trace by design, and a deletion
 * nobody can prove happened is as bad as one that did not.
 *
 * WHAT MAY NEVER GO IN A LINE. No name, no email address, no telephone
 * number, no identity document number, no bank account, no storage path, no
 * restore code. `audit_log` is readable by every admin, so it is a wider
 * audience than a server log and not a narrower one. The vocabulary is an
 * opaque uuid, a count, a status and a short machine-readable reason: exactly
 * the vocabulary `lib/money/audit.ts` already sets for the money path.
 *
 * BEST EFFORT, ALWAYS. The step this records has already committed. A failed
 * audit insert must never turn a completed purge into an error, so every
 * failure here is swallowed. A missing line is a visible gap; a rolled-back
 * deletion would be a lie.
 */

export type DeletionAction =
  | "account.deletion.requested"
  | "account.deletion.refused"
  | "account.deletion.cancelled"
  | "account.deletion.reauth_failed"
  | "account.deletion.purge_started"
  | "account.deletion.commitments_closed"
  | "account.deletion.purge_storage"
  | "account.deletion.purge_completed"
  | "account.deletion.purge_failed";

export type DeletionAuditDetail = Record<string, string | number | boolean | null>;

export async function writeDeletionAudit(
  client: DeletionClient,
  entry: {
    action: DeletionAction;
    /** The subject, as an opaque uuid. Null for a step nobody is signed in for. */
    userId: string | null;
    /** The request row, when there is one. */
    requestId?: string | null;
    detail?: DeletionAuditDetail;
  },
): Promise<void> {
  try {
    const metadata: Json = {
      ...(entry.detail ?? {}),
      ...(entry.requestId ? { request_id: entry.requestId } : {}),
    };
    await client.from("audit_log").insert({
      // Null for the scheduled job: nobody acted, the clock did. The metadata
      // says which, so a null actor is never ambiguous.
      actor_id: entry.userId,
      action: entry.action,
      entity_type: "account",
      entity_id: entry.userId,
      metadata,
    });
  } catch {
    // Best effort: see the note above.
  }
}
