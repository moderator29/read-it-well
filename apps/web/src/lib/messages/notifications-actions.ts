"use server";

/**
 * Notification actions.
 *
 * Marking read runs under the owner's own RLS client: the update policy is
 * owner-only and the column grant on notifications allows exactly read_at, so
 * this action could not rewrite history even if it tried. Rows are written by
 * database triggers and the service role only; nothing here inserts.
 */

import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import { markNotificationsReadSchema } from "./schema";

/**
 * Mark notifications read: the given ids, or every unread one when no ids are
 * given (the mark-all button). Only the caller's own unread rows move.
 */
export async function markNotificationsRead(input: {
  ids?: string[];
}): Promise<ActionResult<{ updated: number }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(markNotificationsReadSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  let query = session.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.user.id)
    .is("read_at", null);
  if (parsed.data.ids && parsed.data.ids.length > 0) {
    query = query.in("id", parsed.data.ids);
  }

  const { data: updated, error } = await query.select("id");
  if (error) return fail("Marking read is unavailable just now. Please try again shortly.");

  return ok({ updated: updated?.length ?? 0 });
}
