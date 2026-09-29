"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consume, subjectForUser } from "../security/rate-limit";
import type { Database } from "../supabase/database.types";
import { canMemberReply } from "./tickets";

/**
 * A member's own moves on their own support ticket: reply, attach a photo,
 * mark it resolved, reopen it, rate the answer, and mark it read.
 *
 * Everything runs on the member's own client. A reply is authorised by
 * `support_ticket_messages_insert_own`, an attachment by
 * `support_ticket_attachments_insert_own` and the storage policy on the
 * `support-attachments` bucket, and the four status moves by the
 * `support_ticket_member_*` functions, which each change a fixed set of
 * columns on a ticket the caller owns (migration 20260929000412). The status
 * checks here are product, not security: they word the refusal.
 */

const ticketId = z.string().uuid("That ticket could not be found.");

const replySchema = z.object({
  ticketId,
  body: z.string().trim().max(4000, "Keep a reply under 4,000 characters."),
  /** True when a photo goes with the reply, so an empty text is allowed. */
  withPhoto: z.boolean().optional(),
});

const REPLY_FAILED = "Your reply could not be sent just now. It is still in the box; try again shortly.";
const MOVE_FAILED = "That did not go through just now. Try again in a moment.";

function refresh(id: string) {
  revalidatePath(`/support/messages/${id}`);
  revalidatePath("/support/messages");
  revalidatePath("/support");
}

type SignedInSession = Extract<Awaited<ReturnType<typeof resolveSession>>, { state: "signed-in" }>;

async function signedIn(): Promise<{ error: string } | { session: SignedInSession }> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { error: NOT_CONFIGURED_MESSAGE };
  if (session.state !== "signed-in") return { error: SIGNED_OUT_MESSAGE };
  return { session };
}

export async function replyToMyTicket(input: {
  ticketId: string;
  body: string;
  withPhoto?: boolean;
}): Promise<ActionResult<{ messageId: string }>> {
  const parsed = validate(replySchema, input);
  if (!parsed.ok) return fail(parsed.fieldErrors.body ?? parsed.fieldErrors.ticketId ?? parsed.error, parsed.fieldErrors);
  const text = parsed.data.body || (parsed.data.withPhoto ? "Sent a photo." : "");
  if (!text) return fail("Write your reply first.", { body: "Write your reply first." });

  const who = await signedIn();
  if ("error" in who) return fail(who.error);
  const { session } = who;

  const verdict = await consume({
    bucket: "support_reply",
    subject: subjectForUser(session.user.id),
    limit: 20,
    windowSeconds: 3_600,
  });
  if (!verdict.allowed) return fail(`That is a lot of replies in one hour. Try again ${verdict.retryIn}.`);

  let messageId: string;
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
      return fail("This ticket is resolved, so nobody would read a reply here. Reopen it, or ask a new question.");
    }

    const { data: message, error: insertError } = await session.supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticket.id,
        sender_role: "user",
        sender_id: session.user.id,
        body: text,
      })
      .select("id")
      .single();
    if (insertError || !message) return fail(REPLY_FAILED);
    messageId = message.id;
  } catch {
    return fail(REPLY_FAILED);
  }

  refresh(parsed.data.ticketId);
  return ok({ messageId });
}

/* ------------------------------------------------------------ attachments */

const ATTACH_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

const attachSchema = z.object({
  ticketId,
  messageId: z.string().uuid().optional(),
  storagePath: z.string().min(1).max(300),
  mimeType: z.enum(ATTACH_MIME),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024, "Photos can be up to 10MB."),
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
});

/** Where a member's photo for a ticket lives: their own folder, then the ticket. */
function attachmentPrefix(userId: string, id: string): string {
  return `${userId}/${id}/`;
}

/**
 * Record a photo the client has already uploaded to the private
 * `support-attachments` bucket. The path must sit in the member's own folder
 * for this ticket; the insert policy checks the same thing and that the
 * ticket is theirs and still open.
 */
export async function attachToMyTicket(input: z.input<typeof attachSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = validate(attachSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const who = await signedIn();
  if ("error" in who) return fail(who.error);
  const { session } = who;
  const data = parsed.data;

  if (!data.storagePath.startsWith(attachmentPrefix(session.user.id, data.ticketId)) || data.storagePath.includes("..")) {
    return fail("That photo does not belong to this ticket. Choose it again.");
  }

  /* Twenty photos an hour is more than a real problem needs; the insert
     policy also caps one ticket at 40 whatever the hour. */
  const verdict = await consume({
    bucket: "support_attachment",
    subject: subjectForUser(session.user.id),
    limit: 20,
    windowSeconds: 3_600,
  });
  if (!verdict.allowed) return fail(`That is a lot of photos in one hour. Try again ${verdict.retryIn}.`);

  try {
    const { data: row, error } = await session.supabase
      .from("support_ticket_attachments")
      .insert({
        ticket_id: data.ticketId,
        message_id: data.messageId ?? null,
        uploader_id: session.user.id,
        storage_path: data.storagePath,
        mime_type: data.mimeType,
        size_bytes: data.sizeBytes,
        width: data.width ?? null,
        height: data.height ?? null,
      })
      .select("id")
      .single();
    if (error || !row) return fail("The photo could not be attached just now. Try adding it again from the conversation.");
    refresh(data.ticketId);
    return ok({ id: row.id });
  } catch {
    return fail("The photo could not be attached just now. Try adding it again from the conversation.");
  }
}

/* ------------------------------------------------------------ status moves */

type MoveStatus = "ok" | "not_found" | "not_open" | "not_resolved" | "too_late" | "bad_rating" | "comment_too_long";

const MOVE_REFUSAL: Record<Exclude<MoveStatus, "ok">, string> = {
  not_found: "That ticket could not be found.",
  not_open: "This ticket is already resolved.",
  not_resolved: "This ticket is not resolved yet.",
  too_late: "This ticket was resolved too long ago to reopen. Ask a new question and quote its reference.",
  bad_rating: "Choose from one to five stars.",
  comment_too_long: "Keep the comment under 1,000 characters.",
};

function outcome(data: unknown): MoveStatus {
  const status = (data as { status?: unknown } | null)?.status;
  return typeof status === "string" && (status === "ok" || status in MOVE_REFUSAL) ? (status as MoveStatus) : "not_found";
}

async function move(
  id: string,
  call: (client: SupabaseClient<Database>) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<ActionResult<null>> {
  if (!ticketId.safeParse(id).success) return fail("That ticket could not be found.");
  const who = await signedIn();
  if ("error" in who) return fail(who.error);
  try {
    const { data, error } = await call(who.session.supabase);
    if (error) return fail(MOVE_FAILED);
    const status = outcome(data);
    if (status !== "ok") return fail(MOVE_REFUSAL[status]);
  } catch {
    return fail(MOVE_FAILED);
  }
  refresh(id);
  return ok(null);
}

export async function resolveMyTicket(id: string): Promise<ActionResult<null>> {
  return move(id, (client) => client.rpc("support_ticket_member_resolve", { p_ticket: id }));
}

export async function reopenMyTicket(id: string): Promise<ActionResult<null>> {
  return move(id, (client) => client.rpc("support_ticket_member_reopen", { p_ticket: id }));
}

const rateSchema = z.object({
  rating: z.number().int().min(1, "Choose from one to five stars.").max(5, "Choose from one to five stars."),
  comment: z.string().trim().max(1000, "Keep the comment under 1,000 characters.").optional(),
});

export async function rateMyTicket(id: string, input: { rating: number; comment?: string }): Promise<ActionResult<null>> {
  const parsed = validate(rateSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  return move(id, (client) =>
    client.rpc("support_ticket_member_rate", {
      p_ticket: id,
      p_rating: parsed.data.rating,
      p_comment: parsed.data.comment || null,
    }),
  );
}

/**
 * Stamp the thread as read, so the unread badge clears.
 *
 * Called from the thread once it is on screen, never from a server render: a
 * prefetch of the thread must not count as the member having read it.
 */
export async function markMyTicketRead(id: string): Promise<ActionResult<null>> {
  if (!ticketId.safeParse(id).success) return fail("That ticket could not be found.");
  const who = await signedIn();
  if ("error" in who) return fail(who.error);
  try {
    const { error } = await who.session.supabase.rpc("support_ticket_member_mark_read", { p_ticket: id });
    if (error) return fail(MOVE_FAILED);
  } catch {
    return fail(MOVE_FAILED);
  }
  revalidatePath("/support/messages");
  revalidatePath("/support");
  return ok(null);
}
