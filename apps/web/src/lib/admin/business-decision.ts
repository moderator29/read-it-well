import type { Database } from "../supabase/database.types";

/**
 * WHO MAY DECIDE A HOST APPLICATION, AND FROM WHICH STATE.
 *
 * Pure and client-safe, so the decision actions in `business-actions.ts` (a
 * "use server" module, which may export only actions) and the desk's card ask
 * the same questions and cannot drift apart.
 */

type ListingStatus = Database["public"]["Enums"]["listing_status"];

export type BusinessDecision = "approve" | "more_info" | "reject";

/**
 * NOBODY DECIDES THEIR OWN BUSINESS.
 *
 * The listing desk and the agent application desk have refused a reviewer
 * deciding their own record since the public-repo hardening
 * (`private.refuse_self_review`, and `lib/admin/actions.ts`). The host desk
 * never did, in the app or in the database: an admin who also owns a hotel or
 * a restaurant could approve it, publish its property and pass its identity
 * rung, which is the one write that lights the verified mark.
 */
export const SELF_REVIEW_REFUSAL =
  "You cannot decide your own business. Leave it for another reviewer.";

export function isOwnBusiness(ownerId: string | null | undefined, reviewerId: string): boolean {
  return typeof ownerId === "string" && ownerId.length > 0 && ownerId === reviewerId;
}

/**
 * Why a review decision cannot be taken on a business in this state, or null
 * when it can.
 *
 * Four refusals and no more, because the rest of the machine is deliberate (a
 * refused application can be sent back for a change, a live one can still be
 * refused):
 *
 *  - A DRAFT has not been sent, so there is nothing to review.
 *  - A PUBLISHED business is only ever refused from here; approving or sending
 *    back a live venue is not a review.
 *  - A SUSPENDED business is not this desk's to reopen. Approving one moved it
 *    to APPROVED, which quietly lifted a stop that a purge or an operator put
 *    there, with a review note in place of the reason it was stopped.
 *  - An APPROVED business is not approved again. It changed nothing but the
 *    review date and sent the owner a second "your business is approved".
 */
export function decisionRefusal(status: ListingStatus, decision: BusinessDecision): string | null {
  if (status === "DRAFT") {
    return "This application is still a draft, so there is nothing to review yet.";
  }
  if (status === "SUSPENDED") {
    return "This business is suspended. A review decision does not lift a suspension, so nothing was changed.";
  }
  if (status === "PUBLISHED" && decision !== "reject") {
    return "This business is already live. Refresh the queue to see the current state.";
  }
  if (status === "APPROVED" && decision === "approve") {
    return "This business is already approved, so there is nothing to approve again. Its property goes live from the publish control.";
  }
  return null;
}

/**
 * Which of the three hands the desk offers for a business in this state.
 *
 * The desk draws a live or a refused business as closed, as it always has;
 * the server still accepts a refusal of a live one. Everything else is the
 * decisions `decisionRefusal` would accept, so the card never offers a button
 * the server is going to refuse.
 */
export function decisionsOffered(status: ListingStatus): BusinessDecision[] {
  if (status === "PUBLISHED" || status === "REJECTED") return [];
  return (["approve", "more_info", "reject"] as const).filter(
    (decision) => decisionRefusal(status, decision) === null,
  );
}
