"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { consume, subjectForUser } from "../security/rate-limit";
import { canMemberReply } from "./tickets";

/**
 * A member's reply on their own support ticket.
 *
 * Runs on the member's own client, so `support_ticket_messages_insert_own` is
 * the authorisation: sender_role 'user', sender_id themselves, on a ticket they
 * own. The status check before it is product, not security: a resolved or
 * closed ticket is a queue nobody reads, so the reply is refused in words and
 * the thread offers a new question instead.
 */

const replySchema = z.object({
  ticketId: z.string().uuid("That ticket could not be found."),
  body: z.string().trim().min(1, "Write your reply first.").max(4000, "Keep a reply under 4,000 characters."),
});

const REPLY_FAILED = "Your reply could not be sent just now. It is still in the box; try again shortly.";

export async function replyToMyTicket(input: { ticketId: string; body: string }): Promise<ActionResult<null>> {
  const parsed = validate(replySchema, input);
  if (!parsed.ok) return fail(parsed.fieldErrors.body ?? parsed.fieldErrors.ticketId ?? parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);

  const verdict = await consume({
    bucket: "support_reply",
    subject: subjectForUser(session.user.id),
    limit: 20,
    windowSeconds: 3_600,
  });
  if (!verdict.allowed) return fail(`That is a lot of replies in one hour. Try again ${verdict.retryIn}.`);

  try {
    const { data: ticket, error } = await session.supabase
      .from("support_tickets")
      .select("id, status")
      .eq("id", parsed.data.ticketId)
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) return fail(REPLY_FAILED);
    if (!ticket) return fail("That ticket could not be found.");
    if (!canMemberReply(ticket.status)) {
      return fail("This ticket is closed, so nobody would read a reply here. Ask a new question instead.");
    }

    const { error: insertError } = await session.supabase.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      sender_role: "user",
      sender_id: session.user.id,
      body: parsed.data.body,
    });
    if (insertError) return fail(REPLY_FAILED);
  } catch {
    return fail(REPLY_FAILED);
  }

  revalidatePath(`/support/messages/${parsed.data.ticketId}`);
  revalidatePath("/support/messages");
  return ok(null);
}
