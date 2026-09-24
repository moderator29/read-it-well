"use server";

import { revalidatePath } from "next/cache";
import { getDictionary } from "@vallo/i18n";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { adminRefusal, requireAdmin } from "./guard";

/**
 * V-63 ON THE MODERATION LANE: clear a safety hold once somebody has looked,
 * or extend it. Both functions check the caller is staff inside the database
 * and write an audit row; these actions only shape the answer.
 */

const desk = getDictionary("en").trustVisible.desk;
type RpcCaller = { rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> };
const schema = z.object({ holdId: z.string().uuid(), action: z.enum(["clear", "extend"]) });

export async function decideSafetyHold(input: unknown): Promise<ActionResult<{ done: true }>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail(adminRefusal(access));
  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(desk.holdsFailed);
  const fn = parsed.data.action === "clear" ? "clear_safety_hold" : "extend_safety_hold";
  const { data, error } = await (access.supabase as unknown as RpcCaller).rpc(fn, {
    p_hold: parsed.data.holdId,
    p_note: parsed.data.action === "clear" ? "Cleared on the moderation lane." : "Extended on the moderation lane.",
  });
  if (error || (data !== "cleared" && data !== "extended")) return fail(desk.holdsFailed);
  revalidatePath("/admin/queue");
  return ok({ done: true });
}
