"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../admin/guard";

/**
 * THE SANCTIONS DESK'S ACTIONS. SCUML items 8, 9 and 19.
 *
 * Staff only (`requireAdmin`). Proposals and approvals go through the
 * definer functions under the operator's own session, which check the role
 * again and enforce the two-person rule in the database. The file upload is
 * a route handler (`/api/compliance/sanctions-upload`), not an action, so the
 * app's server-action body limit stays at its default.
 */

export type DeskAnswer = { ok: true; message: string } | { ok: false; error: string };

type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

async function staffRpc(fn: string, args: Record<string, unknown>, done: string): Promise<DeskAnswer> {
  const access = await requireAdmin();
  if (access.state !== "admin") return { ok: false, error: "forbidden" };
  const { data, error } = await (access.supabase as unknown as Rpc).rpc(fn, args);
  revalidatePath("/admin/compliance");
  const status = !error && data && typeof data === "object" ? (data as { status?: unknown }).status : null;
  if (status === "ok") return { ok: true, message: done };
  /* A short URL list's first step: proposed, waiting on a second person. */
  if (status === "proposed") return { ok: true, message: "proposed" };
  return { ok: false, error: typeof status === "string" ? status : "failed" };
}

/** A different staff member activates a waiting list version (items 9 and 19). */
export async function activateSanctionsList(input: { versionId: string }): Promise<DeskAnswer> {
  return staffRpc("sanctions_list_activate", { p_version: input.versionId }, "activated");
}

/** Anyone but the proposer rejects a proposal; the match is open again (item 19). */
export async function rejectSanctionsDecision(input: { decisionId: string }): Promise<DeskAnswer> {
  return staffRpc("sanctions_hit_reject", { p_decision: input.decisionId }, "rejected");
}

export async function proposeSanctionsDecision(input: { hitId: string; decision: "clear" | "confirm" | "release"; note: string }): Promise<DeskAnswer> {
  const access = await requireAdmin();
  if (access.state !== "admin") return { ok: false, error: "forbidden" };
  if (input.decision !== "clear" && input.decision !== "confirm" && input.decision !== "release") return { ok: false, error: "failed" };
  const { data, error } = await (access.supabase as unknown as Rpc).rpc("sanctions_hit_propose", {
    p_hit: input.hitId,
    p_decision: input.decision,
    p_note: (input.note ?? "").slice(0, 2000),
  });
  revalidatePath("/admin/compliance");
  const status = !error && data && typeof data === "object" ? (data as { status?: unknown }).status : null;
  return status === "ok" ? { ok: true, message: "proposed" } : { ok: false, error: typeof status === "string" ? status : "failed" };
}

export async function approveSanctionsDecision(input: { decisionId: string }): Promise<DeskAnswer> {
  const access = await requireAdmin();
  if (access.state !== "admin") return { ok: false, error: "forbidden" };
  const { data, error } = await (access.supabase as unknown as Rpc).rpc("sanctions_hit_approve", { p_decision: input.decisionId });
  revalidatePath("/admin/compliance");
  const status = !error && data && typeof data === "object" ? (data as { status?: unknown }).status : null;
  return status === "ok" ? { ok: true, message: "approved" } : { ok: false, error: typeof status === "string" ? status : "failed" };
}
