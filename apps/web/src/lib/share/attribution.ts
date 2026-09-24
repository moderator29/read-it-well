import "server-only";

import { cookies } from "next/headers";
import type { createClient } from "../supabase/server";
import { FIRST_TOUCH_COOKIE, firstTouchFor } from "./first-touch";

type Db = Awaited<ReturnType<typeof createClient>>;
type Rpc = (fn: "attribute_conversation", args: Record<string, unknown>) => PromiseLike<{ error: unknown }>;

/**
 * V-71: credit a new conversation to the lister's door this device first
 * opened, if it did. The database decides whether it counts (the lister's own
 * door, this listing, within 14 days, never overwritten); this only passes on
 * what the device remembered. Best effort, never in the way of the chat.
 */
export async function attributeConversation(supabase: Db, conversationId: string): Promise<void> {
  try {
    /* The conversation's listing, read under the caller's own RLS: the touch
       that counts is the one this device kept for THAT listing. */
    const { data: row } = await supabase
      .from("conversations")
      .select("listing_id")
      .eq("id", conversationId)
      .maybeSingle();
    const listingId = (row as { listing_id: string | null } | null)?.listing_id;
    if (!listingId) return;
    const touch = firstTouchFor((await cookies()).get(FIRST_TOUCH_COOKIE)?.value, listingId, Date.now());
    if (!touch) return;
    const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;
    await rpc("attribute_conversation", {
      p_conversation: conversationId,
      p_token: touch.token,
      p_first_touch: new Date(touch.at).toISOString(),
    });
  } catch {
    /* no credit is the only cost */
  }
}
