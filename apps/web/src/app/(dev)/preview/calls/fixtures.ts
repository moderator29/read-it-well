import type { CallSnapshot, StaffReview, SubjectReview } from "@/lib/calls/types";

/**
 * Invented calls and reviews for the call screens' preview. Nothing here is
 * a real person, account or case. The clock is fixed so screenshots repeat.
 */
export const NOW = "2026-10-08T13:20:00.000Z";

export function snapshot(over: Partial<CallSnapshot> = {}): CallSnapshot {
  return {
    id: "8f0c3c4e-1d1b-4c5e-9a62-3e1f0b7a9c11",
    kind: "VIDEO",
    purpose: "CONVERSATION",
    state: "RINGING",
    version: 3,
    conversationId: "0e6d2a7c-5b44-4f7e-8f6c-2d9a1c3b5e77",
    reviewId: null,
    role: "CALLER",
    myState: "JOINED",
    isInitiator: true,
    otherName: "Adaeze Okafor",
    otherState: "RINGING",
    scheduledFor: null,
    createdAt: "2026-10-08T13:19:40.000Z",
    ringingAt: "2026-10-08T13:19:41.000Z",
    ringExpiresAt: "2026-10-08T13:20:26.000Z",
    acceptedAt: null,
    connectedAt: null,
    interruptedAt: null,
    endedAt: null,
    endReason: null,
    durationSeconds: null,
    serverNow: NOW,
    ...over,
  };
}

export const STAFF_REVIEW: StaffReview = {
  id: "5a2f9b7e-3c1d-4e8a-b6f2-9d0c1e2a3b44",
  caseKind: "agent_application",
  caseId: "7c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e55",
  subjectId: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d66",
  requestedBy: "3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e77",
  requiredScope: "kyc_review",
  purpose: "A short video call to confirm the details on your agent application and answer any questions about the next step.",
  kind: "VIDEO",
  status: "ACCEPTED",
  scheduledFor: "2026-10-09T09:30:00.000Z",
  proposedFor: null,
  respondBy: "2026-10-11T13:00:00.000Z",
  outcome: null,
  outcomeAt: null,
  followUpDueAt: null,
  createdAt: "2026-10-08T12:00:00.000Z",
};

export const STAFF_REVIEWS: StaffReview[] = [
  STAFF_REVIEW,
  {
    ...STAFF_REVIEW,
    id: "6b3f0c8f-4d2e-4f9b-a7a3-0e1d2f3a4b55",
    caseKind: "listing",
    purpose: "A walkthrough of the flat on video before the listing goes live.",
    status: "SCHEDULED",
    scheduledFor: "2026-10-10T14:00:00.000Z",
  },
  {
    ...STAFF_REVIEW,
    id: "7c4a1d9a-5e3f-4a0c-b8b4-1f2e3a4b5c66",
    caseKind: "support_ticket",
    purpose: "Talking through the refund request you raised on Monday.",
    status: "COMPLETED",
    scheduledFor: null,
    outcome: "MORE_INFORMATION_REQUIRED",
  },
];

export const ENTRIES = [
  {
    id: "e1",
    kind: "ATTENDANCE" as const,
    body: "Call 8f0c3c4e: ended. Subject joined: yes. Connected for 412 s.",
    evidenceRef: null,
    correctsId: null,
    createdAt: "2026-10-08T12:40:00.000Z",
    byMe: false,
  },
  {
    id: "e2",
    kind: "NOTE" as const,
    body: "Applicant showed the same ID document as uploaded. Asked about the firm's address.",
    evidenceRef: null,
    correctsId: null,
    createdAt: "2026-10-08T12:42:00.000Z",
    byMe: true,
  },
  {
    id: "e3",
    kind: "EVIDENCE" as const,
    body: "The uploaded ID document this call referred to.",
    evidenceRef: "kyc_document:1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
    correctsId: null,
    createdAt: "2026-10-08T12:43:00.000Z",
    byMe: true,
  },
];

export const AUDIT = [
  { id: "a1", action: "call_review.request", at: "2026-10-08T12:00:00.000Z", reason: "A short video call to confirm the details" },
  { id: "a2", action: "call_review.start", at: "2026-10-08T12:33:00.000Z", reason: null },
];

export const SUBJECT_REVIEW: SubjectReview = {
  id: "5a2f9b7e-3c1d-4e8a-b6f2-9d0c1e2a3b44",
  kind: "VIDEO",
  caseKind: "agent_application",
  caseWords: "Your agent application",
  purpose: "A short video call to confirm the details on your agent application and answer any questions about the next step.",
  status: "SCHEDULED",
  scheduledFor: "2026-10-09T09:30:00.000Z",
  proposedFor: null,
  respondBy: "2026-10-11T13:00:00.000Z",
  createdAt: "2026-10-08T12:00:00.000Z",
  requesterLabel: "Vallo review team",
  liveCallId: null,
};

/** Every preview state, in the order the index lists them (a plain module, so the server pages can read it). */
export const CALL_PREVIEW_STATES = [
  "outgoing-video",
  "outgoing-voice",
  "incoming-video",
  "incoming-voice",
  "incoming-review",
  "connecting",
  "active-video",
  "active-voice",
  "active-muted",
  "reconnecting",
  "remote-left",
  "confirm-end",
  "permission-ios",
  "permission-android-web",
  "permission-desktop",
  "ended",
  "ended-missed",
  "gone",
  "history",
  "admin-list",
  "admin-detail",
  "admin-outcome",
  "admin-request",
  "member-review",
  "member-review-live",
] as const;
export type CallPreviewState = (typeof CALL_PREVIEW_STATES)[number];

