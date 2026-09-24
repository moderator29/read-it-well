"use server";

import { revalidatePath } from "next/cache";
import { getDictionary } from "@vallo/i18n";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { adminRefusal, requireAdmin } from "./guard";
import { recallPreviewFrom, recallSendFrom, type RecallPreview } from "./recall";

/**
 * V-60: COUNT, THEN TELL. The desk asks how many people a recall would reach
 * before it can send one, because this is the loudest thing a member of staff
 * can do. Both functions check the caller is staff inside the database; these
 * actions only shape the answer. They run under the admin's own session, so
 * the database's own guard is the authority, not the service role.
 */

const desk = getDictionary("en").trustVisible.desk;

type RpcCaller = { rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> };

const previewSchema = z.object({ suspensionId: z.string().uuid() });
const sendSchema = z.object({
  suspensionId: z.string().uuid(),
  category: z.enum(["off_platform_payment", "scam"]),
});

export async function previewRecall(input: unknown): Promise<ActionResult<RecallPreview>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));
  const parsed = validate(previewSchema, input);
  if (!parsed.ok) return fail(parsed.error);
  const { data, error } = await (access.supabase as unknown as RpcCaller).rpc("scam_recall_preview", {
    p_suspension: parsed.data.suspensionId,
  });
  const preview = error ? null : recallPreviewFrom(data);
  return preview ? ok(preview) : fail(desk.recallFailed);
}

export async function sendRecall(input: unknown): Promise<ActionResult<{ recipients: number }>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));
  const parsed = validate(sendSchema, input);
  if (!parsed.ok) return fail(parsed.error);
  const { data, error } = await (access.supabase as unknown as RpcCaller).rpc("scam_recall_send", {
    p_suspension: parsed.data.suspensionId,
    p_category: parsed.data.category,
  });
  if (error) return fail(desk.recallFailed);
  const result = recallSendFrom(data, desk);
  if (!result.ok) return fail(result.message);
  revalidatePath("/admin/stops");
  return ok({ recipients: result.recipients });
}
