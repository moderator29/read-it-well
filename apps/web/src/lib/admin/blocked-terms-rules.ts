/**
 * The shapes `public.staff_blocked_term_put` accepts, checked before the call
 * so staff read a sentence rather than a constraint name. The database is the
 * authority (migration 20261006024044); if the two disagree, this file is the
 * bug.
 */
import { z } from "zod";

export const BLOCKED_TERM_CATEGORIES = [
  "fraud.advance-fee",
  "fraud.off-platform-payment",
  "fraud.title-documents",
  "fraud.urgency-isolation",
  "abuse.racial-ethnic",
  "abuse.ethnic-nigeria",
  "abuse.sexual-content",
  "abuse.sexual-solicitation",
  "abuse.identity-slur",
  "abuse.religious-hatred",
  "abuse.violence-threat",
  "abuse.child-safety",
] as const;
export type BlockedTermCategory = (typeof BLOCKED_TERM_CATEGORIES)[number];

/** hold: written, hidden until a person reads it. flag: written, desk told. refuse: not written. */
export const BLOCKED_TERM_ACTIONS = ["hold", "flag", "refuse"] as const;
export type BlockedTermAction = (typeof BLOCKED_TERM_ACTIONS)[number];

export const BLOCKED_TERM_SEVERITIES = ["low", "medium", "high"] as const;

/** The scanner reduces text to [a-z0-9] words and single spaces; any other term can never match. */
export function normaliseTerm(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}
const TERM_SHAPE = /^[a-z0-9]+( [a-z0-9]+)*$/;

const reason = (what: string) =>
  z.string().trim().min(12, `${what} needs at least 12 characters, so the next person knows why.`).max(400);

export const putTermSchema = z
  .object({
    term: z
      .string()
      .transform(normaliseTerm)
      .refine((t) => t.length >= 2 && t.length <= 100, "A term is 2 to 100 characters.")
      .refine((t) => TERM_SHAPE.test(t), "Use letters and digits only, words separated by single spaces."),
    category: z.enum(BLOCKED_TERM_CATEGORIES),
    action: z.enum(BLOCKED_TERM_ACTIONS),
    severity: z.enum(BLOCKED_TERM_SEVERITIES),
    reason: reason("The reason"),
    refusalReason: z.string().trim().max(400).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action !== "refuse") return;
    if (!value.category.startsWith("abuse.")) {
      ctx.addIssue({ code: "custom", path: ["action"], message: "Only abuse terms can refuse a post outright. Scam wording is held or flagged so the desk sees it." });
    }
    if ((value.refusalReason ?? "").length < 12) {
      ctx.addIssue({ code: "custom", path: ["refusalReason"], message: "Refusing outright needs a written reason of at least 12 characters." });
    }
  });

export const retireTermSchema = z.object({
  term: z.string().transform(normaliseTerm).refine((t) => t.length >= 2, "Name the term to retire."),
  reason: reason("Retiring a term"),
});
