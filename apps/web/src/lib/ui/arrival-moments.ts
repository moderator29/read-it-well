import type { DoneFlag, SuccessMomentId } from "./success-moments";
import { APPROVAL_NEWS_DAYS } from "./recent-approval";

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

/* ------------------------------------------ approvals decided elsewhere */


/** A decision time inside the news window (lib/ui/recent-approval.ts). */
function decidedRecently(at: string | null | undefined, now: number): boolean {
  if (!at) return false;
  const t = Date.parse(at);
  return Number.isFinite(t) && t <= now + 60_000 && t >= now - APPROVAL_NEWS_DAYS * 24 * 60 * 60 * 1000;
}

export type ApprovalArrival = { moment: SuccessMomentId; seenKey: string; values?: Record<string, string> } | null;

/**
 * The applicant's side of an agent application approved in the staff
 * console: shown on `/profile/application`, where the decision notice lands,
 * once per device, and only while the decision is news.
 */
export function applicationArrival(
  app: { reference: string; status: string; reviewedAt: string | null },
  now: number,
): ApprovalArrival {
  if (app.status !== "APPROVED" || !decidedRecently(app.reviewedAt, now)) return null;
  return { moment: "agentApproved", seenKey: `agent-approved:${app.reference}` };
}

/**
 * A host's business approved or published in the staff console: shown on
 * `/host`, where the decision notice lands, for the most recent one only.
 * Published and approved are separate moments with separate keys, so a
 * business approved on Monday and published on Wednesday is news twice.
 */
export function businessArrival(
  businesses: readonly { id: string; name: string; status: string; reviewedAt: string | null }[],
  now: number,
): ApprovalArrival {
  const recent = businesses
    .filter((b) => (b.status === "APPROVED" || b.status === "PUBLISHED") && decidedRecently(b.reviewedAt, now))
    .sort((a, b) => Date.parse(b.reviewedAt ?? "") - Date.parse(a.reviewedAt ?? ""))[0];
  if (!recent) return null;
  const live = recent.status === "PUBLISHED";
  return {
    moment: live ? "hostLive" : "hostApproved",
    seenKey: `${live ? "host-live" : "host-approved"}:${recent.id}`,
    values: { name: recent.name },
  };
}
