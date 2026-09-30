"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, type ActionResult, validate } from "../actions/envelope";
import { replySupportTicket, setTicketStatus } from "./actions";
import { adminRefusal, requireAdmin } from "./guard";
import { isUserId } from "./member-file-rules";
import { isNotInstalled, ticketDoor } from "./support-queue";
import { ESCALATION_TARGETS } from "./support-workspace";

/**
 * THE SUPPORT DESK'S HANDS (29 September 2026), beside `replySupportTicket`,
 * `setTicketStatus` (lib/admin/actions.ts) and `takeTicket` /
 * `releaseTicket` (support-desk-actions.ts), which it reuses rather than
 * copies.
 *
 * Every one checks the door on the server before anything else:
 * `requireAdmin("support")`, which for a staff member means a live support
 * grant, the current handbook acknowledged, and this session's security key
 * proved. Escalating and handing back then call a database function on the
 * operator's OWN client, so the database checks the same things again on
 * auth.uid() and writes its own audit row. Nothing here trusts a scope, a
 * name or an id the browser sent beyond parsing it.
 */

type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

const WORDS: Record<string, string> = {
  forbidden: "Your access does not cover this ticket.",
  invalid_scope: "Choose the money, safety or verification desk.",
  reason_needed: "Say why, in at least eight characters. The other desk reads it first.",
  not_found: "That ticket is no longer there. Refresh the queue.",
  not_open: "Only an open ticket can be escalated. Reopen it first if it still needs work.",
  own_ticket: "You cannot escalate a ticket you filed yourself.",
  already: "That desk already has this ticket.",
  taken: "Somebody else is working on this ticket. It frees up after thirty minutes without a touch.",
};

/** Said when the escalation migration is not in this database yet. Present tense; no promise of a date. */
const NOT_INSTALLED =
  "Escalation is not installed in this database. Leave an internal note for the other desk instead; nothing was changed.";

const statusOf = (data: unknown) => String((data as { status?: unknown } | null)?.status ?? "");

const replySchema = z.object({
  ticketId: z.string().uuid("That ticket could not be identified."),
  body: z.string().trim().min(2, "Write the reply first.").max(4000, "Keep the reply under 4,000 characters."),
  then: z.enum(["keep", "resolve"]).default("keep"),
});

/**
 * Reply to the member, and optionally resolve in the same step. The reply
 * lands on the member's thread (/support/messages/<id>) and the database
 * tells them in the app (private.notify_support_reply). Replying takes the
 * ticket for you when nobody holds it, so two people never answer at once;
 * a first reply on a ticket still marked Open moves it to In progress.
 */
export async function sendSupportReply(input: {
  ticketId: string;
  body: string;
  then?: "keep" | "resolve";
  status?: string;
}): Promise<ActionResult<{ status: string }>> {
  const access = await requireAdmin("support");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const parsed = validate(replySchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  /* The status is read here, never taken from the browser: a stale or
     forged "open" must not move a resolved or closed ticket back to
     In progress behind a reply. */
  const current = await (access.supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => { eq: (c: string, v: string) => { maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }> } };
    };
  })
    .from("support_tickets")
    .select("status")
    .eq("id", parsed.data.ticketId)
    .maybeSingle();
  if (current.error) return fail("That did not go through. Nothing was changed. Try again.");
  if (!current.data) return fail(WORDS.not_found!);
  const before = String((current.data as { status?: unknown }).status ?? "");

  const take = await (access.userClient as unknown as Rpc).rpc("queue_take", {
    p_kind: "ticket",
    p_item: parsed.data.ticketId,
    p_batch: null,
  });
  if (!take.error && statusOf(take.data) === "taken") return fail(WORDS.taken!);

  const sent = await replySupportTicket({ ticketId: parsed.data.ticketId, body: parsed.data.body });
  if (!sent.ok) return fail(sent.error, sent.fieldErrors);

  let status = before;
  if (parsed.data.then === "resolve") {
    const r = await setTicketStatus({ ticketId: parsed.data.ticketId, status: "resolved" });
    if (!r.ok) return fail(`The reply was sent, but the ticket was not resolved: ${r.error}`);
    status = "resolved";
  } else if (status === "open") {
    const r = await setTicketStatus({ ticketId: parsed.data.ticketId, status: "pending" });
    if (r.ok) status = "pending";
  }
  revalidatePath("/admin/support");
  return ok({ status });
}

const escalateSchema = z.object({
  ticketId: z.string().uuid("That ticket could not be identified."),
  scope: z.enum(ESCALATION_TARGETS, { message: WORDS.invalid_scope! }),
  reason: z.string().trim().min(8, WORDS.reason_needed!).max(1000, "Keep the reason under 1,000 characters."),
});

/** Hand a ticket to the money, safety or verification desk, with a reason. */
export async function escalateSupportTicket(input: {
  ticketId: string;
  scope: string;
  reason: string;
}): Promise<ActionResult<null>> {
  const access = await requireAdmin("support");
  if (access.state !== "admin") return fail(adminRefusal(access));
  const parsed = validate(escalateSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { data, error } = await (access.userClient as unknown as Rpc).rpc("support_escalate_ticket", {
    p_ticket: parsed.data.ticketId,
    p_scope: parsed.data.scope,
    p_reason: parsed.data.reason,
  });
  if (error) return fail(isNotInstalled(error) ? NOT_INSTALLED : "That did not go through. Nothing was changed. Try again.");
  const status = statusOf(data);
  if (status !== "ok") return fail(WORDS[status] ?? "That did not go through. Nothing was changed.");
  revalidatePath("/admin/support");
  return ok(null);
}

const returnSchema = z.object({
  ticketId: z.string().uuid(),
  escalationId: z.string().uuid(),
  note: z.string().trim().min(8, "Say what your desk found or did, in at least eight characters.").max(1000),
});

/**
 * Hand an escalated ticket back to support with a note. Open to the desk it
 * was escalated to and to support; the database decides which on auth.uid().
 */
export async function returnSupportEscalation(input: {
  ticketId: string;
  escalationId: string;
  note: string;
}): Promise<ActionResult<null>> {
  if (!isUserId(input?.ticketId)) return fail("That ticket could not be identified. Refresh the queue and open it again.");
  const door = await ticketDoor(input.ticketId);
  if (door.mode === "none") {
    return fail(door.state === "not-admin" ? WORDS.forbidden! : adminRefusal({ state: door.state }));
  }
  const parsed = validate(returnSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { data, error } = await (door.access.userClient as unknown as Rpc).rpc("support_return_escalation", {
    p_escalation: parsed.data.escalationId,
    p_note: parsed.data.note,
  });
  if (error) return fail(isNotInstalled(error) ? NOT_INSTALLED : "That did not go through. Nothing was changed. Try again.");
  const status = statusOf(data);
  if (status !== "ok") return fail(WORDS[status] ?? "That did not go through. Nothing was changed.");
  revalidatePath("/admin/support");
  return ok(null);
}
