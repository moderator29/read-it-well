/**
 * The inspection, as the product speaks about it.
 *
 * The database's own account of why this exists is in the migration
 * `..._an_inspection_is_a_thing_that_has_a_state.sql`, and it is the argument
 * worth reading first: in this market the inspection IS the transaction, and
 * until that migration the platform could not represent it. It lived as
 * sentences in a chat thread, so a lister with nine properties had no list of
 * who wants to see what and a renter who asked three agents had no way to know
 * which of them replied.
 *
 * This module is the vocabulary. The states mirror `public.inspection_state`
 * exactly and the union must stay a superset of the enum, for the same reason
 * the wallet's kinds do: a read maps a row straight onto it, and an exhaustive
 * `Record<InspectionState, ...>` in the components turns a new state into a
 * compile error rather than a blank row.
 */

export type InspectionState =
  | "REQUESTED"
  | "CONFIRMED"
  | "PROPOSED"
  | "DECLINED"
  | "COMPLETED"
  | "WITHDRAWN";

/**
 * The states in which somebody still has to do something.
 *
 * Used to decide what counts as an OPEN request in both consoles, and
 * therefore what the lister's home surfaces above everything else. A declined,
 * completed or withdrawn request is a record; these two are work.
 */
export const OPEN_STATES: readonly InspectionState[] = ["REQUESTED", "PROPOSED"] as const;

export function isOpen(state: InspectionState): boolean {
  return OPEN_STATES.includes(state);
}

/**
 * WHOSE MOVE IT IS, which is the single most useful thing to state on a row.
 *
 * A list of requests where every row says only its state makes the reader work
 * out whether they are waiting or being waited on. This answers it once, and
 * the two surfaces read it the same way, so a lister and a renter looking at
 * the same inspection never disagree about who is holding it up.
 */
export type Waiting = "lister" | "requester" | "nobody";

export function waitingOn(state: InspectionState): Waiting {
  if (state === "REQUESTED") return "lister";
  /* A proposed time is the lister's answer, so the ball is back with whoever
     asked. This is the state that stops a reschedule reading as a refusal. */
  if (state === "PROPOSED") return "requester";
  return "nobody";
}

/** One inspection, from either side, with the property named. */
export type Inspection = {
  id: string;
  listingId: string;
  /** Null only when the listing has been taken down since. */
  listingTitle: string | null;
  state: InspectionState;
  /** ISO. What the person asked for; never rewritten by a reschedule. */
  requestedAt: string;
  /** ISO. What was actually agreed, once somebody agreed to it. */
  slotAt: string | null;
  note: string | null;
  listerNote: string | null;
  createdAt: string;
  respondedAt: string | null;
  conversationId: string | null;
  /** The other party's display name, when the projection could resolve one. */
  counterpartName: string | null;
};
