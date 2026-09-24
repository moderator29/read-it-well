/**
 * The one sentence for a write that hit a closed listing.
 *
 * `listings_closed_stays_closed` (20260924110300) refuses any status change on
 * a row with `closed_at` set, for every role, with a 23514 whose message is
 * already a sentence. The moderation and lister actions that change status
 * map that refusal here, so an operator on a stale page reads why rather than
 * "the service is down".
 */
export const CLOSED_LISTING_MESSAGE =
  "This listing was closed as let or unavailable, and a closed listing stays closed. Staff can reopen it from the listing page, with a note.";

export function isClosedListingRefusal(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; message?: unknown };
  return e.code === "23514" && typeof e.message === "string" && /closed listing stays closed/i.test(e.message);
}
