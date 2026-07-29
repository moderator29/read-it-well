import type { Listing } from "../listings/types";

/**
 * What a heart tap resolved to.
 *
 * "db" means a row was written or deleted in public.saved_items under the
 * account's own RLS policy, and the returned `saved` flag is the database's
 * truth after the write. "local" means this listing cannot be a row yet, so
 * the device keeps it and the client owns the flip.
 */
export type SaveOutcome =
  | { mode: "db"; listingId: string; saved: boolean }
  | { mode: "local"; listingId: string };

/** One card on the shortlist, with where the save is kept and when it happened. */
export type SavedEntry = {
  listing: Listing;
  /** Epoch seconds, used to order the shortlist newest first. */
  savedAt: number;
  mode: "db" | "local";
};
