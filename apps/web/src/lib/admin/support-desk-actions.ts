"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { adminRefusal, requireAdmin } from "./guard";
import { isUserId } from "./member-file-rules";

/**
 * TAKING A SUPPORT TICKET, so two people do not answer the same member.
 *
 * The same claim the unified queue uses (`queue_take` / `queue_release`, kind
 * `ticket`), called with the operator's OWN client: the functions decide on
 * auth.uid() through `private.staff_can(actor, 'support')`, write their own
 * `queue.take` / `queue.release` audit rows, refuse a claim somebody else has
 * touched in the last thirty minutes, and let only the holder release. The
 * queue's own verbs require the moderation scope; these require support, so a
 * support-only staff member can take their own tickets.
 */

type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

const WORDS: Record<string, string> = {
  taken: "Somebody else is working on this ticket. It frees up after thirty minutes without a touch.",
  forbidden: "Your access does not cover support tickets.",
  not_yours: "Only the person holding a ticket can hand it back.",
  invalid: "That ticket could not be identified.",
};

export async function takeTicket(input: { ticketId: string }): Promise<ActionResult<null>> {
  const access = await requireAdmin("support");
  if (access.state !== "admin") return fail(adminRefusal(access));
  if (!isUserId(input?.ticketId)) return fail(WORDS.invalid!);
  const { data, error } = await (access.userClient as unknown as Rpc).rpc("queue_take", {
    p_kind: "ticket",
    p_item: input.ticketId,
    p_batch: null,
  });
  const status = String((data as { status?: string } | null)?.status ?? "");
  if (error) return fail("That did not go through. Nothing was changed. Try again.");
  if (status !== "ok") return fail(WORDS[status] ?? "That did not go through.");
  revalidatePath("/admin/support");
  return ok(null);
}

export async function releaseTicket(input: { ticketId: string }): Promise<ActionResult<null>> {
  const access = await requireAdmin("support");
  if (access.state !== "admin") return fail(adminRefusal(access));
  if (!isUserId(input?.ticketId)) return fail(WORDS.invalid!);
  const { data, error } = await (access.userClient as unknown as Rpc).rpc("queue_release", {
    p_kind: "ticket",
    p_item: input.ticketId,
  });
  const status = String((data as { status?: string } | null)?.status ?? "");
  if (error) return fail("That did not go through. Nothing was changed. Try again.");
  if (status !== "ok") return fail(WORDS[status] ?? "That did not go through.");
  revalidatePath("/admin/support");
  return ok(null);
}
