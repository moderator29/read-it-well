"use server";

import { z } from "zod";
import type { ThreadCardData } from "@/components/app/messages/ChatCard";
import { fail, ok, validate, type ActionResult } from "@/lib/actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "@/lib/actions/session";
import { getLocale } from "@/lib/locale";
import { resolveCards } from "./cards";

/**
 * THE CARD FOR A MESSAGE THAT ARRIVED LIVE.
 *
 * The thread page expands the shares it loads into cards on the server
 * (`resolveCards`). A message that arrives over realtime used to draw as its
 * words and its path until the next reload, because nothing on the client can
 * read a listing, a booking or a passport. This is the same expansion for one
 * message, asked for by the open thread when a share arrives.
 *
 * Nothing here trusts the client about WHO sent it: the message is read back
 * under the reader's own row level security (so it resolves only for a
 * member of that conversation) and its sender comes from the row. The rule for
 * what draws as a card is the thread page's own (`cardRefFor`, through
 * `resolveCards`), not a copy of it.
 */

const schema = z.object({
  conversationId: z.uuid(),
  messageId: z.uuid(),
});

type MessageReader = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          maybeSingle(): Promise<{ data: { id: string; body: string; sender_id: string | null } | null; error: unknown }>;
        };
      };
    };
  };
};

export async function resolveLiveCard(input: unknown): Promise<ActionResult<{ card: ThreadCardData | null }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { data, error } = await (session.supabase as unknown as MessageReader)
    .from("messages")
    .select("id, body, sender_id")
    .eq("id", parsed.data.messageId)
    .eq("conversation_id", parsed.data.conversationId)
    .maybeSingle();
  /* Not readable by this member, or not there: words and a path, as ever. */
  if (error || !data) return ok({ card: null });

  const cards = await resolveCards(
    session.supabase,
    [{ id: data.id, body: data.body, senderId: data.sender_id }],
    await getLocale(),
  );
  return ok({ card: cards.get(data.id) ?? null });
}
