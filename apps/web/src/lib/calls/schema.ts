import { z } from "zod";
import { REVIEW_CASE_KINDS } from "./types";

/**
 * Call inputs, validated on the server before any database work. Client-safe.
 *
 * A client sends ids and choices, never a state, a duration, an identity, a
 * room or a provider payload: those are the server's to decide.
 */

const uuid = (what: string) => z.uuid(`This ${what} could not be identified.`);

export const callIdSchema = z.object({ callId: uuid("call") });

export const startCallSchema = z.object({
  conversationId: uuid("conversation"),
  kind: z.enum(["AUDIO", "VIDEO"], "Choose a voice or a video call."),
  /** A UUID minted on tap, so a double tap or a retried request starts one call. */
  tapKey: z.uuid().optional(),
});

export const callHistorySchema = z.object({
  conversationId: uuid("conversation"),
  limit: z.number().int().min(1).max(200).optional(),
});

/** ISO 8601 with an offset or Z; the server checks it is in a sensible window. */
const isoTime = z.iso.datetime({ offset: true, message: "Choose a valid date and time." });

export const requestReviewCallSchema = z.object({
  caseKind: z.enum(REVIEW_CASE_KINDS, "Choose the kind of case."),
  caseId: uuid("case"),
  purpose: z
    .string()
    .trim()
    .min(10, "Write the reason for the call, at least 10 characters. The person will see it.")
    .max(500, "Keep the reason under 500 characters."),
  kind: z.enum(["AUDIO", "VIDEO"]).default("VIDEO"),
  scheduledFor: isoTime.optional(),
});

export const respondReviewCallSchema = z
  .object({
    reviewId: uuid("review call"),
    response: z.enum(["ACCEPT", "DECLINE", "PROPOSE"]),
    proposedFor: isoTime.optional(),
  })
  .refine((v) => v.response !== "PROPOSE" || !!v.proposedFor, {
    message: "Choose the time that suits you.",
    path: ["proposedFor"],
  });

export const rescheduleReviewCallSchema = z.object({
  reviewId: uuid("review call"),
  scheduledFor: isoTime,
  reason: z.string().trim().min(3, "Write a short reason.").max(500),
});

export const reviewIdSchema = z.object({ reviewId: uuid("review call") });

export const addReviewEntrySchema = z
  .object({
    reviewId: uuid("review call"),
    kind: z.enum(["NOTE", "EVIDENCE", "CORRECTION"]),
    body: z.string().trim().min(1, "Write the note.").max(4000, "Keep a note under 4,000 characters."),
    /** `kyc_document:<uuid>`, `listing:<uuid>`, ...: a reference to an existing record, never a file. */
    evidenceRef: z
      .string()
      .regex(/^[a-z_]{2,40}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, "Use a record reference like listing:<id>.")
      .optional(),
    correctsId: z.uuid().optional(),
  })
  .refine((v) => v.kind !== "EVIDENCE" || !!v.evidenceRef, {
    message: "Evidence needs a record reference.",
    path: ["evidenceRef"],
  })
  .refine((v) => v.kind !== "CORRECTION" || !!v.correctsId, {
    message: "Say which note this corrects.",
    path: ["correctsId"],
  });

export const completeReviewCallSchema = z
  .object({
    reviewId: uuid("review call"),
    outcome: z.enum(["REVIEW_COMPLETED", "MORE_INFORMATION_REQUIRED", "FOLLOW_UP_REQUIRED", "ESCALATED", "NO_SHOW"]),
    summary: z.string().trim().min(3, "Write a short summary.").max(4000),
    followUpDueAt: isoTime.optional(),
  })
  .refine((v) => v.outcome !== "FOLLOW_UP_REQUIRED" || !!v.followUpDueAt, {
    message: "A follow-up needs a due date.",
    path: ["followUpDueAt"],
  });

export const cancelReviewCallSchema = z.object({
  reviewId: uuid("review call"),
  reason: z.string().trim().min(3, "Write a short reason.").max(500),
});
