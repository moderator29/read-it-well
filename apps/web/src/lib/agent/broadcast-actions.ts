"use server";

import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { resolveSession, SIGNED_OUT_MESSAGE } from "../actions/session";
import { parseBroadcast, type BroadcastParse } from "./broadcast";
import { refineWithModel } from "./broadcast-model";

/**
 * V-09: READ A PASTED BROADCAST INTO DRAFT VALUES, ON THE SERVER.
 *
 * The parse runs here rather than in the browser for one reason: the founder's
 * rule that "1.5m" and "10%" are resolved to kobo SERVER-SIDE. The browser
 * gets back naira input text worked out from integer kobo, the list of fields
 * it filled, and the list of what was not carried over. NOTHING IS WRITTEN:
 * this action has no database call. The wizard puts the values into its own
 * form, marks each one "from your message", and saves a draft through the
 * ordinary `saveDraft` only when the agent moves on, exactly as if they had
 * typed it.
 *
 * WHEN THE ASSISTANT KEY IS SET AND THE `broadcast_model` FLAG IS ON, the
 * model may suggest raw text for fields the deterministic reader left blank
 * (`broadcast-model.ts`). It never computes a figure and never fills a field
 * the reader already filled; its suggestions go back through the same
 * resolvers. With no key, no flag, a timeout or any error, the answer is the
 * deterministic one, unchanged.
 *
 * This module exports only async functions, per the server-actions rule.
 */

const schema = z.object({
  text: z
    .string("Paste the message you send on WhatsApp.")
    .trim()
    .min(10, "Paste the whole message, not just a line of it.")
    .max(4000, "That message is longer than a listing needs. Paste the part about this property."),
});

export async function draftFromBroadcast(input: unknown): Promise<ActionResult<BroadcastParse>> {
  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(parsed.fieldErrors.text ?? parsed.error, parsed.fieldErrors);
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);

  const base = parseBroadcast(parsed.data.text);
  try {
    return ok(await refineWithModel(parsed.data.text, base));
  } catch {
    return ok(base);
  }
}
