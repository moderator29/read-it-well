import "server-only";

import { requireAdmin } from "../guard";
import { parseRetentionPreview, type RetentionPreview } from "./retention";
import { reportReadFault } from "@/lib/observability/read-error";

export type RetentionRead =
  | { state: "ok"; preview: RetentionPreview; canDestroy: boolean }
  | { state: "forbidden" }
  /** The ac01 functions are not on this database yet. */
  | { state: "not_installed" }
  | { state: "unavailable" };

type Rpc = { rpc: (fn: string) => PromiseLike<{ data: unknown; error: { code?: string } | null }> };

/** PostgREST says PGRST202 for a function it does not know; Postgres says 42883. */
export function isMissingFunction(error: { code?: string } | null): boolean {
  return error?.code === "PGRST202" || error?.code === "42883";
}

/**
 * The dry run. `staff_money_retention_preview` decides on `auth.uid()`
 * (admin or super admin, finance scope, security-key proof), so it is asked
 * on the operator's own client. Only a super admin is offered the destroy.
 */
export async function readRetention(): Promise<RetentionRead> {
  const access = await requireAdmin("finance");
  if (access.state !== "admin") return { state: "forbidden" };
  try {
    const { data, error } = await (access.userClient as unknown as Rpc).rpc("staff_money_retention_preview");
    await reportReadFault("read.admin.retention", error);
    if (error) {
      if (isMissingFunction(error)) return { state: "not_installed" };
      return error.code === "42501" ? { state: "forbidden" } : { state: "unavailable" };
    }
    const preview = parseRetentionPreview(data);
    if (!preview) return { state: "unavailable" };
    return { state: "ok", preview, canDestroy: access.isSuperAdmin && !access.isStaff };
  } catch {
    return { state: "unavailable" };
  }
}
