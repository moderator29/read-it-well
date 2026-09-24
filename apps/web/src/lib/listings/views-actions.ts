"use server";

import { resolveSession } from "../actions/session";

/**
 * Count that a signed-in person saw these listings in results and, perhaps,
 * opened one (V-73). The work, the de-duplication per viewer per day and the
 * rules (examples never counted, a lister's own views not counted, twenty
 * cards at most) are all in `public.record_listing_views`; this only hands it
 * the ids. Quiet by design: a count that fails to record must never disturb
 * the page somebody is reading, so it returns nothing and swallows errors,
 * including the function not being deployed yet.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function recordListingViews(seen: string[], opened: string | null): Promise<void> {
  const ids = Array.isArray(seen) ? seen.filter((id) => typeof id === "string" && UUID.test(id)).slice(0, 20) : [];
  const open = typeof opened === "string" && UUID.test(opened) ? opened : null;
  if (ids.length === 0 && !open) return;
  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return;
    await (
      session.supabase as unknown as {
        rpc: (fn: string, args: object) => Promise<{ error: unknown }>;
      }
    ).rpc("record_listing_views", { p_seen: ids, p_opened: open });
  } catch {
    /* Not counted is the honest outcome of a count that failed. */
  }
}
