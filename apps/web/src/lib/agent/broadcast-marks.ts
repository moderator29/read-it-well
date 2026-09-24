"use server";

import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { resolveSession, SIGNED_OUT_MESSAGE } from "../actions/session";

/**
 * V-09: THE UNCONFIRMED SET, KEPT BESIDE THE DRAFT ON THE SERVER.
 *
 * Written through the lister's own client: `listing_broadcast_marks` is
 * readable and writable only by the agent who owns the listing (migration
 * 20260924121500), so a crafted call for somebody else's listing writes
 * nothing. An empty set deletes the row. `submitListing` reads the same row
 * and refuses while a money figure is still unconfirmed.
 *
 * This module exports only async functions, per the server-actions rule.
 */

const schema = z.object({
  listingId: z.string().uuid(),
  keys: z.array(z.string().regex(/^[A-Za-z]{1,40}$/)).max(40),
});

type MarksTable = {
  from: (table: "listing_broadcast_marks") => {
    delete: () => { eq: (col: string, value: string) => PromiseLike<{ error: unknown }> };
    upsert: (row: Record<string, unknown>, opts: { onConflict: string }) => PromiseLike<{ error: unknown }>;
  };
};

export async function saveBroadcastMarks(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(parsed.error);
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);
  const db = session.supabase as unknown as MarksTable;
  const keys = [...new Set(parsed.data.keys)].sort();
  const { error } =
    keys.length === 0
      ? await db.from("listing_broadcast_marks").delete().eq("listing_id", parsed.data.listingId)
      : await db
          .from("listing_broadcast_marks")
          .upsert(
            { listing_id: parsed.data.listingId, unconfirmed: keys, updated_at: new Date().toISOString() },
            { onConflict: "listing_id" },
          );
  return error ? fail("We could not save which figures still need checking. Try again.") : ok(null);
}
