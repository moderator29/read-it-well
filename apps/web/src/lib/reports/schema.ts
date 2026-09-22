import { z } from "zod";

/**
 * What a person can report, and what they can call it.
 *
 * Client-safe: imports nothing server-only, so the report sheet can render the
 * same categories the action validates against, and neither can drift.
 *
 * The list is deliberately short and deliberately concrete. A reporting form
 * with fifteen overlapping options gets "other" every time, and "other" is
 * exactly the free-text soup that made the reports queue unsortable in the
 * first place. Every code here is also a check constraint value on
 * public.reports, so an invented one is refused by the database as well.
 */

export const REPORT_CATEGORIES = [
  "off_platform_payment",
  "scam",
  "unsafe",
  "not_as_described",
  "unavailable",
  "offensive",
  "duplicate",
  "other",
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

/** The label and the line under it, in the order a person should read them. */
export const REPORT_CATEGORY_COPY: Record<ReportCategory, { label: string; hint: string }> = {
  off_platform_payment: {
    label: "Asked me to pay outside Vallo",
    hint: "An account number, a transfer, or anything that skips the platform.",
  },
  scam: {
    label: "This looks like a scam",
    hint: "The place, the price or the person does not add up.",
  },
  unsafe: {
    label: "Unsafe or threatening",
    hint: "Anything that made you feel unsafe, in the property or in the messages.",
  },
  not_as_described: {
    label: "Not as described",
    hint: "The photos, the size, the address or the amenities are wrong.",
  },
  unavailable: {
    label: "Not actually available",
    hint: "Already let, no longer on the market, or the dates are never free.",
  },
  offensive: {
    label: "Offensive content",
    hint: "Wording or images that should not be on the platform.",
  },
  duplicate: {
    label: "Duplicate listing",
    hint: "The same property is listed more than once.",
  },
  other: {
    label: "Something else",
    hint: "Tell us in your own words below.",
  },
};

/** The order the categories are offered in. Serious first, tidy last. */
export const REPORT_CATEGORY_ORDER: ReportCategory[] = [
  "off_platform_payment",
  "scam",
  "unsafe",
  "not_as_described",
  "unavailable",
  "offensive",
  "duplicate",
  "other",
];

/**
 * The kinds of thing this flow can report. Matches reports.target_type.
 *
 * `conversation` and `message` were added for the one place the product had
 * no report control at all: a one to one thread. Apple 1.2 and Play's user
 * generated content policy both want reporting ON DIRECT MESSAGING, which is
 * also the place on this platform where a person is most likely to need it.
 * `public.reports.target_type` is a plain `text` column with no check
 * constraint on the kind, so these two need no migration; the CATEGORY is the
 * constrained column and it is unchanged.
 */
export const REPORT_TARGETS = ["listing", "conversation", "message"] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

/**
 * What the report sheet calls the thing it is reporting.
 *
 * The sheet used to say "Report this listing" in three places with the word
 * baked in, which is how a generic sheet ends up lying about a conversation.
 */
export const REPORT_TARGET_NOUN: Record<ReportTarget, string> = {
  listing: "listing",
  conversation: "conversation",
  message: "message",
};

export const DETAILS_MAX = 1200;

export const reportInputSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string().trim().min(1, "This could not be identified.").max(200),
  category: z.enum(REPORT_CATEGORIES, { message: "Pick the closest reason." }),
  details: z
    .string()
    .trim()
    .max(DETAILS_MAX, `Keep it under ${DETAILS_MAX} characters.`)
    .optional(),
});

export type ReportInput = z.infer<typeof reportInputSchema>;
