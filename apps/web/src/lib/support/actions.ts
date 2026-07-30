"use server";

import { randomInt } from "node:crypto";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, resolveSession } from "../actions/session";
import { bestEffortEmail, sendEmail } from "../email/client";
import { supportTicketFiled } from "../email/messages";
import { isFeatureEnabled } from "../flags";
import { isSupabaseConfigured } from "../supabase/env";
import { createAdminClient } from "../supabase/admin";

/**
 * Support ticket filing.
 *
 * The escalation path out of SupportChat lands here: validate the little the
 * user gave us (name and email only, plus their question), generate a
 * human-readable NF-SUP reference, and persist the ticket. Signed-in users
 * insert under their own RLS policy so the ticket belongs to them; anonymous
 * visitors are filed through the service role, because the tickets table has
 * no anonymous insert policy by design. When Supabase is not configured the
 * action says so honestly instead of inventing a reference.
 *
 * Once the row exists, the acknowledgement email goes to the validated address
 * on the form and nowhere else. It is best effort: the ticket is filed and the
 * reference is real whether or not the email leaves.
 */

const ticketSchema = z.object({
  name: z.string().trim().min(1, "Add your name so we know who to reply to.").max(120),
  email: z
    .string()
    .trim()
    .min(1, "Add an email address so we can reply.")
    .email("Enter a valid email address.")
    .max(200),
  topic: z.string().trim().max(140).optional(),
  body: z.string().trim().min(1, "Tell us what you need help with.").max(4000),
});

export type SupportTicketInput = z.infer<typeof ticketSchema>;

const FILE_FAILED_MESSAGE =
  "We could not file your ticket just now. Your question is kept in this conversation, so please try again shortly.";
const PAUSED_MESSAGE =
  "Ticket filing is paused for a moment of maintenance. Your question is kept in this conversation; please try again shortly.";

function makeReference(): string {
  return `NF-SUP-${String(randomInt(0, 100_000)).padStart(5, "0")}`;
}

export async function fileSupportTicket(
  input: SupportTicketInput,
): Promise<ActionResult<{ reference: string }>> {
  const parsed = validate(ticketSchema, input);
  if (!parsed.ok) return parsed;

  if (!(await isFeatureEnabled("support"))) return fail(PAUSED_MESSAGE);
  if (!isSupabaseConfigured()) return fail(NOT_CONFIGURED_MESSAGE);

  const session = await resolveSession();
  const { name, email, topic, body } = parsed.data;

  try {
    // Signed-in users file as themselves under RLS; everyone else goes through
    // the service role with no user attached.
    const client = session.state === "signed-in" ? session.supabase : createAdminClient();
    const userId = session.state === "signed-in" ? session.user.id : null;

    // The reference is random; on the rare collision, roll again.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const reference = makeReference();
      const { error } = await client.from("support_tickets").insert({
        reference,
        user_id: userId,
        name,
        email,
        topic: topic && topic.length > 0 ? topic : null,
        body,
        status: "open",
      });
      if (!error) {
        // The ticket row is written. The acknowledgement is best effort, and
        // goes only to the address Zod has already validated on this form.
        await bestEffortEmail(async () => {
          const message = supportTicketFiled({
            name,
            reference,
            topic: topic ?? null,
            body,
          });
          await sendEmail({ to: email, subject: message.subject, html: message.html });
        });
        return ok({ reference });
      }
      if (error.code !== "23505") return fail(FILE_FAILED_MESSAGE);
    }
    return fail(FILE_FAILED_MESSAGE);
  } catch {
    // A missing service key or network failure never crashes the chat.
    return fail(FILE_FAILED_MESSAGE);
  }
}
