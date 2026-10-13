import "server-only";

import { requireAdmin } from "../guard";
import {
  parseDbJobs,
  parseDeletions,
  parseHeldEvents,
  parseNotifications,
  parseOutbox,
  parseRecon,
  parseTransfers,
  settle,
  type OpsRead,
  type OpsReads,
  type RpcError,
} from "./ops-panels-model";

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: RpcError }> };

const MISSING: OpsRead<never> = { state: "missing" };

/**
 * Reads the seven staff functions of draft op01_operations_reads.sql on the
 * caller's OWN session (the functions check `staff_can(auth.uid(), ...)`; the
 * service role has no auth.uid() and must never be the way round). Until the
 * draft is applied every read is `missing` and the panels keep their note.
 */
export async function getOpsReads(): Promise<OpsReads> {
  const access = await requireAdmin("operations");
  if (access.state !== "admin") {
    return { deletions: MISSING, transfers: MISSING, dbJobs: MISSING, recon: MISSING, notifications: MISSING, outbox: MISSING, held: MISSING };
  }
  const db = access.userClient as unknown as Rpc;
  const call = async <T,>(fn: string, parse: (d: unknown) => T | null, args?: Record<string, unknown>): Promise<OpsRead<T>> => {
    try {
      return settle(await db.rpc(fn, args), parse);
    } catch {
      return { state: "unavailable" };
    }
  };
  const [deletions, transfers, dbJobs, recon, notifications, outbox, held] = await Promise.all([
    call("staff_ops_account_deletions", parseDeletions),
    call("staff_ops_business_transfers", parseTransfers),
    call("staff_ops_database_jobs", parseDbJobs),
    call("staff_ops_reconciliation", parseRecon),
    call("staff_ops_notifications", parseNotifications, { p_days: 7 }),
    call("staff_ops_email_outbox", parseOutbox),
    call("staff_ops_held_events", parseHeldEvents),
  ]);
  return { deletions, transfers, dbJobs, recon, notifications, outbox, held };
}
