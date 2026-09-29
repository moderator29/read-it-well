"use server";

import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { setupExempt } from "../actions/setup-exempt";
import { loadNotificationPage, type NotificationRow } from "./inbox";

/**
 * The inbox's "Show older" control: the page after a given row, read under the
 * caller's own RLS client, so it can only ever return the caller's own rows.
 *
 * The cursor is validated to the shape a row actually has (a uuid and an ISO
 * timestamp) before it goes anywhere near a PostgREST filter string.
 */
const cursorSchema = z.object({
  createdAt: z
    .string()
    .max(40)
    .regex(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}(?::?\d{2})?)$/),
  id: z.uuid(),
});

/* B-2: read-only (or an exit the finish-setup hold never blocks), so it runs
   with the hold lifted. See lib/actions/setup-exempt.ts. */
export async function loadOlderNotifications(
  ...args: Parameters<typeof loadOlderNotificationsInner>
): Promise<Awaited<ReturnType<typeof loadOlderNotificationsInner>>> {
  return setupExempt(() => loadOlderNotificationsInner(...args));
}

async function loadOlderNotificationsInner(
  input: unknown,
): Promise<ActionResult<{ rows: NotificationRow[]; more: boolean }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(cursorSchema, input);
  if (!parsed.ok) return fail(parsed.error);

  const page = await loadNotificationPage(session.supabase, parsed.data);
  if (page.state === "error") {
    return fail("Older notifications could not be loaded just now. Please try again shortly.");
  }
  return ok({ rows: page.rows, more: page.more });
}
