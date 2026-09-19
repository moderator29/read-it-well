/**
 * Who hosts a reservation: the one rule for both spines.
 *
 * A table is held at exactly one venue (`reservations_exactly_one_target_chk`):
 * a restaurant listing, whose host is the listing's agent as a user id, or a
 * first-party business (M7), whose host is `businesses.owner_id`. The b3
 * party check in `private.conversation_context_is_valid` resolves the host
 * through `coalesce(agents.user_id, businesses.owner_id)`; this is that same
 * expression on the application side, written once so the thread opener and
 * any later reader agree with the trigger about who the second party is.
 *
 * Pure. The row shape is what a PostgREST embed of `listings(agent_id,
 * agents(user_id))` and `businesses(owner_id)` hands back, with every join
 * optional because a guest cannot always read the joined row under RLS: the
 * caller falls back to the service role for the id that is missing.
 */

export type ReservationHostSpine = {
  listing_id?: string | null;
  business_id?: string | null;
  listings?: { agent_id: string | null; agents?: { user_id: string } | null } | null;
  businesses?: { owner_id: string | null } | null;
};

/** The host's user id when the embeds carried it, else null. */
export function reservationHostUserId(row: ReservationHostSpine): string | null {
  const viaListing = row.listings?.agents?.user_id ?? null;
  if (viaListing) return viaListing;
  const viaBusiness = row.businesses?.owner_id ?? null;
  if (viaBusiness) return viaBusiness;
  return null;
}

/**
 * Which spine the reservation stands on, so a caller that has to fall back to
 * the service role knows which table to ask. A row carrying neither id is
 * malformed and answers null.
 */
export function reservationSpine(
  row: ReservationHostSpine,
): { kind: "listing"; agentId: string | null } | { kind: "business"; businessId: string } | null {
  if (row.business_id && !row.listing_id) return { kind: "business", businessId: row.business_id };
  if (row.listing_id) return { kind: "listing", agentId: row.listings?.agent_id ?? null };
  return null;
}
