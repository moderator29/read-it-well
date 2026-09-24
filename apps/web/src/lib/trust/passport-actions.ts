"use server";

import { revalidatePath } from "next/cache";
import { getDictionary } from "@vallo/i18n";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, resolveSession } from "../actions/session";
import { getLocale } from "../locale";

/**
 * THE RENTER PASSPORT'S TWO SWITCHES (V-100): on or off for the account, and
 * shown or not in one conversation. Both run as the renter; the database
 * checks the renter is the guest of that conversation and that the passport
 * is on before it will show it anywhere.
 */

type RpcCaller = { rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> };

export async function setRenterPassport(input: unknown): Promise<ActionResult<{ enabled: boolean }>> {
  const copy = getDictionary(await getLocale()).trustVisible.passport;
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(copy.signedOut);
  const parsed = validate(z.object({ enabled: z.boolean() }), input);
  if (!parsed.ok) return fail(copy.failed);
  const { data, error } = await (session.supabase as unknown as RpcCaller).rpc("set_renter_passport", {
    p_enabled: parsed.data.enabled,
  });
  if (error || typeof data !== "boolean") return fail(copy.failed);
  revalidatePath("/settings/passport");
  return ok({ enabled: data });
}

export async function shareRenterPassport(input: unknown): Promise<ActionResult<{ shared: boolean }>> {
  const copy = getDictionary(await getLocale()).trustVisible.passport;
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(copy.signedOut);
  const parsed = validate(z.object({ conversationId: z.string().uuid(), share: z.boolean() }), input);
  if (!parsed.ok) return fail(copy.failed);
  const { data, error } = await (session.supabase as unknown as RpcCaller).rpc("share_renter_passport", {
    p_conversation: parsed.data.conversationId,
    p_share: parsed.data.share,
  });
  if (error) return fail(copy.failed);
  if (data === "off") return fail(copy.turnOnFirst);
  if (data === "shared") return ok({ shared: true });
  if (data === "withdrawn") return ok({ shared: false });
  return fail(copy.failed);
}
