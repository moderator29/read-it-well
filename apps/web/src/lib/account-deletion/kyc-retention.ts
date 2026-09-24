import { purgeStorage } from "./storage";
import type { PurgeDeps } from "./purge";

/**
 * THE END OF AN APPROVED AGENT'S RETAINED IDENTIFICATION.
 *
 * When an approved agent deletes their account, the purge keeps their
 * identification for five years, as the anti money laundering rules require
 * (docs/RETENTION_SCHEDULE.md 3.1), and stamps `kyc_retain_until`. The notice
 * promises it is destroyed then. This is that destruction, run by the daily
 * account-purge job:
 *
 *   1. `due_kyc_destructions` lists who is due, with their document paths.
 *   2. Their folder in `agent-documents` is emptied through the Storage API,
 *      the same sweep a purge uses, so a file the rows forgot still goes.
 *   3. Only when the files are gone does `destroy_expired_kyc` delete the
 *      rows, redact the application and write the audit row. A failed sweep
 *      leaves everything for the next run rather than orphaning files.
 */
export type KycDestructionResult = { due: number; destroyed: number; retried: number; failures: string[] };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function destroyExpiredKyc(
  deps: Pick<PurgeDeps, "rpc" | "storage">,
  limit: number,
): Promise<KycDestructionResult> {
  const answer = record(await deps.rpc("due_kyc_destructions", { p_limit: limit }));
  const users = Array.isArray(answer["users"]) ? answer["users"] : [];

  let destroyed = 0;
  let retried = 0;
  const failures: string[] = [];
  let due = 0;

  for (const entry of users) {
    const row = record(entry);
    const userId = row["user_id"];
    if (typeof userId !== "string") continue;
    due += 1;
    const paths = Array.isArray(row["paths"])
      ? row["paths"].filter((path): path is string => typeof path === "string" && path.length > 0)
      : [];

    const storage = await purgeStorage(deps.storage, userId, { "agent-documents": paths }, ["agent-documents"]);
    if (!storage.clean) {
      retried += 1;
      failures.push(userId);
      continue;
    }
    try {
      const result = record(await deps.rpc("destroy_expired_kyc", { p_user: userId }));
      if (result["destroyed"] === true) destroyed += 1;
    } catch {
      retried += 1;
      failures.push(userId);
    }
  }

  return { due, destroyed, retried, failures };
}
