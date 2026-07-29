"use server";

/**
 * The messaging loop: start a conversation, send, attach, confirm inspection,
 * mark read.
 *
 * Every write runs under the sender's own RLS-bound client, so the database is
 * the authority on membership: a message into a conversation the caller does
 * not belong to is refused by policy, not by application code. The database
 * triggers own the fan-out: a message insert bumps the conversation's
 * last_message_at and writes the other participant's notification row, so no
 * code path here can forget either. Marking a thread read is the one place the
 * service role appears, because participants deliberately hold no UPDATE
 * policy on messages; membership is proven through an RLS read first.
 */

import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import { isFeatureEnabled } from "../flags";
import { getListingRepository } from "../listings/repository";
import { createAdminClient } from "../supabase/admin";
import {
  attachImageSchema,
  confirmInspectionSchema,
  markThreadReadSchema,
  sendMessageSchema,
  startConversationSchema,
} from "./schema";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PAUSED_MESSAGE = "Messaging is paused for maintenance. Please try again in a little while.";

const SEED_LISTING_MESSAGE =
  "Messaging opens for this listing the moment it goes live on the platform. Save it and check back soon.";

const UNKNOWN_LISTING_MESSAGE =
  "We could not find this listing. It may no longer be available. Explore other places from search.";

const NOT_YOUR_CONVERSATION_MESSAGE = "That conversation is not on your account.";

const SEND_FAILED_MESSAGE = "Your message did not send. Tap retry to send it again.";

/** The body a photo-only message carries. */
const PHOTO_BODY = "\u{1F4F7} Photo";

/**
 * Find or create the guest's conversation with the agent of a listing.
 *
 * The listing is read through the caller's own client, so only PUBLISHED
 * listings (or the caller's own) resolve. The agent's user id sits behind
 * agents RLS, which is select-own only, so a guest's embedded read comes back
 * empty and the service role finishes the lookup; nothing is written until
 * both parties are known. The unique (guest, agent, listing) triple makes the
 * find-or-create race-safe: a concurrent insert surfaces as 23505 and the
 * existing thread is returned instead.
 */
export async function startConversation(input: {
  listingId: string;
}): Promise<ActionResult<{ conversationId: string }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (!(await isFeatureEnabled("messaging"))) return fail(PAUSED_MESSAGE);

  const parsed = validate(startConversationSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { listingId } = parsed.data;

  // Seed catalogue entries render pages but do not exist in the database, so
  // there is no agent inbox behind them. Honest refusal, never a fake thread.
  if (!UUID_RE.test(listingId)) {
    const seed = await getListingRepository().byId(listingId);
    return fail(seed ? SEED_LISTING_MESSAGE : UNKNOWN_LISTING_MESSAGE);
  }

  const { data: listing, error: listingError } = await session.supabase
    .from("listings")
    .select("id, title, agent_id, agents(user_id)")
    .eq("id", listingId)
    .maybeSingle();
  if (listingError) return fail(UNKNOWN_LISTING_MESSAGE);
  if (!listing) return fail(UNKNOWN_LISTING_MESSAGE);

  // Guests cannot read the agents row under RLS; the service role resolves
  // the counterpart after the listing itself has passed the RLS read above.
  let agentUserId: string | null = listing.agents?.user_id ?? null;
  if (!agentUserId) {
    try {
      const admin = createAdminClient();
      const { data: agent } = await admin
        .from("agents")
        .select("user_id")
        .eq("id", listing.agent_id)
        .maybeSingle();
      agentUserId = agent?.user_id ?? null;
    } catch {
      agentUserId = null;
    }
  }
  if (!agentUserId) {
    return fail("The agent for this listing is not reachable right now. Please try again shortly.");
  }
  if (agentUserId === session.user.id) {
    return fail("This is your own listing, so there is no agent to message.");
  }

  const { data: existing, error: findError } = await session.supabase
    .from("conversations")
    .select("id")
    .eq("guest_id", session.user.id)
    .eq("agent_id", agentUserId)
    .eq("listing_id", listingId)
    .maybeSingle();
  if (findError) return fail("Messaging is unavailable just now. Please try again shortly.");
  if (existing) return ok({ conversationId: existing.id });

  const { data: created, error: insertError } = await session.supabase
    .from("conversations")
    .insert({ guest_id: session.user.id, agent_id: agentUserId, listing_id: listingId })
    .select("id")
    .single();

  if (insertError || !created) {
    if (insertError?.code === "23505") {
      // Lost the race to ourselves in another tab: the thread now exists.
      const { data: raced } = await session.supabase
        .from("conversations")
        .select("id")
        .eq("guest_id", session.user.id)
        .eq("agent_id", agentUserId)
        .eq("listing_id", listingId)
        .maybeSingle();
      if (raced) return ok({ conversationId: raced.id });
    }
    return fail("We could not open this conversation just now. Please try again.");
  }

  return ok({ conversationId: created.id });
}

/** What a successful send hands back for the optimistic bubble to adopt. */
export type SentMessage = {
  id: string;
  conversationId: string;
  body: string;
  createdAt: string;
};

/**
 * Send a message. One insert under the sender's RLS client; the database
 * triggers bump the conversation, notify the other participant and run the
 * safety pipeline. Nothing else to do here.
 */
export async function sendMessage(input: {
  conversationId: string;
  body: string;
}): Promise<ActionResult<SentMessage>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (!(await isFeatureEnabled("messaging"))) return fail(PAUSED_MESSAGE);

  const parsed = validate(sendMessageSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { data: row, error } = await session.supabase
    .from("messages")
    .insert({
      conversation_id: parsed.data.conversationId,
      sender_id: session.user.id,
      body: parsed.data.body,
    })
    .select("id, conversation_id, body, created_at")
    .single();

  if (error || !row) {
    if (error?.code === "42501") return fail(NOT_YOUR_CONVERSATION_MESSAGE);
    return fail(SEND_FAILED_MESSAGE);
  }

  return ok({
    id: row.id,
    conversationId: row.conversation_id,
    body: row.body,
    createdAt: row.created_at,
  });
}

/**
 * Record an image attachment after the client has uploaded it to the private
 * message-attachments bucket. When no message id is given the photo gets its
 * own message first, so it lands in the thread and notifies like any other.
 * The storage path must sit inside this conversation's folder; a path
 * claiming another folder is refused before any write.
 */
export async function attachImage(input: {
  conversationId: string;
  messageId?: string;
  storagePath: string;
  width?: number;
  height?: number;
}): Promise<ActionResult<{ messageId: string; attachmentId: string }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (!(await isFeatureEnabled("messaging"))) return fail(PAUSED_MESSAGE);

  const parsed = validate(attachImageSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const data = parsed.data;

  if (!data.storagePath.toLowerCase().startsWith(`${data.conversationId.toLowerCase()}/`)) {
    return fail("This photo does not belong to this conversation.");
  }

  let messageId = data.messageId ?? null;
  if (!messageId) {
    const { data: message, error: messageError } = await session.supabase
      .from("messages")
      .insert({
        conversation_id: data.conversationId,
        sender_id: session.user.id,
        body: PHOTO_BODY,
      })
      .select("id")
      .single();
    if (messageError || !message) {
      if (messageError?.code === "42501") return fail(NOT_YOUR_CONVERSATION_MESSAGE);
      return fail("Your photo did not send. Tap retry to send it again.");
    }
    messageId = message.id;
  }

  const { data: attachment, error: attachError } = await session.supabase
    .from("message_attachments")
    .insert({
      message_id: messageId,
      storage_path: data.storagePath,
      width: data.width ?? null,
      height: data.height ?? null,
    })
    .select("id")
    .single();

  if (attachError || !attachment) {
    // RLS refuses attachments onto messages the caller did not send.
    return fail("Your photo did not send. Tap retry to send it again.");
  }

  return ok({ messageId, attachmentId: attachment.id });
}

/**
 * Record, inside the conversation, that the guest has inspected the property.
 * One row per person per conversation; doing it twice gets the honest answer.
 */
export async function confirmInspection(input: {
  conversationId: string;
  listingId: string;
}): Promise<ActionResult<{ confirmedAt: string }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (!(await isFeatureEnabled("messaging"))) return fail(PAUSED_MESSAGE);

  const parsed = validate(confirmInspectionSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { data: row, error } = await session.supabase
    .from("inspection_confirmations")
    .insert({
      conversation_id: parsed.data.conversationId,
      listing_id: parsed.data.listingId,
      user_id: session.user.id,
    })
    .select("confirmed_at")
    .single();

  if (error || !row) {
    if (error?.code === "23505") return fail("You have already confirmed inspection here.");
    if (error?.code === "42501") return fail(NOT_YOUR_CONVERSATION_MESSAGE);
    return fail("Your confirmation did not save. Please try again.");
  }

  return ok({ confirmedAt: row.confirmed_at });
}

/**
 * Mark the other party's unread messages in this thread as read.
 *
 * Participants hold no UPDATE policy on messages by design, so the write goes
 * through the service role, strictly after the caller's own RLS client has
 * proven they are one of the two participants. Only messages addressed to the
 * caller are touched; their own sent messages keep whatever state the other
 * side gives them.
 */
export async function markThreadRead(input: {
  conversationId: string;
}): Promise<ActionResult<{ updated: number }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (!(await isFeatureEnabled("messaging"))) return fail(PAUSED_MESSAGE);

  const parsed = validate(markThreadReadSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  // Membership proof under the caller's own RLS. Admins can read conversations
  // they are not in, so the participant check is explicit, not implied.
  const { data: conversation, error: readError } = await session.supabase
    .from("conversations")
    .select("id, guest_id, agent_id")
    .eq("id", parsed.data.conversationId)
    .maybeSingle();
  if (readError) return fail("Read receipts are unavailable just now.");
  if (
    !conversation ||
    (conversation.guest_id !== session.user.id && conversation.agent_id !== session.user.id)
  ) {
    return fail(NOT_YOUR_CONVERSATION_MESSAGE);
  }

  try {
    const admin = createAdminClient();
    const { data: updated, error: updateError } = await admin
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversation.id)
      .neq("sender_id", session.user.id)
      .is("read_at", null)
      .select("id");
    if (updateError) return fail("Read receipts are unavailable just now.");
    return ok({ updated: updated?.length ?? 0 });
  } catch {
    return fail("Read receipts are unavailable just now.");
  }
}
