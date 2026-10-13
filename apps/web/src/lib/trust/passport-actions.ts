"use server";

import { revalidatePath } from "next/cache";
import { getDictionary } from "@vallo/i18n";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, resolveSession } from "../actions/session";
import { getLocale } from "../locale";

/**
 * THE OLD RENTER PASSPORT'S SWITCH (V-100). The Vallo passport
 * (`lib/passport/passport-actions.ts`) replaced it on 13 October 2026; this
 * remains only for the old credential component and writes the old table.
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
