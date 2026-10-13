import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { reportReadError } from "../observability/read-error";
import { loadListingsByIds } from "../listings/supabase-repository";
import { hintsApply, listingGaps, type GapKey, type HintContext } from "./hints";

/**
 * The gaps in the listing a renter's thread is about, for the chat hints
 * (`hints.ts`). Two reads under the caller's own policy, in parallel: the
 * listing as the card model, and the lister's description, which is read only
 * to see whether pets and house rules are mentioned and is never shown.
 *
 * Null when the thread gets no hints at all (not a renter on a listing thread,
 * a stay or table, a listing no longer published) and on any failed read: a
 * hint that might be wrong is worse than none. An empty array is a listing
 * that leaves nothing out.
 */
export async function readChatHintGaps(
  supabase: SupabaseClient<Database>,
  input: Pick<HintContext, "contextKind" | "role"> & { listingId: string | null },
): Promise<GapKey[] | null> {
  if (!input.listingId) return null;
  /* Cheap refusal first, before any read: the same rule the pure side applies. */
  if (input.contextKind !== "listing" || input.role !== "guest") return null;
  try {
    const [found, described] = await Promise.all([
      loadListingsByIds(supabase, [input.listingId]),
      supabase.from("listings").select("description").eq("id", input.listingId).maybeSingle(),
    ]);
    if (described.error) {
      await reportReadError("read.messages.chatHintGaps", described.error);
      return null;
    }
    const listing = found.get(input.listingId);
    if (!listing) return null;
    const facts = { ...listing, description: described.data?.description ?? null };
    if (!hintsApply({ ...input, listing: facts, visitOpen: false })) return null;
    return listingGaps(facts);
  } catch (error) {
    await reportReadError("read.messages.chatHintGaps", error);
    return null;
  }
}
