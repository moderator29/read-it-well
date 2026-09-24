"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../admin/guard";
import { getAdminClient } from "../../wallet/ledger";
import { ingestList } from "./ingest";
import { uploadSource } from "./sources";

/**
 * THE SANCTIONS DESK'S ACTIONS. SCUML items 8, 9 and 19.
 *
 * Staff only (`requireAdmin`). Proposals and approvals go through the
 * definer functions under the operator's own session, which check the role
 * again and enforce the two-person rule in the database; the upload uses the
 * service role after the admin check, because list tables are born locked.
 */

export type DeskAnswer = { ok: true; message: string } | { ok: false; error: string };

const MAX_UPLOAD = 40 * 1024 * 1024;

export async function uploadSanctionsList(_prev: DeskAnswer | null, form: FormData): Promise<DeskAnswer> {
  const access = await requireAdmin();
  if (access.state !== "admin") return { ok: false, error: "forbidden" };
  const source = form.get("source");
  const file = form.get("file");
  if ((source !== "un" && source !== "ng") || !(file instanceof File) || file.size === 0 || file.size > MAX_UPLOAD) {
    return { ok: false, error: "failed" };
  }
  const admin = getAdminClient();
  if (!admin) return { ok: false, error: "failed" };
  const result = await ingestList(admin as never, uploadSource(source, await file.text()), access.user.id);
  revalidatePath("/admin/compliance");
  if (result.state === "loaded") return { ok: true, message: `loaded:${result.entries}` };
  if (result.state === "same") return { ok: true, message: "same" };
  return { ok: false, error: "failed" };
}

type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

export async function proposeSanctionsDecision(input: { hitId: string; decision: "clear" | "confirm"; note: string }): Promise<DeskAnswer> {
  const access = await requireAdmin();
  if (access.state !== "admin") return { ok: false, error: "forbidden" };
  if (input.decision !== "clear" && input.decision !== "confirm") return { ok: false, error: "failed" };
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
