/**
 * The contact form's topics, in their own module for a reason.
 *
 * These used to be exported from `ContactForm.tsx`, which carries "use client".
 * A constant imported from a client module into a SERVER component is not a
 * value, it is a client reference: `CONTACT_TOPICS.find` typechecked, built
 * clean and threw `is not a function` on the first request to /contact. This
 * file has no directive, so both sides get the real array.
 *
 * The order is the order the select offers them, and safety is first
 * deliberately: the person who has just read the safety centre should meet the
 * words for what happened to them before anything else.
 */

export const CONTACT_TOPICS = [
  "safety",
  "booking",
  "payment",
  "listing",
  "verification",
  "other",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const DEFAULT_CONTACT_TOPIC: ContactTopic = "booking";
