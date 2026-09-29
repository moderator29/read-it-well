import type { DoneFlag, SuccessMomentId } from "./success-moments";

/**
 * WHICH SUCCESS MOMENT A PAGE MAY SHOW ON ARRIVAL, from the flag it was sent
 * with AND the record it read (docs/SUCCESS_MOMENTS.md). The flag only asks;
 * each answer below is conditioned on what the server says is true now, so a
 * hand-typed `?done=` on somebody else's record, or on one that has moved
 * on, shows nothing. Pure, so every branch is tested without a database.
 */

export type AgreementFacts = {
  role: "renter" | "owner" | string | null;
  status: string;
  youConfirmedCurrent: boolean;
  claims: readonly { mine: boolean; status: string }[];
};

export type Arrival = { moment: SuccessMomentId; seenOnce: boolean } | null;

export function agreementArrival(a: AgreementFacts, done: DoneFlag | null): Arrival {
  /* Staff read every agreement and are no party to it. */
  if (a.role === null) return null;
  if (done === "agreement-drawn" && a.status === "awaiting_parties") return { moment: "agreementDrawn", seenOnce: false };
  if (done === "agreement-confirmed" && a.status === "in_review") return { moment: "agreementInReview", seenOnce: false };
  if (done === "agreement-confirmed" && a.status === "awaiting_parties" && a.youConfirmedCurrent) {
    return { moment: "agreementConfirmed", seenOnce: false };
  }
  if (done === "claim-filed" && a.claims.some((c) => c.mine && c.status === "submitted")) {
    return { moment: "claimFiled", seenOnce: false };
  }
  /* Approval is written by the database into a notification; it opens from
     the status itself, once per device. */
  if (a.status === "approved") {
    return { moment: a.role === "renter" ? "agreementApprovedRenter" : "agreementApprovedOwner", seenOnce: true };
  }
  return null;
}

export type ListingFacts = { id: string; status: string };

export function listingArrival(
  mine: readonly ListingFacts[],
  done: DoneFlag | null,
  listingId: string | null | undefined,
): SuccessMomentId | null {
  const named = listingId ? mine.find((row) => row.id === listingId) : undefined;
  if (!named || !done) return null;
  if (done === "listing-submitted" && (named.status === "SUBMITTED" || named.status === "UNDER_REVIEW")) {
    return "listingSubmitted";
  }
  if (done === "listing-approved" && named.status === "APPROVED") return "listingApproved";
  if (done === "listing-live" && named.status === "PUBLISHED") return "listingLive";
  return null;
}
