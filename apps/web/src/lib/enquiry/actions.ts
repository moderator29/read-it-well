"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDictionary } from "@vallo/i18n";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { resolveSession, SIGNED_OUT_MESSAGE } from "../actions/session";
import { getLocale } from "../locale";
import { LOST_REASONS, STAGES } from "./stage";

/**
 * V-72: MOVING AN ENQUIRY BY HAND.
 *
 * Through the lister's own client, because `set_enquiry_stage` reads
 * `auth.uid()` and refuses anybody but the thread's lister. Lost takes exactly
 * one reason and nothing else takes one; the schema here says so and so does
 * the function, so a crafted post cannot store a reason on "Offer made".
 *
 * This module exports only async functions, per the server-actions rule.
 */

const schema = z
  .object({
    conversationId: z.string().uuid(),
    stage: z.enum(STAGES),
    reason: z.enum(LOST_REASONS).optional(),
  })
  .refine((v) => (v.stage === "lost") === (v.reason !== undefined));

type Rpc = (fn: "set_enquiry_stage", args: { p_conversation: string; p_stage: string; p_reason: string | null }) => PromiseLike<{ error: unknown }>;

export async function setEnquiryStage(input: unknown): Promise<ActionResult<{ saved: true }>> {
  const t = getDictionary(await getLocale()).frontDoor.desk;
  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(t.failed);
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);
  try {
    const rpc = session.supabase.rpc.bind(session.supabase) as unknown as Rpc;
    const { error } = await rpc("set_enquiry_stage", {
      p_conversation: parsed.data.conversationId,
      p_stage: parsed.data.stage,
      p_reason: parsed.data.reason ?? null,
    });
    if (error) return fail(t.failed);
  } catch {
    return fail(t.failed);
  }
  revalidatePath("/agent/messages");
  revalidatePath(`/messages/${parsed.data.conversationId}`);
  return ok({ saved: true });
}
