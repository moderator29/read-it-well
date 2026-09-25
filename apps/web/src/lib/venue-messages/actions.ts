"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { isFeatureEnabled } from "../flags";
import { sendMessage } from "../messages/actions";
import { createAdminClient } from "../supabase/admin";
import { businessThreadRefusal, isUuid, normaliseBody } from "./rules";

/**
 * MESSAGE A HOTEL OR A RESTAURANT.
 *
 * A property listing has always had "Message agent". A business-grade venue
 * (every hotel under `/stay/[id]` and every restaurant with no listing row)
 * had nothing: a conversation had to be about a listing, a booking or a table,
 * and a guest who has not booked yet has none of those. The stay page linked
 * `/messages/new?listing=<accommodation id>`, which could only ever fail.
 *
 * This is the same find-or-create a listing thread does, keyed on the
 * business instead: one thread per guest per business, the business OWNER on
 * the other side, the first message sent in the same call so an abandoned tap
 * leaves nothing in either inbox. The database rules (published venues only,
 * never with yourself, the daily new-thread limit, the block) are in
 * `supabase/PROPOSED_track_f.sql` and live in the trigger, exactly as they do
 * for listings. Until that migration is applied the column does not exist, and
 * this answers with a sentence rather than an error code.
 *
 * `conversations.business_id` is not in the generated types yet, so the two
 * statements that touch it go through an untyped handle on the SAME client
 * (the caller's own RLS session). Nothing here uses the service role to write.
 */
export async function messageVenue(input: {
  businessId: string;
  body: string;
}): Promise<ActionResult<{ conversationId: string }>> {
  const body = normaliseBody(input?.body);
  if (!body) return fail("Type a message before sending.", { body: "Type a message before sending." });
  if (!isUuid(input?.businessId)) return fail("We could not find this venue. It may have been taken down.");

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  if (!(await isFeatureEnabled("messaging"))) {
    return fail("Messaging is paused for maintenance. Please try again in a little while.");
  }

  /* The venue through the caller's own read: only a PUBLISHED business (or
     the caller's own) resolves. The owner id then comes from the service
     role, the same way a listing's agent does, because the guest may not be
     able to read it. */
  const { data: venue } = await session.supabase
    .from("businesses")
    .select("id, name, is_demo, status")
    .eq("id", input.businessId)
    .maybeSingle();
  let ownerId: string | null = null;
  if (venue) {
    try {
      const { data } = await createAdminClient()
        .from("businesses")
        .select("owner_id")
        .eq("id", venue.id)
        .maybeSingle();
      ownerId = data?.owner_id ?? null;
    } catch {
      ownerId = null;
    }
  }
  const refusal = businessThreadRefusal({
    found: Boolean(venue),
    isExample: venue?.is_demo === true,
    published: venue?.status === "PUBLISHED",
    ownerId,
    callerId: session.user.id,
  });
  if (refusal) return fail(refusal);

  const db = session.supabase as unknown as SupabaseClient;
  const existing = await db
    .from("conversations")
    .select("id")
    .eq("guest_id", session.user.id)
    .eq("business_id", input.businessId)
    .maybeSingle();
  if (existing.error) return fail(schemaOrDown(existing.error.code));

  let conversationId: string | null = (existing.data as { id: string } | null)?.id ?? null;
  if (!conversationId) {
    const created = await db
      .from("conversations")
      .insert({
        guest_id: session.user.id,
        agent_id: ownerId,
        context_kind: "business",
        business_id: input.businessId,
      })
      .select("id")
      .single();
    if (created.error) {
      if (created.error.code === "23505") {
        const raced = await db
          .from("conversations")
          .select("id")
          .eq("guest_id", session.user.id)
          .eq("business_id", input.businessId)
          .maybeSingle();
        conversationId = (raced.data as { id: string } | null)?.id ?? null;
      } else if (created.error.code === "54000") {
        return fail(
          "You have opened 20 new conversations today, which is the daily limit. Your existing chats are unaffected.",
        );
      } else if (created.error.code === "42501") {
        return fail("You cannot message this venue.");
      } else {
        return fail(schemaOrDown(created.error.code));
      }
    } else {
      conversationId = (created.data as { id: string }).id;
    }
  }
  if (!conversationId) return fail("We could not open this conversation just now. Please try again.");

  const sent = await sendMessage({ conversationId, body });
  if (!sent.ok) return fail(sent.error, sent.fieldErrors);
  return ok({ conversationId });
}

/** 42703 / PGRST204 / 22P02: the column or the enum value is not live yet. */
function schemaOrDown(code: string | undefined): string {
  if (code === "42703" || code === "PGRST204" || code === "22P02" || code === "PGRST200") {
    return "Messaging hotels and restaurants directly is switching on shortly. Until then, use the venue's booking or table request, which opens a chat with them.";
  }
  return "Messaging is unavailable just now. Please try again shortly.";
}
