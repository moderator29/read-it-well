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
 * The states a person would call CLOSED: it happened, it was refused, or it
 * was pulled. Terminal in the database too, which is what makes this the
 * honest user-facing bucket rather than a guess. The complement, REQUESTED,
 * PROPOSED and CONFIRMED, is what the inspections page calls Open, and inside
 * it `isOpen` still answers the narrower question of whose move it is.
 */
export const CLOSED_STATES: readonly InspectionState[] = [
  "DECLINED",
  "COMPLETED",
  "WITHDRAWN",
] as const;

export function isClosed(state: InspectionState): boolean {
  return CLOSED_STATES.includes(state);
}

/**
 * Why a COMPLETED inspection is complete. A reason on the state, not a
 * seventh state: `deal_done` is the founder's "closed = deal done" without
 * forking every `Record<InspectionState, ...>` in the components. Mirrors the
 * CHECK on `inspection_requests.outcome`.
 */
export type InspectionOutcome = "inspected" | "deal_done" | "no_deal";

export const INSPECTION_OUTCOMES: readonly InspectionOutcome[] = [
  "inspected",
  "deal_done",
  "no_deal",
] as const;

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
  /**
   * Set only on COMPLETED, and only if somebody said why. Optional on the
   * type because the components build fixtures of this shape and none of
   * them has an opinion about it; every read in lib/inspections fills it.
   */
  outcome?: InspectionOutcome | null;
};
