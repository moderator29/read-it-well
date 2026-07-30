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
