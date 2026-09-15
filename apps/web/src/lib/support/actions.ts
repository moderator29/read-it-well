"use server";

import { randomInt } from "node:crypto";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  fail,
  formDataToObject,
  ok,
  validate,
  type ActionResult,
} from "../actions/envelope";
import { consume, ipFromHeaders, subjectForIp, subjectForUser } from "../security/rate-limit";
import type { Database } from "../supabase/database.types";
import { NOT_CONFIGURED_MESSAGE, resolveSession } from "../actions/session";
import { bestEffortEmail, sendMessage } from "../email/client";
import { supportTicketFiled } from "../email/messages";
import { isFeatureEnabled } from "../flags";
import { isSupabaseConfigured } from "../supabase/env";
import { createAdminClient } from "../supabase/admin";
import { SUPPORT_TOPICS } from "../trust/support-topics";

/**
 * Support ticket filing.
 *
 * The escalation path out of SupportChat lands here: validate the little the
 * user gave us (name and email only, plus their question), generate a
 * human-readable VAL-SUP reference, and persist the ticket. Signed-in users
 * insert under their own RLS policy so the ticket belongs to them; anonymous
 * visitors are filed through the service role, because the tickets table has
 * no anonymous insert policy by design. When Supabase is not configured the
 * action says so honestly instead of inventing a reference.
 *
 * THE LIMIT LIVES HERE, not only on the callers. `submitContactForm` throttles
 * itself before delegating, but a "use server" export is its own HTTP endpoint:
 * a caller who posts straight at this function skips every check the contact
 * form performs on the way in. Unthrottled, that is an anonymous service-role
 * insert repeated as fast as the network allows, and worse, an open relay for
 * our own domain, because the acknowledgement below goes to whatever address
 * the request names with whatever name the request supplies. So the throttle is
 * on the write path itself and both callers inherit it.
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
  /**
   * The AI agent's short account of the conversation, written when support
   * escalates itself. It becomes the first message on the ticket thread so
   * the human picking it up starts with context rather than one line.
   */
  summary: z.string().trim().max(4000).optional(),
});

export type SupportTicketInput = z.infer<typeof ticketSchema>;

const FILE_FAILED_MESSAGE =
  "We could not file your ticket just now. Your question is kept in this conversation, so please try again shortly.";
const PAUSED_MESSAGE =
  "Ticket filing is paused for a moment of maintenance. Your question is kept in this conversation; please try again shortly.";

function makeReference(): string {
  return `VAL-SUP-${String(randomInt(0, 100_000)).padStart(5, "0")}`;
}

/**
 * Open the ticket thread with the escalation summary.
 *
 * Deliberately not exported: a "use server" export is a callable endpoint, and
 * an endpoint that writes an arbitrary message to an arbitrary ticket id is a
 * hole. It runs on the same client that just wrote the ticket, so a signed-in
 * caller's message goes in under their own insert policy (sender_role user,
 * sender_id themselves) and an anonymous ticket is opened by the same service
 * path that created it. The row is authored by the platform, so the sender is
 * the person the ticket belongs to and the admin-reply notification trigger,
 * which only fires on admin messages, stays quiet.
 */
async function attachFirstMessage(
  client: SupabaseClient<Database>,
  ticketId: string,
  userId: string | null,
  body: string,
): Promise<void> {
  try {
    await client.from("support_ticket_messages").insert({
      ticket_id: ticketId,
      sender_role: "user",
      sender_id: userId,
      body,
    });
  } catch {
    // The ticket is filed and the reference is real; a missing opening
    // message is a smaller loss than pretending the escalation failed.
  }
}

export async function fileSupportTicket(
  input: SupportTicketInput,
): Promise<ActionResult<{ reference: string }>> {
  const parsed = validate(ticketSchema, input);
  if (!parsed.ok) return parsed;

  if (!(await isFeatureEnabled("support"))) return fail(PAUSED_MESSAGE);
  if (!isSupabaseConfigured()) return fail(NOT_CONFIGURED_MESSAGE);

  const session = await resolveSession();

  // Signed-in callers are counted by account, everyone else by address. Ten an
  // hour is far above what somebody with a genuine problem needs, including one
  // who escalates a chat and then files again from the contact form, and far
  // below what makes a spam run or an email relay worth attempting. The limiter
  // fails open by design, so an outage in the counter never stops a real person
  // reaching support.
  const verdict = await consume({
    bucket: "support_ticket",
    subject:
      session.state === "signed-in"
        ? subjectForUser(session.user.id)
        : subjectForIp(ipFromHeaders(await headers())),
    limit: 10,
    windowSeconds: 3_600,
  });
  if (!verdict.allowed) {
    return fail(
      `That is a lot of tickets in one hour. Try again ${verdict.retryIn}, and quote your earlier reference if it is the same problem.`,
    );
  }

  const { name, email, topic, body, summary } = parsed.data;

  try {
    // Signed-in users file as themselves under RLS; everyone else goes through
    // the service role with no user attached.
    const client: SupabaseClient<Database> =
      session.state === "signed-in" ? session.supabase : createAdminClient();
    const userId = session.state === "signed-in" ? session.user.id : null;

    // The reference is random; on the rare collision, roll again.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const reference = makeReference();
      const { data, error } = await client
        .from("support_tickets")
        .insert({
          reference,
          user_id: userId,
          name,
          email,
          topic: topic && topic.length > 0 ? topic : null,
          body,
          status: "open",
        })
        .select("id")
        .single();
      if (!error) {
        // The row exists, so the reference we are about to return is real.
        // The opening message is best effort on top of that, never a reason
        // to tell somebody their ticket did not file.
        if (summary && data?.id) {
          await attachFirstMessage(client, data.id, userId, summary);
        }
        // The ticket row is written. The acknowledgement is best effort, and
        // goes only to the address Zod has already validated on this form.
        await bestEffortEmail(async () => {
          const message = supportTicketFiled({
            name,
            reference,
            topic: topic ?? null,
            body,
          });
          await sendMessage(email, message);
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

/* ------------------------------------------------------------ contact form */

/*
 * THE TOPIC LIST LIVES IN lib/trust/support-topics.ts, AND IT USED TO LIVE
 * HERE AS WELL.
 *
 * That module was written to stop exactly this: "two lists means the queue
 * eventually shows 'safety' as a bare word to the operator while the person who
 * chose it read a whole sentence". The second list stayed behind in this file
 * and the two drifted, in the way that costs the most.
 *
 * The form's select posts the CODE, and it offers six of them because
 * `SUPPORT_TOPICS` has six. The copy of the list here had five, with no
 * "safety" in it, so `value in CONTACT_TOPICS` was false for the one topic
 * worded as the thing this queue exists for, and anybody choosing "Someone
 * asked me to pay outside Vallo" was refused with "Pick one of the topics
 * listed" for picking a topic that was listed.
 *
 * The second half was quieter and just as wrong: this file translated the code
 * into a label before storing it, so `support_tickets.topic` held "A booking"
 * where the admin queue's `gradeForTopic` and `supportTopicLabel` both expect
 * "booking". The four hour clock on a safety ticket could therefore never fire,
 * even once the refusal above was gone.
 *
 * So: one list, validated as codes, stored as codes. Rows filed before this
 * carry a label, which `supportTopicLabel` already falls back to printing raw.
 */

const contactSchema = z.object({
  name: z.string().trim().min(1, "Add your name so we know who to reply to.").max(120),
  email: z
    .string()
    .trim()
    .min(1, "Add an email address so we can reply.")
    .email("Enter a valid email address.")
    .max(200),
  topic: z
    .string()
    .trim()
    .refine(
      (value) => (SUPPORT_TOPICS as readonly string[]).includes(value),
      "Pick one of the topics listed.",
    )
    .default("other"),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more, at least a sentence, so we can help properly.")
    .max(4000, "Keep it under 4000 characters. Attach the detail in your reply to us."),
});

/**
 * The public contact form, filed as a real support ticket.
 *
 * The form used to set a local flag and tell the visitor, honestly, that
 * nothing had been sent and to email support instead. That was true, and it
 * was also a finished write path sitting one import away: `fileSupportTicket`
 * has handled anonymous visitors through the service role since support
 * shipped. Now the form files a ticket with a real VAL-SUP reference, the
 * acknowledgement email goes to the address on the form, and the reference is
 * shown so the visitor can quote it.
 *
 * Rate limited by address before anything is written, because this is the one
 * ticket path with no account behind it and it runs through the service role
 * (RECOMMENDATIONS R-52). Five an hour is far above what a person with a
 * genuine problem needs and far below what makes a spam run worthwhile. The
 * limiter fails open by design, so an outage in the counter never stops a real
 * person reaching support.
 */
export async function submitContactForm(
  _prev: ActionResult<{ reference: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ reference: string }>> {
  const parsed = validate(contactSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const session = await resolveSession();
  const subject =
    session.state === "signed-in"
      ? subjectForUser(session.user.id)
      : subjectForIp(ipFromHeaders(await headers()));

  const verdict = await consume({
    bucket: "contact_form",
    subject,
    limit: 5,
    windowSeconds: 3_600,
  });
  if (!verdict.allowed) {
    return fail(
      `That is a lot of messages in one hour. Try again ${verdict.retryIn}, or email us directly if it is urgent.`,
    );
  }

  const { name, email, topic, message } = parsed.data;
  return fileSupportTicket({ name, email, topic, body: message });
}
