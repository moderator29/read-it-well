"use server";

/**
 * Delete for me, delete for everyone, and forward.
 *
 * Every rule lives in the database functions `delete_message` and
 * `forward_message` (migration 20261011120000): who may delete, the window,
 * the follow check, and the block check. These actions only check that the
 * person is signed in and that the input is well formed, then call the
 * function. The function's own error text is shown when it refuses.
 */

import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { isFeatureEnabled } from "../flags";
import { deleteMessageSchema, forwardMessageSchema } from "./schema";

const PAUSED_MESSAGE = "Messaging is paused for maintenance. Please try again in a little while.";
const FAILED_MESSAGE = "That did not work. Please try again.";

type RpcCall = (
  fn: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

export type DeleteMessageResult = { scope: "me" | "everyone"; messageId: string };

export async function deleteMessage(input: {
  messageId: string;
  scope: "me" | "everyone";
}): Promise<ActionResult<DeleteMessageResult>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  if (!(await isFeatureEnabled("messaging"))) return fail(PAUSED_MESSAGE);

  const parsed = validate(deleteMessageSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  /* The two functions are in migration 20261011120000, still pending. Until it is
     applied and the database types are regenerated, the typed client does not
     know their names, so the call is typed by hand here. Remove the casts then. */
  const { data, error } = await (session.supabase.rpc as unknown as RpcCall)("delete_message", {
    p_message_id: parsed.data.messageId,
    p_scope: parsed.data.scope,
  });
  if (error) return fail(error.message || FAILED_MESSAGE);
  return ok(data as DeleteMessageResult);
}

export async function forwardMessage(input: {
  messageId: string;
  conversationId: string;
}): Promise<ActionResult<{ messageId: string }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  if (!(await isFeatureEnabled("messaging"))) return fail(PAUSED_MESSAGE);

  const parsed = validate(forwardMessageSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { data, error } = await (session.supabase.rpc as unknown as RpcCall)("forward_message", {
    p_message_id: parsed.data.messageId,
    p_conversation_id: parsed.data.conversationId,
  });
  if (error) return fail(error.message || FAILED_MESSAGE);
  return ok({ messageId: data as string });
}
