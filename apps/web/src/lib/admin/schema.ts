import { z } from "zod";

/**
 * Input shapes for every admin mutation.
 *
 * Kept out of the actions file because a "use server" module may only export
 * async functions: schemas, copy and constants live here so the action file
 * stays a list of callable endpoints and nothing else.
 */

const uuid = z.string().uuid("That record reference does not look right.");

const notes = z
  .string()
  .trim()
  .max(2000, "Please keep review notes under 2000 characters.")
  .optional();

/** Clearing a flag closes it. Escalating also raises a risk alert. */
export const flagResolutions = ["cleared", "escalated"] as const;
export type FlagResolution = (typeof flagResolutions)[number];

export const reviewMessageFlagSchema = z.object({
  flagId: uuid,
  resolution: z.enum(flagResolutions),
});

export const resolveRiskAlertSchema = z.object({
  alertId: uuid,
  notes,
});

export const reportDecisions = ["reviewing", "resolved", "dismissed"] as const;
export type ReportDecision = (typeof reportDecisions)[number];

export const resolveReportSchema = z.object({
  reportId: uuid,
  decision: z.enum(reportDecisions),
  notes,
  /* V-89: one line the reporter will see on /settings/help. Optional. */
  reporterNote: z.string().trim().max(200).optional(),
});

export const applicationDecisions = ["approve", "reject", "request_changes"] as const;
export type ApplicationDecision = (typeof applicationDecisions)[number];

export const reviewAgentApplicationSchema = z.object({
  applicationId: uuid,
  decision: z.enum(applicationDecisions),
  notes,
});

export const listingDecisions = ["approve", "publish", "reject", "request_changes"] as const;
export type ListingDecision = (typeof listingDecisions)[number];

export const reviewListingSchema = z.object({
  listingId: uuid,
  decision: z.enum(listingDecisions),
  notes,
});

export const replySupportTicketSchema = z.object({
  ticketId: uuid,
  body: z
    .string()
    .trim()
    .min(2, "Write a reply before sending it.")
    .max(4000, "Please keep the reply under 4000 characters."),
});

export const ticketStatuses = ["open", "pending", "resolved", "closed"] as const;
export type TicketStatus = (typeof ticketStatuses)[number];

export const setTicketStatusSchema = z.object({
  ticketId: uuid,
  status: z.enum(ticketStatuses),
});

export const toggleFeatureFlagSchema = z.object({
  key: z.string().trim().min(1).max(64),
  enabled: z.boolean(),
});

/* ------------------------------------------------------------ B7 additions */

/**
 * What an operator may do to a restaurant reservation.
 *
 * `confirm` and `decline` are the host's two answers, taken on the host's
 * behalf when a request has sat unanswered. `cancel` is the admin's own: a
 * confirmed table called off by the platform, which is why it carries a
 * reason the guest reads word for word.
 */
export const reservationDecisions = ["confirm", "decline", "cancel"] as const;
export type ReservationDecision = (typeof reservationDecisions)[number];

export const decideReservationSchema = z.object({
  reservationId: uuid,
  decision: z.enum(reservationDecisions),
  /*
   * Required for the two that take a table away, optional for confirming.
   * Enforced again in the action, because a schema cannot see the decision
   * while it validates the reason.
   */
  reason: z
    .string()
    .trim()
    .max(500, "Keep the reason under 500 characters.")
    .optional()
    .or(z.literal("")),
});

/**
 * Taking a saved card or a bank account off somebody's list for them.
 *
 * The reason is the whole record: the row is soft-deleted exactly as it would
 * be if the person had done it themselves, so the audit line is the only
 * thing that says a member of staff did it and why.
 */
export const removeSavedMethodSchema = z.object({
  id: uuid,
  reason: z
    .string()
    .trim()
    .min(10, "Say who asked and how, in a sentence. This is the record.")
    .max(500, "Keep the reason under 500 characters."),
});
