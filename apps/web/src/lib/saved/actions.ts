"use server";

/**
 * The saved loop: one heart, two honest destinations.
 *
 * A published platform listing is saved as a row in public.saved_items written
 * through the account's own RLS-bound client, so the database decides whose
 * shortlist it is and the page reads that truth back on the next load. A
 * catalogue listing cannot be a row, because saved_items.listing_id has a
 * foreign key to public.listings, so the answer is the typed "local" hint and
 * the device keeps it. Neither path pretends to be the other.
 *
 * Signed out, a platform listing returns the sign-in envelope. The tap is not
 * lost: the client has already written the save locally and re-plays it once
 * the account exists.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import type { SaveOutcome } from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toggleInputSchema = z.object({
  listingId: z.string().trim().min(1, "Choose a listing to save.").max(120),
});

const SAVE_DOWN_MESSAGE =
  "We could not update your shortlist just now. Please try again in a moment.";

const GONE_MESSAGE =
  "This place is no longer available, so it cannot be saved. Explore other stays from search.";

/**
 * Flip the heart. Resolves the current state from the database rather than
 * trusting the client, so a double tap or a stale tab cannot desynchronise the
 * shortlist.
 */
export async function toggleSave(input: {
  listingId: string;
}): Promise<ActionResult<SaveOutcome>> {
  const parsed = validate(toggleInputSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const { listingId } = parsed.data;

  // Catalogue ids can never satisfy the foreign key, so the device owns them.
  if (!UUID_RE.test(listingId)) return ok({ mode: "local", listingId });

  const session = await resolveSession();
  // Without platform keys there is nowhere to write but the device, and that
  // is a real save rather than a placeholder, so it is reported as one.
  if (session.state === "unconfigured") return ok({ mode: "local", listingId });
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const { data: existing, error: readError } = await session.supabase
    .from("saved_items")
    .select("listing_id")
    .eq("user_id", session.user.id)
    .eq("listing_id", listingId)
    .maybeSingle();
  if (readError) return fail(SAVE_DOWN_MESSAGE);

  if (existing) {
    const { error } = await session.supabase
      .from("saved_items")
      .delete()
      .eq("user_id", session.user.id)
      .eq("listing_id", listingId);
    if (error) return fail(SAVE_DOWN_MESSAGE);
    revalidatePath("/saved");
    return ok({ mode: "db", listingId, saved: false });
  }

  const { error } = await session.supabase
    .from("saved_items")
    .insert({ user_id: session.user.id, listing_id: listingId });
  if (error) {
    // 23503: the listing was withdrawn between the page render and the tap.
    if (error.code === "23503") return fail(GONE_MESSAGE);
    // 23505: already saved in another tab. The user's intent is satisfied.
    if (error.code === "23505") {
      revalidatePath("/saved");
      return ok({ mode: "db", listingId, saved: true });
    }
    return fail(SAVE_DOWN_MESSAGE);
  }

  revalidatePath("/saved");
  return ok({ mode: "db", listingId, saved: true });
}
