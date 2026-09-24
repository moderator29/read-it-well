"use server";

import { z } from "zod";
import { getDictionary } from "@vallo/i18n";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { getLocale } from "../locale";
import { getAgentContext, readDraft } from "./listings-queries";
import { saveDraft, setAmenities, setListingAccess } from "./listings-actions";
import { copiesAsked, draftInputFrom, MAX_COPIES } from "./duplicate";

/**
 * V-29: LIST ANOTHER LIKE THIS. One of the lister's own listings becomes one
 * or more new DRAFTS, each saved through the wizard's own `saveDraft` (so a
 * copy is validated exactly as a typed draft is), with its amenities and its
 * gate details copied. Photographs, walkthroughs, the code and any mandate are
 * not copied; see `duplicate.ts`.
 *
 * Ownership is proven by `readDraft`, which reads the source under the
 * agent's own client AND their agent id, never by trusting the posted id.
 * Nothing is submitted: every copy is a draft the lister opens, changes (the
 * floor, the flat number, the price) and sends for review themselves.
 *
 * This module exports only async functions, per the server-actions rule.
 */

const schema = z.object({
  listingId: z.string().uuid(),
  copies: z.number().int().min(1).max(MAX_COPIES).optional(),
});

export async function duplicateListing(input: unknown): Promise<ActionResult<{ ids: string[] }>> {
  const copy = getDictionary(await getLocale()).frontDoor.duplicate;
  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(copy.failed);

  const context = await getAgentContext();
  if (context.state !== "agent") return fail(copy.agentsOnly);

  const source = await readDraft(context.supabase, context.agent.id, parsed.data.listingId);
  if (!source) return fail(copy.notYours);

  const input_ = draftInputFrom(source);
  const count = copiesAsked(parsed.data.copies ?? 1);
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const saved = await saveDraft(input_);
    if (!saved.ok) {
      return ids.length === 0 ? fail(saved.error) : ok({ ids });
    }
    ids.push(saved.data.id);
    if (source.amenityCodes.length > 0) await setAmenities({ listingId: saved.data.id, codes: source.amenityCodes });
    const access = source.access;
    if (access.estateName || access.gateDirections || access.securityPhone || access.accessCode) {
      await setListingAccess({ listingId: saved.data.id, ...access });
    }
  }
  return ok({ ids });
}
