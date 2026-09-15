// `import type`, not a value import of a type. It matters: nothing here needs a
// runtime binding on the standards module, and written as a value import the
// specifier survives compilation and has to resolve, which breaks any loader
// that does not add the extension for you.
import type { ResponseGrade } from "./standards";

/**
 * The topics a person can pick on the contact form, in one place.
 *
 * They were about to exist twice: once as `<option>` labels on the public form
 * and once as whatever the admin support queue chose to render for the stored
 * code. Two lists means the queue eventually shows "safety" as a bare word to
 * the operator while the person who chose it read a whole sentence, and the two
 * stop describing the same thing.
 *
 * Client-safe: no server imports, so the form and the console both get real
 * values rather than a client reference.
 */

export const SUPPORT_TOPICS = [
  "safety",
  "booking",
  "payment",
  "listing",
  "verification",
  "other",
] as const;

export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

export const DEFAULT_SUPPORT_TOPIC: SupportTopic = "booking";

/**
 * Worded as the thing that happened, not as a category name. Safety is first
 * because somebody being asked for money outside the platform is the report
 * this queue exists for.
 */
export const SUPPORT_TOPIC_LABEL: Record<SupportTopic, string> = {
  safety: "Someone asked me to pay outside Vallo",
  booking: "A booking",
  payment: "A payment or refund",
  listing: "Listing a property",
  verification: "Verification",
  other: "Something else",
};

/** The stored code back to its sentence, or the raw value if it predates this. */
export function supportTopicLabel(topic: string | null): string | null {
  if (!topic) return null;
  return SUPPORT_TOPIC_LABEL[topic as SupportTopic] ?? topic;
}

/**
 * Which response commitment a ticket is under.
 *
 * Choosing the safety topic has to change how fast a person sees the ticket, or
 * the wording on the form is decoration. Four hours is the same figure
 * /standards publishes, read from the same module.
 */
export function gradeForTopic(topic: string | null): ResponseGrade {
  if (topic === "safety") return "urgent";
  if (topic === "verification") return "routine";
  return "standard";
}
