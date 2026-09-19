import "server-only";

import type { Json } from "../supabase/database.types";
import type { DeletionClient } from "../account-deletion/rpc";

/**
 * Every step of a business handover, written to `public.audit_log`.
 *
 * Same table and same discipline as `lib/account-deletion/audit.ts`, in its
 * own file because the vocabulary is its own: a transfer is not a deletion,
 * and folding its verbs into `DeletionAction` would make the deletion trail
 * read as though it had grown a new kind of step.
 *
 * WHY IT IS WRITTEN DOWN AT ALL. An ownership change is the one act in this
 * product that moves a live business, with its published rooms and its diary,
 * from one person to another. Six months later somebody will ask who agreed to
 * what, and the answer has to be better than a memory. `public.audit_log` has
 * a select policy for admins, no write policy for anybody, and is append-only
 * by trigger.
 *
 * WHAT MAY NEVER GO IN A LINE. No name, no email address, no telephone
 * number. The address the offer was typed against is resolved in the action
 * and dropped there; what reaches this file is an opaque uuid and a verb.
 * Rule 16.
 *
 * BEST EFFORT, ALWAYS. The step this records has already committed. A failed
 * audit insert must never turn a completed handover into an error.
 */

export type TransferAction =
  | "business.transfer.offered"
  | "business.transfer.accepted"
  | "business.transfer.declined"
  | "business.transfer.withdrawn";

export async function writeTransferAudit(
  client: DeletionClient,
  entry: {
    action: TransferAction;
    /** Who acted, as an opaque uuid. */
    actorId: string;
    /** The business that moved, or was offered. */
    businessId: string | null;
    /** The offer row. */
    transferId: string | null;
  },
): Promise<void> {
  try {
    const metadata: Json = {
      ...(entry.transferId ? { transfer_id: entry.transferId } : {}),
      ...(entry.businessId ? { business_id: entry.businessId } : {}),
    };
    await client.from("audit_log").insert({
      actor_id: entry.actorId,
      action: entry.action,
      entity_type: "business",
      entity_id: entry.businessId,
      metadata,
    });
  } catch {
    // Best effort: see the note above.
  }
}
