import {
  REVIEW_CASE_KINDS,
  REVIEW_OUTCOMES,
  REVIEW_STATUSES,
  type ReviewCaseKind,
  type ReviewOutcome,
  type ReviewScope,
  type ReviewStatus,
  type StaffReview,
  type SubjectReview,
} from "./types";

/**
 * Review calls, as pure rules. Client-safe.
 *
 * The scope each case kind needs mirrors `private.call_review_scope` in the
 * VC1 migration (pinned by `reviews.test.ts`, which reads the migration).
 * Least privilege: a KYC reviewer cannot call about a listing, a listing
 * reviewer cannot call about an identity check, support calls only about a
 * support request. Admins and super admins hold every scope.
 */
export const REVIEW_SCOPE_BY_CASE: Readonly<Record<ReviewCaseKind, ReviewScope>> = {
  agent_application: "kyc_review",
  business_verification: "kyc_review",
  identity_verification: "kyc_review",
  listing: "listing_approval",
  support_ticket: "support",
};

/** Statuses after which nothing more happens to a review. */
export const CLOSED_REVIEW_STATUSES: ReadonlySet<ReviewStatus> = new Set<ReviewStatus>(["COMPLETED", "CANCELLED"]);

/** What a staff screen may offer for a review in this status. Mirrors the database's own checks. */
export function reviewActions(status: ReviewStatus, scheduledFor: string | null, now: Date) {
  const closed = CLOSED_REVIEW_STATUSES.has(status);
  const t = now.getTime();
  const at = scheduledFor ? Date.parse(scheduledFor) : Number.NaN;
  const inWindow = Number.isFinite(at) && t >= at - 600_000 && t <= at + 1_800_000;
  return {
    canStart: status === "ACCEPTED" || (status === "SCHEDULED" && inWindow),
    canReschedule: !closed && status !== "IN_CALL",
    canComplete: !closed,
    canCancel: !closed,
    canAddEntry: true,
  };
}

/** Words the subject reads for each status. */
export function subjectStatusWords(status: ReviewStatus): string {
  switch (status) {
    case "REQUESTED":
      return "Waiting for your answer";
    case "SCHEDULED":
      return "Scheduled";
    case "RESCHEDULE_REQUESTED":
      return "You asked for another time";
    case "ACCEPTED":
      return "Accepted. Vallo will call you";
    case "DECLINED":
      return "You declined";
    case "IN_CALL":
      return "On a call now";
    case "COMPLETED":
      return "Complete";
    case "CANCELLED":
      return "Cancelled";
    case "EXPIRED":
      return "Expired";
  }
}

type Row = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const caseKind = (v: unknown): ReviewCaseKind | null =>
  typeof v === "string" && (REVIEW_CASE_KINDS as readonly string[]).includes(v) ? (v as ReviewCaseKind) : null;
const status = (v: unknown): ReviewStatus | null =>
  typeof v === "string" && (REVIEW_STATUSES as readonly string[]).includes(v) ? (v as ReviewStatus) : null;
const outcome = (v: unknown): ReviewOutcome | null =>
  typeof v === "string" && (REVIEW_OUTCOMES as readonly string[]).includes(v) ? (v as ReviewOutcome) : null;

export function subjectReviewFromRow(raw: unknown): SubjectReview | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Row;
  const id = str(r.id);
  const kind = caseKind(r.case_kind);
  const st = status(r.status);
  if (!id || !kind || !st) return null;
  return {
    id,
    kind: r.kind === "AUDIO" ? "AUDIO" : "VIDEO",
    caseKind: kind,
    caseWords: str(r.case_words) ?? "",
    purpose: str(r.purpose) ?? "",
    status: st,
    scheduledFor: str(r.scheduled_for),
    proposedFor: str(r.proposed_for),
    respondBy: str(r.respond_by) ?? "",
    createdAt: str(r.created_at) ?? "",
    requesterLabel: str(r.requester_label) ?? "Vallo review team",
    liveCallId: str(r.live_call_id),
  };
}

export function staffReviewFromRow(raw: unknown): StaffReview | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Row;
  const id = str(r.id);
  const kind = caseKind(r.case_kind);
  const st = status(r.status);
  const scope = str(r.required_scope);
  if (!id || !kind || !st || (scope !== "kyc_review" && scope !== "listing_approval" && scope !== "support")) return null;
  return {
    id,
    caseKind: kind,
    caseId: str(r.case_id) ?? "",
    subjectId: str(r.subject_id),
    requestedBy: str(r.requested_by),
    requiredScope: scope,
    purpose: str(r.purpose) ?? "",
    kind: r.kind === "AUDIO" ? "AUDIO" : "VIDEO",
    status: st,
    scheduledFor: str(r.scheduled_for),
    proposedFor: str(r.proposed_for),
    respondBy: str(r.respond_by) ?? "",
    outcome: outcome(r.outcome),
    outcomeAt: str(r.outcome_at),
    followUpDueAt: str(r.follow_up_due_at),
    createdAt: str(r.created_at) ?? "",
  };
}
