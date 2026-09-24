"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDictionary } from "@vallo/i18n";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { getLocale } from "../locale";
import { getAgentContext } from "./listings-queries";
import { copiesAsked, MAX_COPIES } from "./duplicate";

/**
 * V-29: LIST ANOTHER LIKE THIS. One of the lister's own listings becomes one
 * or more new DRAFTS, made in ONE database call (`duplicate_listing`,
 * migration 20260924121800): an allowlist of facts, fees, utilities and place,
 * plus amenities and gate details. Photographs, walkthroughs, the code, any
 * verification and any mandate are never copied.
 *
 * Ownership is proven by the function (only the listing's own agent), never
 * by trusting the posted id. When the per-person ceiling on new listings stops
 * the run part way, the copies already made stand and the answer says how many
 * of how many, so the screen can say "Made 10 of 20" rather than pretend.
 * Nothing is submitted.
 *
 * This module exports only async functions, per the server-actions rule.
 */

const schema = z.object({
  listingId: z.string().uuid(),
  copies: z.number().int().min(1).max(MAX_COPIES).optional(),
});

type Rpc = (
  fn: "duplicate_listing",
  args: { p_listing: string; p_copies: number },
) => PromiseLike<{ data: unknown; error: { code?: string } | null }>;

export async function duplicateListing(input: unknown): Promise<ActionResult<{ ids: string[]; asked: number }>> {
  const copy = getDictionary(await getLocale()).frontDoor.duplicate;
  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(copy.failed);

  const context = await getAgentContext();
  if (context.state !== "agent") return fail(copy.agentsOnly);

  const asked = copiesAsked(parsed.data.copies ?? 1);
  try {
    const rpc = context.supabase.rpc.bind(context.supabase) as unknown as Rpc;
    const { data, error } = await rpc("duplicate_listing", { p_listing: parsed.data.listingId, p_copies: asked });
    if (error) return fail(error.code === "42501" ? copy.notYours : copy.failed);
    const ids = Array.isArray(data) ? data.filter((id): id is string => typeof id === "string") : [];
    if (ids.length === 0) return fail(copy.limited);
    revalidatePath("/agent/listings");
    return ok({ ids, asked });
  } catch {
    return fail(copy.failed);
  }
}
