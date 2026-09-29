"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { setupExempt } from "../actions/setup-exempt";
import { SHOT_SLOTS } from "./shot-list";

/**
 * V-70. Label a listing photo with what it shows, or clear the label. One
 * call to `set_listing_photo_slot` on the owner's own session: the function
 * checks ownership, that the listing is still editable, and that a utility
 * slot matches a utility the listing claims.
 */
const WORDS: Record<string, string> = {
  not_found: "We could not find that photo on your listing.",
  locked: "This listing is in review or published, so its photos are fixed.",
  bad_slot: "Choose what the photo shows from the list.",
  not_claimed: "That label is for a utility this listing does not claim. Say so in the utilities step first.",
};

export async function setPhotoSlot(input: { photoId: string; slot: string | null }): Promise<ActionResult<null>> {
  const parsed = validate(
    z.object({ photoId: z.uuid("That photo could not be identified."), slot: z.enum(SHOT_SLOTS).nullable() }),
    input,
  );
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  try {
    const { data, error } = await (session.supabase as unknown as SupabaseClient).rpc("set_listing_photo_slot", {
      p_photo: parsed.data.photoId,
      p_slot: parsed.data.slot,
    });
    const status = !error && data && typeof data === "object" ? String((data as Record<string, unknown>).status) : null;
    if (status !== "ok") return fail(WORDS[status ?? ""] ?? "The label did not save. Try again.");
    return ok(null);
  } catch {
    return fail("The label did not save. Try again.");
  }
}

/** The labels on a listing's photos, by photo id. Empty on any failure. */
/* B-2: read-only (or an exit the finish-setup hold never blocks), so it runs
   with the hold lifted. See lib/actions/setup-exempt.ts. */
export async function readPhotoSlots(
  ...args: Parameters<typeof readPhotoSlotsInner>
): Promise<Awaited<ReturnType<typeof readPhotoSlotsInner>>> {
  return setupExempt(() => readPhotoSlotsInner(...args));
}

async function readPhotoSlotsInner(listingId: string): Promise<Record<string, string>> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return {};
  try {
    const { data, error } = await (session.supabase as unknown as SupabaseClient)
      .from("listing_photo_slots")
      .select("photo_id, slot")
      .eq("listing_id", listingId);
    if (error || !Array.isArray(data)) return {};
    return Object.fromEntries((data as { photo_id: string; slot: string }[]).map((row) => [row.photo_id, row.slot]));
  } catch {
    return {};
  }
}
