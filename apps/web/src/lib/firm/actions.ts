"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDictionary } from "@vallo/i18n";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { resolveSession, SIGNED_OUT_MESSAGE } from "../actions/session";
import { getLocale } from "../locale";

/**
 * V-99: ASSIGN A LISTING, SET ROUTING. Both through guarded functions that
 * answer only to the firm's principal or a coordinator, and only name active
 * members and closed-list neighbourhoods. This module exports only async
 * functions, per the server-actions rule.
 */

type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ error: { hint?: string; code?: string } | null }>;

async function call(fn: string, args: Record<string, unknown>): Promise<ActionResult<null>> {
  const t = getDictionary(await getLocale()).frontDoor.firm;
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);
  const rpc = session.supabase.rpc.bind(session.supabase) as unknown as Rpc;
  const { error } = await rpc(fn, args);
  if (error) {
    if (error.code === "42501") return fail(t.notRouter);
    const hint = error.hint as keyof typeof t.problems | undefined;
    return fail(hint && hint in t.problems ? t.problems[hint] : t.failed);
  }
  revalidatePath("/agent/firm");
  return ok(null);
}

export async function assignFirmListing(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(z.object({ listingId: z.string().uuid(), agentId: z.string().uuid().nullable() }), input);
  if (!parsed.ok) return fail(getDictionary(await getLocale()).frontDoor.firm.failed);
  return call("assign_listing", { p_listing: parsed.data.listingId, p_agent: parsed.data.agentId });
}

const routingSchema = z.object({
  firmId: z.string().uuid(),
  mode: z.enum(["lister", "area", "round_robin"]),
  areaAgents: z.record(z.string().min(2).max(60), z.string().uuid()),
  officeStart: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  officeEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
});

export async function setFirmRouting(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(routingSchema, input);
  if (!parsed.ok) return fail(getDictionary(await getLocale()).frontDoor.firm.failed);
  const v = parsed.data;
  return call("set_firm_routing", {
    p_firm: v.firmId,
    p_mode: v.mode,
    p_area_agents: v.mode === "area" ? v.areaAgents : {},
    p_office_start: v.mode === "round_robin" ? v.officeStart : null,
    p_office_end: v.mode === "round_robin" ? v.officeEnd : null,
  });
}
